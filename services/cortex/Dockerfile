FROM node:22-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

COPY lib ./lib
COPY tsconfig.json ./

ENV NODE_ENV=production
ENV CORTEX_GATEWAY_PORT=8200

EXPOSE 8200

CMD ["npm", "run", "start:cortex"]
