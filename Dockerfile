# base node image
FROM node:20-bookworm-slim as base

# install open ssl and sqlite3 for prisma
# ffmpeg for the call kent functionality
# ca-certificates and fuse for litefs
# procps for "tops" command to see which processes are hogging memory (it's node)
# python & make for node-gyp
RUN apt-get update && apt-get install -y fuse3 openssl ffmpeg sqlite3 ca-certificates procps python3 make g++

# install all node_modules, including dev
FROM base as deps

RUN mkdir /app/
WORKDIR /app/

ADD package.json .npmrc package-lock.json ./
ADD other/patches ./other/patches
RUN npm install

# setup production node_modules
FROM base as production-deps

RUN mkdir /app/
WORKDIR /app/

COPY --from=deps /app/node_modules /app/node_modules
ADD package.json .npmrc package-lock.json /app/
RUN npm prune --omit=dev

# build app
FROM base as build

ARG COMMIT_SHA
ENV COMMIT_SHA=$COMMIT_SHA
ENV SENTRY_UPLOAD="true"

RUN mkdir /app/
WORKDIR /app/

COPY --from=deps /app/node_modules /app/node_modules

ADD other/runfile.js /app/other/runfile.js

# schema doesn't change much so these will stay cached
ADD prisma /app/prisma

RUN npx prisma generate

# app code changes all the time
ADD . .

ENV SENTRY_ORG="kent-c-dodds-tech-llc"
ENV SENTRY_PROJECT="kcd-node"

# Mount the secret and set it as an environment variable and run the build
RUN --mount=type=secret,id=SENTRY_AUTH_TOKEN \
    export SENTRY_AUTH_TOKEN=$(cat /run/secrets/SENTRY_AUTH_TOKEN) && \
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

COPY --from=production-deps /app/node_modules /app/node_modules
COPY --from=build /app/node_modules/.prisma /app/node_modules/.prisma
COPY --from=build /app/build /app/build
COPY --from=build /app/public /app/public
COPY --from=build /app/server-build /app/server-build

ADD . .

# prepare for litefs
COPY --from=flyio/litefs:0.5.11 /usr/local/bin/litefs /usr/local/bin/litefs
ADD other/litefs.yml /etc/litefs.yml
RUN mkdir -p /data ${LITEFS_DIR}

CMD ["litefs", "mount"]
