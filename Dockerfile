# install all nodemodules, including dev
FROM node:14-slim as deps

ARG REMIX_TOKEN
ENV REMIX_TOKEN=${REMIX_TOKEN}

RUN mkdir /app/
WORKDIR /app/
ADD package.json package-lock.json .npmrc ./
RUN npm install

# setup production node_modules
FROM node:14-slim as production-deps

ARG REMIX_TOKEN
ENV REMIX_TOKEN=${REMIX_TOKEN}

RUN mkdir /app/
WORKDIR /app/

COPY --from=deps /app/node_modules /app/
COPY --from=deps /usr/local /usr/
ADD package.json package-lock.json .npmrc ./
RUN npm prune --production

# build app
FROM node:14-slim as build

ARG REMIX_TOKEN
ENV REMIX_TOKEN=${REMIX_TOKEN}

RUN mkdir /app/
WORKDIR /app/

ADD . .
COPY --from=deps /app/node_modules /app/node_modules

RUN ls -la /app/node_modules/

RUN npm run build

# build smaller image for running
FROM node:14-slim

ARG REMIX_TOKEN
ENV REMIX_TOKEN=${REMIX_TOKEN}

RUN mkdir /app/
WORKDIR /app/

COPY --from=production-deps /app/node_modules /app/node_modules
COPY --from=build /app/build /app/

CMD ["npm", "run", "start"]