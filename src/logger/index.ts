import { inspect } from 'util';
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

// Ethers errors carry the RPC URL (and its key) in their message, stack and `url` property. Axios errors carry the
// request config and the raw request, whose URL, path and header dump include keys sent as query parameters
// (CoinGecko, Etherscan). So errors are logged as a redacted summary rather than the whole object.
const describeForErrorLog = (value: any): string => {
  if(value instanceof Error) {
    const error: any = value;
    const details = [
      error.stack || String(error),
      ...(error.code !== undefined ? [`code: ${error.code}`] : []),
      ...(error.response?.status !== undefined ? [`status: ${error.response.status}`] : []),
      ...(typeof error.detail === 'string' ? [`detail: ${error.detail}`] : []), // Postgres
    ];
    return redactUrls(details.join('\n  '));
  }
  return redactUrls(typeof value === 'string' ? value : inspect(value));
}

export const createErrorLog = (message: any, errorExtended?: any) => {
  const safeMessage = describeForErrorLog(message);
  const safeError = errorExtended ? describeForErrorLog(errorExtended) : "";
  if(process.env["ENABLE_ELASTIC_LOGGING"]) {
    logger.error(safeMessage, { meta: safeError });
  }
  console.error(safeMessage, safeError);
}