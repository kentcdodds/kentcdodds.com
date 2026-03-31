FROM node:24-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
	ca-certificates \
	python3 \
	make \
	g++ \
	&& rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json .npmrc nx.json tsconfig.base.json ./
COPY services/site/package.json services/site/package.json
COPY services/site/prisma services/site/prisma
COPY services/site/prisma.config.ts services/site/prisma.config.ts
COPY services/oauth/package.json services/oauth/package.json
COPY services/call-kent-audio-worker/package.json services/call-kent-audio-worker/package.json
COPY services/search-worker/package.json services/search-worker/package.json
COPY services/search-shared/package.json services/search-shared/package.json

RUN npm ci --workspace=kentcdodds.com

COPY . .

# Default `docker run image` with no args. NAS script passes
# `node --env-file=/run/secrets/youtube-indexer.env …` so secrets stay out of
# `docker inspect` while Node 20+ loads the file before user code runs.
ENTRYPOINT ["node"]
CMD ["other/semantic-search/index-youtube-playlist.ts"]
