# base node image
FROM node:16-bullseye-slim as base

# install open ssl for prisma and ffmpeg for the call kent functionality
RUN apt-get update && apt-get install -y openssl ffmpeg

# install all node_modules, including dev
FROM base as deps

ENV CYPRESS_INSTALL_BINARY=0
ENV HUSKY_SKIP_INSTALL=1

RUN mkdir /app/
WORKDIR /app/

ADD package.json .npmrc package-lock.json ./
ADD other/patches ./other/patches
RUN npm install --production=false

# setup production node_modules
FROM base as production-deps

RUN mkdir /app/
WORKDIR /app/

COPY --from=deps /app/node_modules /app/node_modules
ADD package.json .npmrc package-lock.json /app/
RUN npm prune --production

# build app
FROM base as build

ARG COMMIT_SHA
ENV COMMIT_SHA=$COMMIT_SHA

RUN mkdir /app/
WORKDIR /app/

COPY --from=deps /app/node_modules /app/node_modules

# schema doesn't change much so these will stay cached
ADD prisma .
RUN npx prisma generate
ADD prisma-postgres .
RUN npx prisma generate --schema ./prisma-postgres/schema.prisma

# app code changes all the time
ADD . .
RUN npm run build

# build smaller image for running
FROM base

ENV DATABASE_URL=file:/data/sqlite.db
ENV NODE_ENV=production
# Make SQLite CLI accessible
RUN echo "#!/bin/sh\nset -x\nsqlite3 \$DATABASE_URL" > /usr/local/bin/database-cli && chmod +x /usr/local/bin/database-cli

RUN mkdir /app/
WORKDIR /app/

COPY --from=production-deps /app/node_modules /app/node_modules
COPY --from=build /app/node_modules/.prisma /app/node_modules/.prisma
COPY --from=build /app/build /app/build
COPY --from=build /app/public /app/public
COPY --from=build /app/server-build /app/server-build
ADD . .

CMD ["npm", "run", "start"]
