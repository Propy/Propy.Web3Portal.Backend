import e, { Request, Response } from 'express';

import BigNumber from 'bignumber.js';

import { lookup } from 'geoip-lite';

import Controller from './Controller';

BigNumber.config({ EXPONENTIAL_AT: [-1e+9, 1e+9] });

class GeoController extends Controller {
  async locate(req: Request, res: Response) {

    let ip = req.ip || req.header('x-forwarded-for') || req.socket.remoteAddress;
    let info;
    if(ip?.toString()) {
      info = lookup(ip.toString());
    }

    this.sendResponse(res, ip ? {ip, info} : {});

  }
}

export default GeoController;