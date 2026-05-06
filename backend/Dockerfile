FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev --no-audit --prefer-offline 2>/dev/null || npm install --omit=dev --no-audit

COPY . .

EXPOSE 4000

CMD ["node", "src/index.js"]
