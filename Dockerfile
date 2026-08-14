# ==============================================================================
# Milestone Attendance System - Production Cloud Run Multi-Stage Dockerfile
# ==============================================================================

# Stage 1: Build Frontend and Backend Bundles
FROM node:20-slim AS builder

WORKDIR /app

# Install build dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source files
COPY . .

# Compile React SPA & Node.js CommonJS Server bundle into dist/
RUN npm run build

# Stage 2: Minimal Production Runtime
FROM node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install production-only dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy built distribution artifacts from builder
COPY --from=builder /app/dist ./dist

# Run as non-privileged system user for container security
USER node

# Expose default container port
EXPOSE 3000

# Launch production server
CMD ["node", "dist/server.cjs"]
