import e, { Request, Response, NextFunction } from 'express';

import jwt from "jsonwebtoken";

import {
  createLog,
  createErrorLog,
} from "../logger";

import { 
  JWT_SECRET_ADMIN,
  JWT_AUTO_RENEW_THRESHOLD_SECONDS,
  JWT_ADMIN_LIFETIME_SECONDS,
} from "../constants";

export const authenticateJWTAdmin = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (authHeader && JWT_SECRET_ADMIN) {
      const token = authHeader.split(' ')[1];
      jwt.verify(token, JWT_SECRET_ADMIN, (err: any, user: any) => {
          if (err) {
              return res.sendStatus(403);
          }
          next();
      });
    } else {
      return res.sendStatus(403);
    }
};

export const isValidJWTAdmin = (authHeader: string | undefined) => {
  if (authHeader && JWT_SECRET_ADMIN) {
    const token = authHeader.split(' ')[1];
    return jwt.verify(token, JWT_SECRET_ADMIN, (err: any, decoded: any) => {
      if (err) {
        createErrorLog({err})
        return false;
      }
      return true;
    });
  } else {
    return false;
  }
}

export const returnLatestValidAdminJWT = (authHeader: string | undefined) => {
  if (authHeader && JWT_SECRET_ADMIN) {
    const token = authHeader.split(' ')[1];
    return jwt.verify(token, JWT_SECRET_ADMIN, (err: any, decoded: any) => {
      if (err) {
        createErrorLog({err})
        return false;
      }
      if((decoded.exp - Math.floor(new Date().getTime() / 1000)) <= JWT_AUTO_RENEW_THRESHOLD_SECONDS) {
        createLog(`Token is within ${JWT_AUTO_RENEW_THRESHOLD_SECONDS} seconds of expiry, regenerating admin JWT`);
        return generateJWTAdmin();
      } else {
        return token;
      }
    });
  } else {
    return false;
  }
}

export const generateJWTAdmin = () => {
  if(JWT_SECRET_ADMIN) {
    let token = jwt.sign({ 
      exp: Math.floor(Date.now() / 1000) + JWT_ADMIN_LIFETIME_SECONDS, // valid for 5 minutes
      admin: true,
    }, JWT_SECRET_ADMIN);
    return token;
  }
}