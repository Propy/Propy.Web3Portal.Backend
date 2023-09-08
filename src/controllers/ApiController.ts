import e, { Request, Response } from 'express';

import Controller from './Controller';

class ApiController extends Controller {
  async ping(req: Request, res: Response) {

    this.sendResponse(res, "pong");

  }
}

export default ApiController;