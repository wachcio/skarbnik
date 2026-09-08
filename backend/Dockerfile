# Jednoetapowa kopia node_modules (z devDependencies) z build do runtime —
# prościej i bez ryzyka niezgodności silnika Prisma między etapami.
# Do optymalizacji (mniejszy obraz) w kolejnym etapie.

FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./package.json

EXPOSE 4000 4443
CMD ["node", "dist/server.js"]
