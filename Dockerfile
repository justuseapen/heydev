# HeyDev Full Stack Dockerfile
# Multi-stage build for server + dashboard

# Build stage - Server
FROM node:20-alpine AS server-builder

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

# Build stage - Dashboard
FROM node:20-alpine AS dashboard-builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
COPY dashboard/package.json ./dashboard/

# Install dashboard dependencies
RUN npm ci --workspace=dashboard

# Copy dashboard source
COPY dashboard/ ./dashboard/
COPY tsconfig.json ./

# Build dashboard with production API URL
ARG VITE_API_URL=
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build --workspace=dashboard

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

# Copy built server from builder stage
COPY --from=server-builder /app/server/dist ./server/dist

# Copy built dashboard from builder stage
COPY --from=dashboard-builder /app/dashboard/dist ./dashboard/dist

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
