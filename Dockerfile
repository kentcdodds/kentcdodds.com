# install all node_modules, including dev
FROM node:14-slim as deps

ARG REMIX_TOKEN
ENV REMIX_TOKEN=${REMIX_TOKEN}
ENV CYPRESS_INSTALL_BINARY=0
ENV HUSKY_SKIP_INSTALL=1

RUN mkdir /app/
WORKDIR /app/

ADD package.json package-lock.json .npmrc ./
RUN npm install --production=false

# setup production node_modules
FROM node:14-slim as production-deps

ARG REMIX_TOKEN
ENV REMIX_TOKEN=${REMIX_TOKEN}

RUN mkdir /app/
WORKDIR /app/

COPY --from=deps /app/node_modules /app/node_modules
ADD package.json package-lock.json .npmrc /app/
RUN npm prune --production

# build app
FROM node:14-slim as build

ARG REMIX_TOKEN
ENV REMIX_TOKEN=${REMIX_TOKEN}

RUN mkdir /app/
WORKDIR /app/

COPY --from=deps /app/node_modules /app/node_modules

ADD . .

RUN npm run build

# build smaller image for running
FROM node:14-slim

ARG REMIX_TOKEN
ENV REMIX_TOKEN=${REMIX_TOKEN}
ENV NODE_ENV=production
ARG COMMIT_SHA
ENV COMMIT_SHA=${COMMIT_SHA}

RUN mkdir /app/
WORKDIR /app/

COPY --from=production-deps /app/node_modules /app/node_modules
COPY --from=build /app/build /app/

CMD ["npm", "run", "start"]