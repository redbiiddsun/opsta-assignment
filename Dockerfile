# syntax=docker/dockerfile:1

# ---- deps: all dependencies, cached on the lockfile ----
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json prisma.config.ts ./
# postinstall runs `prisma generate`, which needs the schema.
COPY prisma ./prisma
RUN npm ci

# ---- build: compile (the client was generated into src/ by postinstall) ----
FROM deps AS build
COPY . .
RUN npm run build

# ---- runtime: production dependencies + compiled output only ----
FROM node:24-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
# The prisma CLI is a production dependency: the container applies migrations on start.
# postinstall regenerates the client into src/, which the compiled dist doesn't use.
RUN npm ci --omit=dev && rm -rf src && npm cache clean --force
COPY --from=build /app/dist ./dist
USER node
EXPOSE 3000
# Secrets come from the environment at run time; nothing is baked into the image.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
