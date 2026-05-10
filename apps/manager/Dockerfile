FROM node:20-alpine
RUN apk add --no-cache git
WORKDIR /app
COPY manager.js .
CMD ["node", "manager.js"]
