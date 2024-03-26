import e, { Request, Response } from 'express';
import { raw } from 'objection';

import BigNumber from 'bignumber.js';

import Controller from './Controller';

import {
  TokenTransferEventERC721Repository,
  GenericCacheRepository,
} from '../database/repositories';

import {
  GENERIC_CACHE_KEYS,
  GENERIC_CACHE_AGES,
} from '../constants';

BigNumber.config({ EXPONENTIAL_AT: [-1e+9, 1e+9] });

const generatePropykeysDailyMintTimeseries = async (network: string, contractAddress: string) => {
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

    return result
}
class TimseriesController extends Controller {
  async getMintedPerDay(req: Request, res: Response) {

    const {
      network = "",
      contractAddress = "",
    } = req.params;

    // Check if we have a valid cached result
    let cachedData = await GenericCacheRepository.findByColumn("key", GENERIC_CACHE_KEYS.PROPYKEYS_DAILY_MINT_COUNTS(network, contractAddress));
    let result;

    let currentTimeUnix = Math.floor(new Date().getTime() / 1000);
    if(cachedData?.update_timestamp) {
      let shouldUpdate = (currentTimeUnix - Number(cachedData?.update_timestamp)) > cachedData?.max_seconds_age;
      if(shouldUpdate) {
        result = await generatePropykeysDailyMintTimeseries(network, contractAddress);
        this.sendResponse(res, result ? result : []);
        await GenericCacheRepository.update({json: JSON.stringify(result), update_timestamp: currentTimeUnix, max_seconds_age: GENERIC_CACHE_AGES.PROPYKEYS_DAILY_MINT_COUNTS}, cachedData.id);
        return;
      } else {
        result = cachedData.json;
      }
    } else {
      result = await generatePropykeysDailyMintTimeseries(network, contractAddress);
      try {
        await GenericCacheRepository.create({
          key: GENERIC_CACHE_KEYS.PROPYKEYS_DAILY_MINT_COUNTS(network, contractAddress),
          update_timestamp: currentTimeUnix,
          json: JSON.stringify(result),
          max_seconds_age: GENERIC_CACHE_AGES.PROPYKEYS_DAILY_MINT_COUNTS
        })
      } catch(e) {
        console.log("Error creating generic cache for coordinates");
      }
    }

    return this.sendResponse(res, result ? result : []);

  }
}

export default TimseriesController;