FROM node:lts-alpine

WORKDIR /opt/frontend/

COPY package*.json ./

RUN npm install

COPY . .

CMD [ "npm", "start"]