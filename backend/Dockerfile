FROM node:lts-alpine

WORKDIR /opt/backend/

COPY package*.json ./

RUN npm install

COPY . .

CMD [ "npm", "start"]