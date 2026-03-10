# base node image
FROM node:24-bookworm-slim as base

# install open ssl and sqlite3 for prisma
# ca-certificates and fuse for litefs
# procps for "tops" command to see which processes are hogging memory (it's node)
# python & make for node-gyp
RUN apt-get update && apt-get install -y fuse3 openssl sqlite3 ca-certificates procps python3 make g++

# install all node_modules, including dev
FROM base as deps

RUN mkdir /app/
WORKDIR /app/

RUN mkdir -p /app/services/site /app/services/oauth /app/services/call-kent-audio-worker
ADD package.json .npmrc package-lock.json nx.json tsconfig.base.json ./
ADD services/site/package.json /app/services/site/package.json
ADD services/site/prisma /app/services/site/prisma
ADD services/site/prisma.config.ts /app/services/site/prisma.config.ts
ADD services/oauth/package.json /app/services/oauth/package.json
ADD services/call-kent-audio-worker/package.json /app/services/call-kent-audio-worker/package.json
RUN npm install

# setup production node_modules
FROM base as production-deps

RUN mkdir /app/
WORKDIR /app/

COPY --from=deps /app/node_modules /app/node_modules
RUN mkdir -p /app/services/site /app/services/oauth /app/services/call-kent-audio-worker
ADD package.json .npmrc package-lock.json /app/
ADD services/site/package.json /app/services/site/package.json
ADD services/site/prisma /app/services/site/prisma
ADD services/site/prisma.config.ts /app/services/site/prisma.config.ts
ADD services/oauth/package.json /app/services/oauth/package.json
ADD services/call-kent-audio-worker/package.json /app/services/call-kent-audio-worker/package.json
RUN npm prune --omit=dev
RUN npm rebuild better-sqlite3

# build app
FROM base as build

ARG COMMIT_SHA
ENV COMMIT_SHA=$COMMIT_SHA
ENV SENTRY_UPLOAD="false"

RUN mkdir /app/
WORKDIR /app/

COPY --from=deps /app/node_modules /app/node_modules

# app code changes all the time
ADD . .

WORKDIR /app/services/site

ENV SENTRY_ORG="kent-c-dodds-tech-llc"
ENV SENTRY_PROJECT="kcd-node"

# Enable Sentry upload only when both COMMIT_SHA and SENTRY_AUTH_TOKEN exist.
RUN --mount=type=secret,id=SENTRY_AUTH_TOKEN,required=false \
    if [ -f /run/secrets/SENTRY_AUTH_TOKEN ] && [ -n "$COMMIT_SHA" ]; then \
      export SENTRY_AUTH_TOKEN="$(cat /run/secrets/SENTRY_AUTH_TOKEN)"; \
      export SENTRY_UPLOAD="true"; \
      echo "Sentry sourcemap upload enabled"; \
    else \
      export SENTRY_UPLOAD="false"; \
      echo "Sentry sourcemap upload disabled (missing SENTRY_AUTH_TOKEN or COMMIT_SHA)"; \
    fi && \
    npx prisma@7 generate && \
    npm run build

# build smaller image for running
FROM base

ENV FLY="true"
ENV LITEFS_DIR="/litefs"

ENV DATABASE_FILENAME="sqlite.db"
ENV DATABASE_PATH="$LITEFS_DIR/$DATABASE_FILENAME"
ENV DATABASE_URL="file:$DATABASE_PATH"
ENV INTERNAL_PORT="8080"
ENV PORT="8081"
ENV NODE_ENV="production"
# For WAL support: https://github.com/prisma/prisma-engines/issues/4675#issuecomment-1914383246
ENV PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK = "1"
ENV CACHE_DATABASE_FILENAME="cache.db"
ENV CACHE_DATABASE_PATH="$LITEFS_DIR/$CACHE_DATABASE_FILENAME"
# Make SQLite CLI accessible
RUN echo "#!/bin/sh\nset -x\nsqlite3 \$DATABASE_PATH" > /usr/local/bin/database-cli && chmod +x /usr/local/bin/database-cli
RUN echo "#!/bin/sh\nset -x\nsqlite3 \$CACHE_DATABASE_PATH" > /usr/local/bin/cache-database-cli && chmod +x /usr/local/bin/cache-database-cli

RUN mkdir /app/
WORKDIR /app/

ADD . .

COPY --from=production-deps /app/node_modules /app/node_modules
COPY --from=build /app/services/site/app/utils/prisma-generated.server /app/services/site/app/utils/prisma-generated.server
COPY --from=build /app/services/site/build /app/services/site/build
COPY --from=build /app/services/site/public /app/services/site/public
COPY --from=build /app/services/site/server-build /app/services/site/server-build

# prepare for litefs
COPY --from=flyio/litefs:0.5.11 /usr/local/bin/litefs /usr/local/bin/litefs
ADD other/litefs.yml /etc/litefs.yml
RUN mkdir -p /data ${LITEFS_DIR}

WORKDIR /app/services/site

CMD ["litefs", "mount"]
