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

// RPC/API keys live in URL paths and queries (QuickNode, Alchemy, Coinbase), and ethers error messages
// embed the full request URL. Keep the scheme and host, drop credentials, path and query.
const URL_PATTERN = /\b((?:https?|wss?):\/\/)(?:[^\s\/"'<>@]*@)?([^\s\/"'<>?#]+)([^\s"'<>]*)/g;

export const redactUrls = (text: string) => text.replace(
  URL_PATTERN,
  (_match: string, scheme: string, host: string, rest: string) => (rest && rest !== '/') ? `${scheme}${host}/<redacted>` : `${scheme}${host}${rest}`,
);

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