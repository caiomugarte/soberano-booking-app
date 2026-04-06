FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/mcp/package.json ./packages/mcp/

RUN npm ci --include=dev

COPY packages/mcp ./packages/mcp

RUN npm -w @soberano/mcp run build

EXPOSE 3002

CMD ["node", "packages/mcp/dist/server.js"]
