import e, { Request, Response } from 'express';
import { raw } from 'objection';

import BigNumber from 'bignumber.js';

import Controller from './Controller';

import {
  TokenTransferEventERC721Repository,
} from '../database/repositories';

BigNumber.config({ EXPONENTIAL_AT: [-1e+9, 1e+9] });

class TimseriesController extends Controller {
  async getMintedPerDay(req: Request, res: Response) {

    const {
      network,
      contractAddress,
    } = req.params;

    const result = await TokenTransferEventERC721Repository.query()
    .select(
      raw("DATE_TRUNC('day', to_timestamp(CAST(evm_transaction.block_timestamp AS numeric))) AS utc_day"),
      raw('COUNT(*) AS record_count')
    )
    .leftJoin('evm_transaction', 'erc721_transfer_event.transaction_hash', 'evm_transaction.hash')
    .where('erc721_transfer_event.from', '0x0000000000000000000000000000000000000000')
    .where('contract_address', contractAddress)
    .where('erc721_transfer_event.network_name', network)
    .groupBy('utc_day')
    .orderBy('utc_day');

    return this.sendResponse(res, result ? result : []);

  }
}

export default TimseriesController;