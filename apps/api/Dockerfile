FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm install
COPY . .
RUN npm run build -w @kpp/shared && npm run build -w @kpp/api
FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/web/public/data ./apps/web/public/data
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY package.json ./
CMD ["node","apps/api/dist/server.js"]
