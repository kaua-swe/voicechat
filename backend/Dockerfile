FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/tsconfig.json backend/tsconfig.json
COPY backend/src backend/src
RUN corepack enable pnpm && pnpm install --frozen-lockfile

FROM deps AS build
RUN corepack pnpm backend:build

FROM node:24-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/tsconfig.json backend/tsconfig.json
COPY --from=build /app/backend/dist backend/dist
RUN corepack enable pnpm \
  && pnpm install --prod --frozen-lockfile \
  && addgroup -S voicechat \
  && adduser -S -G voicechat voicechat
USER voicechat
EXPOSE 4378
CMD ["node", "backend/dist/server.js"]
