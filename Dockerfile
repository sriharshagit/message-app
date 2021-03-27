FROM node:10
WORKDIR /message-app
COPY package.json /message-app
RUN npm install
COPY . /message-app