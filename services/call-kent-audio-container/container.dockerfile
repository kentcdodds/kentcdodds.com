FROM node:24-bookworm-slim

RUN apt-get update \
	&& apt-get install -y --no-install-recommends ffmpeg ca-certificates \
	&& rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --chown=node:node package.json package-lock.json* ./
RUN npm ci
COPY --chown=node:node . .

USER node

CMD ["npm", "run", "start"]
