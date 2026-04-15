FROM oven/bun:1 AS base
WORKDIR /app

COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile || bun install

COPY src/ src/
COPY tsconfig.json ./

ENV NODE_ENV=production
EXPOSE 3001

CMD ["bun", "run", "src/server/index.ts"]
