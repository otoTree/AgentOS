FROM node:20-bookworm

# 安装 pnpm
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Install Python, system dependencies for headed environment (Xvfb, etc.), and build tools
# Switch to Aliyun mirror for better connectivity in China and fix 502 errors
# Debian Bookworm uses DEB822 format in /etc/apt/sources.list.d/debian.sources by default
RUN sed -i 's/deb.debian.org/mirrors.ustc.edu.cn/g' /etc/apt/sources.list.d/debian.sources && \
    sed -i 's/security.debian.org/mirrors.ustc.edu.cn/g' /etc/apt/sources.list.d/debian.sources && \
    apt-get update && apt-get install -y --fix-missing \
    python3 \
    python3-pip \
    python3-venv \
    python3-dev \
    pkg-config \
    build-essential \
    libseccomp-dev \
    bubblewrap \
    socat \
    ripgrep \
    xvfb \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpangocairo-1.0-0 \
    libpango-1.0-0 \
    libcairo2 \
    libx11-xcb1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node dependencies
RUN pnpm install && pnpm exec playwright install

# Copy the rest of the application
COPY . .

# Rebuild local sandbox-runtime and update node_modules to ensure we have the latest changes
RUN cd sandbox-runtime && \
    pnpm install && \
    pnpm run build && \
    cp -r dist/* ../node_modules/@anthropic-ai/sandbox-runtime/dist/

# Setup Python environment
# Create venv
RUN python3 -m venv python-venv

# Install dependencies from requirements.txt
COPY requirements.txt .
RUN ./python-venv/bin/pip install --upgrade pip -i https://mirrors.aliyun.com/pypi/simple/ && \
    ./python-venv/bin/pip install -r requirements.txt -i https://mirrors.aliyun.com/pypi/simple/ && \
    ./python-venv/bin/playwright install --with-deps

# Install the local wheel if it exists
# We assume the wheel file is in the root as seen in file list
RUN if [ -f agent_tool-0.1.0-py3-none-any.whl ]; then \
        ./python-venv/bin/pip install agent_tool-0.1.0-py3-none-any.whl; \
    fi

# Build the Node app
RUN pnpm run build

# Expose port
EXPOSE 8080

# Copy start script
COPY start.sh .
RUN chmod +x start.sh

# Start the application
CMD ["./start.sh"]
