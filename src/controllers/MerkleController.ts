import e, { Request, Response } from 'express';

import BigNumber from 'bignumber.js';

import Controller from './Controller';

import { merkleTreeGenerator } from '../utils';

BigNumber.config({ EXPONENTIAL_AT: [-1e+9, 1e+9] });

class MerkleController extends Controller {
  async getRoot(req: Request, res: Response) {

    let {
      stringified_json,
    } = req.body;

    try {
      let parsedBody = JSON.parse(stringified_json);
      let merkleRoot = await merkleTreeGenerator(parsedBody);
      this.sendResponse(res, { merkleRoot });
    } catch (error) {
      console.log({error})
      this.sendError(res, "Something went wrong");
    }

  }
}

export default MerkleController;