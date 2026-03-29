# Use the official postgres image as the base
FROM postgres:latest

# Copy the initialization scripts into the correct directory in the container
COPY ./backend/src/config/database_script.sql /docker-entrypoint-initdb.d/

# Set environment variables for the default superuser
# These are used the first time the container starts
ENV POSTGRES_PASSWORD=mysecretpassword
ENV POSTGRES_DB=bowling
ENV POSTGRES_USER=docker_user