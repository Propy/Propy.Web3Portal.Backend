# Installs Node.js image
FROM node:18.16.0-alpine3.17

# sets the working directory for any RUN, CMD, COPY command
# all files we put in the Docker container running the server will be in /opt/app (e.g. /opt/app/package.json)
RUN mkdir -p /opt/app
WORKDIR /opt/app

# Copies package.json, yarn.lock, tsconfig.json, .env to the root of WORKDIR
COPY ["package.json", "yarn.lock", "tsconfig.json", "knexfile.js", "./"]

# Copies everything in the src directory to WORKDIR/src
COPY ./src ./src

# Installs all packages
RUN yarn install

# Runs the dev npm script to build & start the server
CMD yarn run knex migrate:latest && yarn run build && yarn run start