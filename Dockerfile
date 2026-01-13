# HeyDev Server Dockerfile
# Multi-stage build for smaller production image

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
COPY server/package.json ./server/

# Install all dependencies (including devDependencies for build)
RUN npm ci --workspace=server

# Copy source files
COPY server/ ./server/
COPY tsconfig.json ./

# Build the server
RUN npm run build --workspace=server

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Install better-sqlite3 build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package.json package-lock.json ./
COPY server/package.json ./server/

# Install production dependencies only
RUN npm ci --workspace=server --omit=dev

# Copy built files from builder stage
COPY --from=builder /app/server/dist ./server/dist

# Copy drizzle migrations
COPY server/drizzle ./server/drizzle
COPY server/drizzle.config.js ./server/drizzle.config.js

# Create directories for runtime data
RUN mkdir -p /app/server/data /app/uploads

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose the server port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Run the server
WORKDIR /app/server
CMD ["node", "dist/index.js"]
