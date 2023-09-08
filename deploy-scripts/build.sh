#!/bin/bash

DOCKERFILE="$1"
APP_NAME="$2"
APP_ENV="$3"


ECR_REPO_NAME="${APP_ENV}-${APP_NAME}"

echo "Value of ECR_REPO_NAME: $ECR_REPO_NAME; DOCKERFILE: $DOCKERFILE; APP_NAME: $APP_NAME; APP_ENV: $APP_ENV"
set -e
docker build --build-arg BUILD_NUMBER=$BUILD_NUMBER -f $DOCKERFILE -t $APP_NAME:$APP_ENV  .
docker tag $APP_NAME:$APP_ENV 650585291486.dkr.ecr.us-east-1.amazonaws.com/$ECR_REPO_NAME:latest
docker push 650585291486.dkr.ecr.us-east-1.amazonaws.com/$ECR_REPO_NAME:latest
ssh -o StrictHostKeyChecking=no ubuntu@eksadmin.propy.int ". .profile;kubectl -n ${APP_ENV} rollout restart deployment ${APP_NAME}"
