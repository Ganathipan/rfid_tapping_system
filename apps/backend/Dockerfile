FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY src ./src
COPY config ./config
ENV NODE_ENV=production
CMD ["node", "src/server.js"]