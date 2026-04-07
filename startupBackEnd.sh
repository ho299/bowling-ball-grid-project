docker pull node:lts-alpine
docker network create bowlingBallAppProject
docker build -t backend:1.0.0.beta ./backend
docker run -i --rm --network=bowlingBallAppProject \
 -p 3000:3000 \
 -e DB_NAME=bowling \
 -e DB_HOST=postgres \
 -e DB_USER=docker_user \
 -e DB_PASSWORD=mysecretpassword \
 --name=backend backend:1.0.0.beta
