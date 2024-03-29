import { validationResult } from "express-validator";
import e, { Request, Response } from 'express';
import { utils } from "ethers";

import BigNumber from 'bignumber.js';

import {
  AssetRepository,
  StakingContractRepository,
} from '../database/repositories';

import {
	fullSyncStaking
} from '../tasks/full-sync-staking';

import {
	fullSyncTransfersAndBalancesERC721
} from '../tasks/full-sync-transfers-and-balances-erc721';

import {
	createLog
} from '../logger';

import Controller from './Controller';

BigNumber.config({ EXPONENTIAL_AT: [-1e+9, 1e+9] });

class StakeController extends Controller {
  async triggerStakeSync(req: Request, res: Response) {

    const errors = await validationResult(req);
    if (!errors.isEmpty()) {
      return this.sendResponse(res, {errors: errors.array()}, "Validation error", 422);
    }

    let startTime = new Date().getTime();

    try {
      // get tracked staking contracts
      let trackedStakingContracts = await StakingContractRepository.getSyncContracts();
  
      createLog(`Syncing ${trackedStakingContracts.length} Staking contract(s)`);
  
      let trackedStakingContractProgress = 1;
      for(let trackedStakingContract of trackedStakingContracts) {
        createLog(`Syncing ${trackedStakingContract.address} - ${trackedStakingContract.meta} - ${trackedStakingContract.network_name} - ${trackedStakingContract} of ${trackedStakingContract.length} Staking contract(s)`);
        let postgresTimestamp = Math.floor(new Date().setSeconds(0) / 1000);
        await fullSyncStaking(trackedStakingContract, postgresTimestamp);
        trackedStakingContractProgress++;
      }
  
      let trackedStakingTokensERC721 = await AssetRepository.getStakingSyncAssetsByStandard("ERC-721");
  
      createLog(`Syncing ${trackedStakingTokensERC721.length} ERC-721 staking token(s)`);
  
      let trackedTokensProgressERC721 = 1;
      for(let trackedTokenERC721 of trackedStakingTokensERC721) {
        createLog(`Syncing ${trackedTokenERC721.symbol} - ${trackedTokenERC721.collection_name} - ${trackedTokenERC721.network_name} - ${trackedTokensProgressERC721} of ${trackedStakingTokensERC721.length} ERC-721 staking token(s)`);
        let postgresTimestamp = Math.floor(new Date().setSeconds(0) / 1000);
        await fullSyncTransfersAndBalancesERC721(trackedTokenERC721, postgresTimestamp);
        trackedTokensProgressERC721++;
      }

      let execTimeSecondsFull = Math.floor((new Date().getTime() - startTime) / 1000);
  
      createLog(`SUCCESS: Manual stake sync, exec time: ${execTimeSecondsFull} seconds, finished at ${new Date().toISOString()}`)

      this.sendResponse(res, { success: true });
    } catch (e) {
      return this.sendError(res, 'Stake sync error');
    }
  }
}

export default StakeController;