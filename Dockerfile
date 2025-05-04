FROM node:18.18.0-alpine as build

ENV env=development
WORKDIR /build

ADD package.json ./
ADD yarn.lock ./

RUN yarn install
COPY . .

RUN yarn run build-headless

FROM node:18.18.0-alpine as release

WORKDIR /app
COPY --from=build /build/dist /app/dist
COPY --from=build /build/node_modules /app/node_modules
COPY --from=build /build/package.json /app
COPY --from=build /build/graphql /app/graphql

EXPOSE 44512

ENTRYPOINT ["node", "/app/dist/headless.js", "-p=44512"]
