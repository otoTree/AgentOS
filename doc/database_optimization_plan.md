# 数据库性能优化方案

本文档旨在针对 AgentOS 项目中数据库操作频繁、潜在的性能瓶颈问题，提供一套全面的优化方案。方案涵盖性能分析、缓存策略、代码优化、架构调整及实施计划五个方面。

## 1. 性能分析阶段

在进行具体的优化操作前，首先需要对系统的性能现状进行全面的摸底和分析，找出真正的瓶颈所在。

### 1.1 数据库操作监控与日志记录

*   **开启慢查询日志 (Slow Query Log)**: 配置 PostgreSQL 记录执行时间超过阈值（如 200ms）的 SQL 语句。
    *   **实施**: 修改 `postgresql.conf`，设置 `log_min_duration_statement = 200`。
*   **Prisma Query Metrics**: 利用 Prisma 提供的中间件或日志功能，记录每个查询的耗时。
    *   **实施**: 在 `src/lib/prisma.ts` 中配置 Prisma Client 的 log 级别为 `['query', 'info', 'warn', 'error']`，并在开发/测试环境开启事件监听，统计查询耗时。
*   **应用层监控 (APM)**: 集成 OpenTelemetry 或类似工具，追踪 HTTP 请求的全链路耗时，定位数据库操作在整个请求中的占比。

### 1.2 识别高消耗 SQL (使用 EXPLAIN)

*   **定期分析**: 收集慢查询日志中的 SQL，使用 `EXPLAIN (ANALYZE, BUFFERS)` 命令分析其执行计划。
*   **关注点**:
    *   全表扫描 (Seq Scan): 是否缺少索引？
    *   复杂的 Join 操作: 关联字段是否有索引？
    *   排序 (Sort): 是否利用了索引排序？
    *   高频小查询: 是否存在 N+1 问题？

### 1.3 业务场景分析

*   **实时查询**:
    *   用户鉴权 (`auth()`, `User`, `Session`)
    *   对话交互 (`AgentConversation`, `AgentMessage`) - 用户期待低延迟。
*   **可延迟/合并查询**:
    *   日志记录/审计 (`AuditStats`) - 可以在后台异步处理。
    *   统计计数 (`callCount` 更新) - 可以先写入缓存，定期批量回写数据库。
    *   文件/知识库索引 - 可以异步处理。

---

## 2. 缓存策略设计

通过引入缓存层，减少对数据库的直接读取，是提升读取性能最有效的手段。

### 2.1 缓存方案选择

*   **推荐方案**: **Redis**
    *   **理由**: 性能极高，支持丰富的数据结构（Hash, List, Set, Sorted Set），适合存储 Session、计数器、排行榜及对象缓存。支持持久化，生态成熟。
    *   **备选**: 内存缓存 (如 `node-cache`) - 仅适用于单机部署且数据量小的场景，不推荐用于分布式或 Serverless 环境 (Next.js)。

### 2.2 缓存内容与策略

| 业务数据 | 缓存结构 | 过期策略 (TTL) | 更新机制 | 备注 |
| :--- | :--- | :--- | :--- | :--- |
| **用户 Session/Profile** | String / Hash | 15分钟 - 1小时 | **Cache-Aside**: 读时查缓存，不命中查库并回填；写时更新库并删除/更新缓存。 | 鉴权高频调用 |
| **项目详情 (Project)** | Hash / String | 5 - 10分钟 | **Cache-Aside**: 修改项目信息时失效缓存。 | 包含 Tools/Deployments 等复杂关联 |
| **工具/Deployment代码** | String | 1小时+ | **Immutable**: 代码快照一旦部署通常不变，可设置较长 TTL。 | 代码体积大，缓存收益高 |
| **调用次数 (CallCount)** | String / Counter | 永不过期 (持久化) | **Write-Behind**: 每次调用只增 Redis，定期 (如每分钟) 异步同步回 DB。 | 避免高频 DB 写入锁竞争 |
| **热门市场项目** | Sorted Set | 10分钟 | **定时刷新**: 后台任务每隔一段时间重新计算排行榜。 | 复杂聚合查询 |

### 2.3 缓存更新机制

*   **Cache-Aside (旁路缓存)**: 最常用的模式。
    *   **读**: Cache Hit -> Return; Cache Miss -> DB -> Set Cache -> Return.
    *   **写**: Update DB -> Delete Cache. (先更库再删缓存，防止并发脏读)。
*   **失效处理**: 
    *   设置合理的 TTL (Time To Live) 作为兜底。
    *   使用 key 的命名空间管理 (如 `user:123:profile`, `project:456:detail`)，便于精确失效。

---

## 3. 代码优化方案

针对 Prisma 和业务逻辑中的常见性能陷阱进行重构。

### 3.1 解决 N+1 查询问题

*   **现状**: 在循环中执行数据库查询。例如，获取项目列表后，遍历每个项目去查询其部署状态或统计信息。
*   **优化**: 使用 Prisma 的 `include` 或 `select` 语法进行**预加载 (Eager Loading)**，或者先收集 ID 列表，使用 `where: { id: { in: ids } }` 进行一次性批量查询，然后在内存中组装。

**示例 (优化前):**
```typescript
const projects = await prisma.project.findMany();
for (const p of projects) {
  p.stats = await prisma.deployment.count({ where: { projectId: p.id } }); // N+1
}
```

**示例 (优化后):**
```typescript
const projects = await prisma.project.findMany({
  include: {
    _count: {
      select: { deployments: true }
    }
  }
});
```

### 3.2 批量操作替代单条循环

*   **场景**: 批量导入数据、批量更新状态。
*   **优化**: 使用 `createMany`, `updateMany`, `deleteMany`。
    *   *注意*: `createMany` 在某些数据库 (如 SQLite) 或 Prisma 版本有限制，但在 PostgreSQL 中支持良好。
    *   对于复杂的批量更新 (不同记录更新不同值)，可使用 `Promise.all` 并发执行 (控制并发度) 或原生 SQL。

### 3.3 连接池优化

*   **问题**: Serverless 环境下 (Next.js API Routes) 频繁建立/断开数据库连接开销大，且容易耗尽连接数。
*   **优化**:
    *   使用 **Prisma Data Proxy** 或 **PgBouncer**。
    *   在 `src/lib/prisma.ts` 中确保 PrismaClient 是单例模式 (已实现)。
    *   调整数据库连接池大小 (`connection_limit`)，根据 CPU 核心数和负载进行微调。

---

## 4. 架构调整建议

随着数据量和并发量的增长，单体数据库架构可能成为瓶颈。

### 4.1 读写分离 (Read/Write Splitting)

*   **适用场景**: 读多写少 (Read-Heavy) 的业务，如 Marketplace 展示、文档浏览。
*   **方案**:
    *   主库 (Master): 处理所有写操作 (INSERT, UPDATE, DELETE) 和实时性要求高的读。
    *   从库 (Replica): 处理普通读操作。
    *   **Prisma 支持**: 配置 Prisma Client 使用 Read Replicas 扩展。
    ```typescript
    datasource db {
      provider = "postgresql"
      url      = env("DATABASE_URL") // Write
    }
    // 在 Client 初始化时配置扩展
    ```

### 4.2 异步处理 (Asynchronous Processing)

*   **场景**: 发送邮件、生成审计日志、复杂的数据分析、SOP 执行中的非阻塞步骤。
*   **方案**: 引入消息队列 (如 RabbitMQ, Redis Streams, 或云厂商的 SQS)。
    *   前端/API 只负责将任务推入队列，立即返回响应。
    *   Worker 服务后台消费队列，处理耗时任务。
    *   **针对本项目**: `AuditStats` 的计算、`CallCount` 的 DB 回写非常适合移入异步 Worker。

### 4.3 分库分表 (Sharding) - *长期规划*

*   **评估**: 目前阶段数据量尚未达到瓶颈，暂不建议立即实施，因为会极大地增加开发和运维复杂度。
*   **未来方向**: 当单表 (`AgentMessage`, `SopExecution`) 达到千万级时，可考虑按 `userId` 或 `projectId` 进行水平分表 (Sharding) 或归档历史数据。

---

## 5. 实施计划

### Phase 1: 基础监控与速赢优化 (Priority: High, 1-2周)
*   **目标**: 快速识别瓶颈，解决最明显的性能问题。
*   **任务**:
    1.  配置 PostgreSQL 慢查询日志。
    2.  集成 Prisma Metrics 或简单日志统计。
    3.  **代码重构**: 重点审查 `actions.ts` 和 `api` 目录，修复所有明显的 N+1 查询 (特别是 Marketplace 和 Dashboard 列表页)。
    4.  为高频查询字段 (如 `userId`, `projectId`, `toolId`, `status`) 检查并补全数据库索引。

### Phase 2: 引入缓存层 (Priority: Medium, 2-3周)
*   **目标**: 降低数据库读压力，提升高频读取接口响应速度。
*   **任务**:
    1.  部署 Redis 实例。
    2.  封装缓存服务层 (`CacheService`)。
    3.  在 `User` 鉴权、`Project` 详情页、`Marketplace` 列表页接入缓存 (Cache-Aside)。
    4.  实现 `CallCount` 的 Write-Behind 策略 (Redis 计数 -> 定时刷库)。

### Phase 3: 架构升级 (Priority: Low, 长期)
*   **目标**: 提升系统吞吐量和可扩展性。
*   **任务**:
    1.  引入消息队列处理异步任务 (审计、邮件)。
    2.  评估是否需要读写分离 (视数据库负载而定)。

### 预期效果
*   **响应时间**: 核心接口 (列表、详情) 响应时间下降 50% - 80% (缓存命中时)。
*   **数据库负载**: CPU 和 IOPS 显著降低，连接数保持稳定。
*   **并发能力**: 系统能支撑的并发用户数提升 2-3 倍。

### 回滚方案
*   **代码层面**: 所有优化均通过 Git 版本控制，可随时 revert。
*   **数据库层面**: Schema 变更需通过 Migration 脚本，并准备好 Down Migration (回滚脚本)。
*   **缓存开关**: 在代码中设置 Feature Flag (环境变量)，一键关闭缓存读取，降级回查数据库。
