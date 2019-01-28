FROM registry.gitlab.localdev.cc/infra/base-container/node:10-full

RUN apk update && apk upgrade && \
    apk add --no-cache bash git openssh
COPY package.json /src
RUN npm i -g mocha
RUN npm i

ENV INTEGRATION_TEST true
ENV LOG_LEVEL debug
ENV PROXY_PORT 8813

COPY test /src/test
COPY config /src/config
COPY config.js /src/config.js
COPY utils /src/utils
COPY .env /src/.env
CMD [ "mocha" ]
