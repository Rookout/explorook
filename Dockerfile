FROM node:16.14.2-alpine3.15 as build

ENV env=development
WORKDIR /build

ADD package.json ./
ADD yarn.lock ./
ADD patches ./patches/

RUN yarn install
COPY . .

RUN yarn run build-headless

FROM node:16.14.2-alpine3.15 as release

WORKDIR /app
COPY --from=build /build/dist /app/dist
COPY --from=build /build/node_modules /app/node_modules
COPY --from=build /build/package.json /app
COPY --from=build /build/graphql /app/graphql

EXPOSE 44512

ENTRYPOINT ["node", "/app/dist/headless.js", "-p=44512"]
