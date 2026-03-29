docker pull node:lts-alpine
docker network create bowlingBallAppProject
docker build -t frontend:1.0.0.beta ./frontend
docker run -i --rm --network=bowlingBallAppProject \
 -p 3000:3000 \
 --name=frontend frontend:1.0.0.beta
