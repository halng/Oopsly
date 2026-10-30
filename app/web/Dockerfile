# Stage 1: install, build. NEXT_PUBLIC_* values are inlined at build time.
FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /src
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_AUTH_URL
ARG NEXT_PUBLIC_GAME_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_AUTH_URL=$NEXT_PUBLIC_AUTH_URL \
    NEXT_PUBLIC_GAME_API_URL=$NEXT_PUBLIC_GAME_API_URL \
    NEXT_OUTPUT=standalone \
    NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

# Stage 2: the standalone server only (no node_modules install, no pnpm).
FROM node:22-alpine
LABEL org.opencontainers.image.description="Oopsly web frontend"
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /src/.next/standalone ./
COPY --from=build --chown=app:app /src/.next/static ./.next/static
COPY --from=build --chown=app:app /src/public ./public
USER app
EXPOSE 3000
CMD ["node", "server.js"]
