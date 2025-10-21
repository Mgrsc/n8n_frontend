FROM oven/bun:latest

WORKDIR /app

# Copy package files for dependency installation
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code and build configuration
COPY src/ ./src/
COPY index.html tsconfig.json vite.config.ts ./
COPY public/ ./public/

# Expose port
EXPOSE 80

# Set environment for Vite dev server
ENV HOST=0.0.0.0
ENV PORT=80

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

# Run in development mode (reads .env at runtime)
CMD ["bun", "run", "dev"]
