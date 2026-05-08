FROM node:20-alpine

WORKDIR /app

COPY package.json .
RUN npm install

COPY vite.config.ts tsconfig.json ./
COPY client/ client/
COPY src/ src/
RUN npm run build

CMD ["npm", "start"]
