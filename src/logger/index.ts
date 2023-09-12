import winston from 'winston';
import ecsFormat from '@elastic/ecs-winston-format';

import dotenv from "dotenv";

dotenv.config();

const logger = winston.createLogger({
  level: 'debug',
  format: ecsFormat({ convertReqRes: true }),
  transports: [
    //new winston.transports.Console(),
    new winston.transports.File({
      filename: 'logs/log.json',
      level: 'debug'
    })
  ]
})

export const createLog = (message: any, messageExtended?: any) => {
  if(process.env["ENABLE_ELASTIC_LOGGING"]) {
    logger.info(message, {meta: messageExtended ? messageExtended : ""});
  }
  console.log(message, messageExtended ? messageExtended : "");
}

export const createErrorLog = (message: any, errorExtended?: any) => {
  if(process.env["ENABLE_ELASTIC_LOGGING"]) {
    logger.error(message, { meta: errorExtended ? errorExtended : "" });
  }
  console.error(message, errorExtended ? errorExtended : "");
}