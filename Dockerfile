FROM 602824140852.dkr.ecr.us-east-1.amazonaws.com/base/node:10

RUN apk update && apk upgrade && \
    apk add --no-cache bash git openssh
COPY package.json /src
RUN npm i -g mocha
RUN npm i --no-audit --no-package-lock

ENV LOG_LEVEL debug
ENV PROXY_PORT 8813

COPY test /src/test
COPY config /src/config
COPY lib /src/lib
COPY .env /src/.env
CMD [ "mocha" ]
