FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

RUN mkdir -p uploads

EXPOSE 3000

ENV NODE_ENV=production

CMD ["sh", "-c", "node db-init.js && node server.js"]
