# syntax=docker/dockerfile:1

# ---- build: static SPA into /app/build ----
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci
COPY . .
RUN npm run build

# ---- runtime: nginx serves the files and proxies the API ----
FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
# paths.base is /app, so the files are served from /app/.
COPY --from=build /app/build /usr/share/nginx/html/app
EXPOSE 8080
