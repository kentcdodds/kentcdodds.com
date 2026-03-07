FROM node:24-bookworm-slim

RUN apt-get update && apt-get install -y ffmpeg ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .

CMD ["npm", "run", "start"]
