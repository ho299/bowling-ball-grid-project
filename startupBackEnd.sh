docker pull node:lts-alpine
docker network create bowlingBallAppProject
docker build -t backend:1.0.0.beta ./backend
docker run -i --rm --network=bowlingBallAppProject \
 -p 3001:3000 \
 --name=backend backend:1.0.0.beta
