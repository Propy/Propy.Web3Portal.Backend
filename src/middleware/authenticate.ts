import e, { Request, Response, NextFunction } from 'express';

import jwt from "jsonwebtoken";

import { JWT_SECRET_ADMIN } from "../constants";

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
        return false;
      }
      return true;
    });
  } else {
    return false;
  }
}

export const generateJWTAdmin = () => {
  if(JWT_SECRET_ADMIN) {
    let token = jwt.sign({ 
      exp: Math.floor(Date.now() / 1000) + (60 * 60), // valid for one hour
      admin: true,
    }, JWT_SECRET_ADMIN);
    return token;
  }
}