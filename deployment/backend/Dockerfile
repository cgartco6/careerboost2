# Backend Dockerfile
FROM node:18-alpine

# Install security updates and dependencies
RUN apk update && apk upgrade && \
    apk add --no-cache \
    curl \
    python3 \
    make \
    g++ \
    chromium \
    && rm -rf /var/cache/apk/*

# Set Puppeteer skip download (we use system Chromium)
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY yarn.lock ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Create necessary directories
RUN mkdir -p uploads logs

# Add security settings
RUN addgroup -g 1001 -S nodejs && \
    adduser -S careerboost -u 1001 && \
    chown -R careerboost:nodejs /app

USER careerboost

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

# Start the application
CMD ["node", "src/server.js"]
