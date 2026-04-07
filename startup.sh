docker pull postgres
docker network create bowlingBallAppProject
docker build -t postgres:1.0.0 .
docker run -i --rm --network=bowlingBallAppProject \
 -p 5432:5432 \
 -e dev=dev \
 --name=postgres postgres:1.0.0