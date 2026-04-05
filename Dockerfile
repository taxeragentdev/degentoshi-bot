FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

COPY . .

RUN mkdir -p signals logs data

ENV NODE_ENV=production

CMD ["node", "src/index.js"]
