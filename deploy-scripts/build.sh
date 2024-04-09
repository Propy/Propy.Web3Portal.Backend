#!/bin/bash

APP_ENV="$1"

ECR_REPO_NAME="${APP_ENV}-dapp-api"

echo "Value of ECR_REPO_NAME: $ECR_REPO_NAME; APP_ENV: $APP_ENV"
set -e
docker build --build-arg BUILD_NUMBER=$BUILD_NUMBER -f ./Dockerfile -t dapp-api:$APP_ENV  .
docker tag dapp-api:$APP_ENV 650585291486.dkr.ecr.us-east-1.amazonaws.com/$ECR_REPO_NAME:latest
docker push 650585291486.dkr.ecr.us-east-1.amazonaws.com/$ECR_REPO_NAME:latest
kubectl -n ${APP_ENV} rollout restart deployment dapp-api
kubectl -n ${APP_ENV} rollout restart deployment dapp-sync
