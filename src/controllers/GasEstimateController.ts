import e, { Request, Response } from 'express';
import axios from 'axios';

import BigNumber from 'bignumber.js';

import {
  NETWORK_TO_ENDPOINT,
} from '../constants';

import Controller from './Controller';

import {
  getFeeHistory,
  getMaxPriorityFeePerGas,
} from '../web3/jobs';

BigNumber.config({ EXPONENTIAL_AT: [-1e+9, 1e+9] });

class GasEstimateController extends Controller {
  async getMaxPriorityFeePerGasEstimateForNetwork(req: Request, res: Response) {
    
    const {
      network,
    } = req.params;

    let url = NETWORK_TO_ENDPOINT[network];

    let result = {
      maxPriorityFeePerGas: "2000000000"
    };

    if(url) {
      let maxPriorityFeePerGas = await getFeeHistory(network);
      if(maxPriorityFeePerGas === 0) {
        maxPriorityFeePerGas = await getMaxPriorityFeePerGas(network);
      }
      if(!isNaN(maxPriorityFeePerGas) && (Number(maxPriorityFeePerGas) > 0)) {
        result.maxPriorityFeePerGas = maxPriorityFeePerGas.toString();
      }
    }

    // maxFeePerGas:
    //       //   (rpcQuantityToBigInt(response.baseFeePerGas[1]) *
    //       //     9n **
    //       //       (AutomaticGasPriceProvider.EIP1559_BASE_FEE_MAX_FULL_BLOCKS_PREFERENCE -
    //       //         1n)) /
    //       //   8n **
    //       //     (AutomaticGasPriceProvider.EIP1559_BASE_FEE_MAX_FULL_BLOCKS_PREFERENCE -
    //       //       1n),
  
    this.sendResponse(res, result);

  }
}

export default GasEstimateController;