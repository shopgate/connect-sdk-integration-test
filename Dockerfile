FROM 602824140852.dkr.ecr.us-east-1.amazonaws.com/base/node:8

RUN apk update && apk upgrade && \
    apk add --no-cache bash git openssh 
COPY package.json /src
RUN npm i -g mocha
RUN npm i
COPY test /src/test
COPY config /src/config
COPY config.js /src/config.js
COPY utils /src/utils
COPY .env /src/.env
CMD [ "mocha" ]
