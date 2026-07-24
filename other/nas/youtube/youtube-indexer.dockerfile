FROM oven/bun:1.3.14 AS bun
FROM node:26-bookworm-slim

COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun

RUN apt-get update && apt-get install -y --no-install-recommends \
	ca-certificates \
	python3 \
	make \
	g++ \
	&& rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json bun.lock bunfig.toml nx.json tsconfig.base.json ./
COPY services/site/package.json services/site/package.json
COPY services/site/migrations services/site/migrations
COPY services/oauth/package.json services/oauth/package.json
COPY services/call-kent-audio-worker/package.json services/call-kent-audio-worker/package.json
COPY services/search-worker/package.json services/search-worker/package.json
COPY services/search-shared/package.json services/search-shared/package.json

RUN bun install --frozen-lockfile --filter kcd-workspace --filter kentcdodds.com

COPY . .

RUN chown -R node:node /app
USER node

# Default `docker run image` with no args. NAS script passes
# `node --env-file=/run/secrets/youtube-indexer.env …` so secrets stay out of
# `docker inspect` while Node 20+ loads the file before user code runs.
ENTRYPOINT ["node"]
CMD ["other/semantic-search/index-youtube-playlist.ts"]
