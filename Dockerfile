# base node image
FROM node:16-bullseye-slim as base

ARG REMIX_TOKEN
ENV REMIX_TOKEN=$REMIX_TOKEN

# install open ssl for prisma and ffmpeg for the call kent functionality
RUN apt-get update && apt-get install -y openssl ffmpeg

# install all node_modules, including dev
FROM base as deps

ENV CYPRESS_INSTALL_BINARY=0
ENV HUSKY_SKIP_INSTALL=1

RUN mkdir /app/
WORKDIR /app/

ADD package.json package-lock.json .npmrc ./
ADD other/patches ./other/patches
ADD other/tracing.js ./other/tracing.js
RUN npm install --production=false

# setup production node_modules
FROM base as production-deps

ARG REMIX_TOKEN
ENV REMIX_TOKEN=$REMIX_TOKEN

RUN mkdir /app/
WORKDIR /app/

COPY --from=deps /app/node_modules /app/node_modules
ADD package.json package-lock.json .npmrc /app/
RUN npm prune --production

# build app
FROM base as build

ARG REMIX_TOKEN
ENV REMIX_TOKEN=$REMIX_TOKEN
ARG COMMIT_SHA
ENV COMMIT_SHA=$COMMIT_SHA

RUN mkdir /app/
WORKDIR /app/

COPY --from=deps /app/node_modules /app/node_modules

# schema doesn't change much so these will stay cached
ADD prisma .
RUN npx prisma generate

# app code changes all the time
ADD . .
RUN npm run build

# build smaller image for running
FROM base

ENV NODE_ENV=production

RUN mkdir /app/
WORKDIR /app/

COPY --from=production-deps /app/node_modules /app/node_modules
COPY --from=build /app/node_modules/.prisma /app/node_modules/.prisma
COPY --from=build /app/build /app/build
COPY --from=build /app/public /app/public
ADD . .

CMD ["npm", "run", "start"]
