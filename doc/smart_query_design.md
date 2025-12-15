# 智能问数功能设计文档

## 1. 查询入口
1.1 输入框支持自然语言与 DSL/SQL 双模式切换  
1.2 查询历史列表（分页、搜索、收藏、分享）  
1.3 查询模板保存与参数化执行  

## 2. NLQ 解析引擎
2.1 基于 LLM 的自然语言 → DSL 转换  
2.2 基于元数据的 Schema 嵌入 / 语义检索  
2.3 解析结果可视化与可编辑确认  

## 3. DSL 编译与路由
3.1 将统一 DSL 转译为：  
‑ PostgreSQL SQL  
‑ MySQL SQL  
‑ MongoDB Aggregation Pipeline  
‑ Neo4j Cypher  
3.2 根据 dataSourceId 动态选择方言  

## 4. 数据源接入层（Connector SDK）
4.1 通用接口：connect / testConnection / execute / close  
4.2 关系型 Connector：PostgreSQL、MySQL  
4.3 非关系型 Connector：MongoDB、Neo4j  
4.4 连接池、SSL/TLS、密钥或 IAM 鉴权支持  

## 5. 查询执行服务
5.1 同步执行 + 流式分页返回  
5.2 异步长查询队列（轮询 / WebSocket 通知）  
5.3 查询超时、并发限流、结果缓存  

## 6. 权限与安全
6.1 用户鉴权（JWT/OAuth2 接入）  
6.2 数据源级 & 表/列级授权配置  
6.3 敏感字段脱敏规则  
6.4 恶意 SQL 防护与语法白名单  

## 7. 审计与监控
7.1 查询日志：用户、SQL、耗时、行数  
7.2 Prometheus 指标：QPS、错误率、P95 耗时  
7.3 告警：超阈值通知（钉钉/Slack/邮件）  

## 8. 结果展示与导出
8.1 表格视图：排序、过滤、列显隐  
8.2 图表视图：柱状 / 折线 / 饼图自动推荐  
8.3 导出：CSV / Excel / JSON / API 链接  

## 9. 配置与元数据管理
9.1 数据源 CRUD API & UI  
9.2 Schema 同步与缓存刷新机制  
9.3 权限策略存储  

## 10. DevOps 与非功能
10.1 单元 / 集成测试覆盖 ≥ 80%  
10.2 Docker 镜像与 K8s 部署 Helm Chart  
10.3 配置中心 & Secret 管理（Vault/KMS）  
10.4 灰度 / 回滚 / 版本兼容策略  

