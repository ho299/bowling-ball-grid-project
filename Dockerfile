# Use the official postgres image as the base
FROM postgres:latest

# Copy the initialization scripts into the correct directory in the container
COPY ./backend/src/config/database_script.sql /docker-entrypoint-initdb.d/

# POSTGRES_PASSWORD, POSTGRES_USER, and POSTGRES_DB must be supplied at runtime.
# Local dev:  pass -e flags or use an env_file in docker-compose
# AWS ECS:    reference AWS Secrets Manager ARNs in the task definition "secrets" block
# AWS EB/EC2: set environment properties in the platform console or via Parameter Store