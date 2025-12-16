# Use Node.js 18 Alpine as base image
FROM node:18-alpine

# Install pnpm globally
RUN npm install -g pnpm@latest

# Verify pnpm installation
RUN pnpm --version

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN pnpm build

# Expose port 3000
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production

# Start the application
CMD ["pnpm", "start"]