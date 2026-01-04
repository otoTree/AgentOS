# 使用 Node.js 镜像作为基础镜像
FROM node:20-alpine AS base

# 安装 pnpm 并设置基础环境
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories && \
    apk add --no-cache libc6-compat && \
    corepack enable

# 第一阶段：安装依赖
FROM base AS deps
WORKDIR /app

# 设置 npm 镜像以加速依赖安装
RUN pnpm config set registry https://registry.npmmirror.com/

# 复制所有项目的 package.json 和根目录的 pnpm-lock.yaml 以利用构建缓存
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./
COPY packages/global/package.json ./packages/global/package.json
COPY packages/service/package.json ./packages/service/package.json
COPY packages/web/package.json ./packages/web/package.json
COPY packages/coder/package.json ./packages/coder/package.json
COPY packages/superagent/package.json ./packages/superagent/package.json
COPY projects/app/package.json ./projects/app/package.json
COPY projects/admin/package.json ./projects/admin/package.json
COPY projects/sandbox/package.json ./projects/sandbox/package.json
COPY projects/sandbox/sandbox-runtime/package.json ./projects/sandbox/sandbox-runtime/package.json
COPY document/package.json ./document/package.json
COPY plugins/default/package.json ./plugins/default/package.json

# 安装依赖
RUN pnpm install --frozen-lockfile

# 第二阶段：构建应用
FROM base AS builder
WORKDIR /app

# 从 deps 阶段复制所有内容，包括所有 node_modules 和 package.json
COPY --from=deps /app ./
# 复制源代码
COPY . .

# 设置构建环境变量
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 构建管理后台应用
RUN cd projects/admin && pnpm run build && \
    mkdir -p public

# 第三阶段：运行阶段
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# 增加 Node.js 内存限制并开启源码映射
ENV NODE_OPTIONS="--max-old-space-size=4096 --enable-source-maps"

# 安全性：使用非 root 用户
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# 复制 standalone 构建产物
COPY --from=builder --chown=nextjs:nodejs /app/projects/admin/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/projects/admin/.next/static ./projects/admin/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/projects/admin/public ./projects/admin/public

# 设置用户
USER nextjs

# 暴露端口
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# 启动应用
CMD ["node", "projects/admin/server.js"]
