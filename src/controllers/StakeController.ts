import { validationResult } from "express-validator";
import e, { Request, Response } from 'express';
import { utils } from "ethers";

import BigNumber from 'bignumber.js';

import {
  AssetRepository,
  StakingContractRepository,
  UniswapPoolRepository,
  StakingEventRepository,
} from '../database/repositories';

import {
	fullSyncStaking
} from '../tasks/full-sync-staking';

import {
	fullSyncTransfersAndBalancesERC721
} from '../tasks/full-sync-transfers-and-balances-erc721';

import {
	fullSyncUniswapPoolMintedERC721
} from '../tasks/full-sync-uniswap-pool-minted-erc721';

import LeaderboardOutputTransformer from '../database/transformers/stake/leaderboardV3';

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

    const payload = req.body;

    let {
      meta,
    } = payload;

    if(meta) {
      meta = meta.toString();
    }

    let startTime = new Date().getTime();

    try {

      if(!meta && ["PRONFTStakingV3_PK", "PRONFTStaking"].indexOf(meta) > -1) {

        let trackedStakingTokensERC721 = await AssetRepository.getStakingSyncAssetsByStandard("ERC-721");
    
        createLog(`Syncing ${trackedStakingTokensERC721.length} ERC-721 staking token(s)`);
    
        let trackedTokensProgressERC721 = 1;
        for(let trackedTokenERC721 of trackedStakingTokensERC721) {
          createLog(`Syncing ${trackedTokenERC721.symbol} - ${trackedTokenERC721.collection_name} - ${trackedTokenERC721.network_name} - ${trackedTokensProgressERC721} of ${trackedStakingTokensERC721.length} ERC-721 staking token(s)`);
          let postgresTimestamp = Math.floor(new Date().setSeconds(0) / 1000);
          await fullSyncTransfersAndBalancesERC721(trackedTokenERC721, postgresTimestamp);
          trackedTokensProgressERC721++;
        }

      }

      if(!meta || ["PRONFTStakingV3_LP"].indexOf(meta) > -1) {

        let trackedUniswapPoolContracts = await UniswapPoolRepository.getSyncContracts();

        createLog(`Syncing ${trackedUniswapPoolContracts.length} Staking contract(s)`);

        let trackedUniswapPoolContractProgress = 1;
        for(let trackedUniswapPoolContract of trackedUniswapPoolContracts) {
          createLog(`Syncing ${trackedUniswapPoolContract.address} - ${trackedUniswapPoolContract.meta} - ${trackedUniswapPoolContract.network_name} - ${trackedUniswapPoolContractProgress} of ${trackedUniswapPoolContracts.length} Uniswap pool contract(s)`);
          let postgresTimestamp = Math.floor(new Date().setSeconds(0) / 1000);
          await fullSyncUniswapPoolMintedERC721(trackedUniswapPoolContract, postgresTimestamp);
          trackedUniswapPoolContractProgress++;
        }

        let trackedStakingTokensUniswapERC721 = await AssetRepository.getUniswapSyncAssetsByStandard("ERC-721");
    
        createLog(`Syncing ${trackedStakingTokensUniswapERC721.length} Uniswap ERC-721 staking token(s)`);
    
        let trackedTokensProgressUniswapERC721 = 1;
        for(let trackedTokenERC721 of trackedStakingTokensUniswapERC721) {
          createLog(`Syncing ${trackedTokenERC721.symbol} - ${trackedTokenERC721.collection_name} - ${trackedTokenERC721.network_name} - ${trackedTokensProgressUniswapERC721} of ${trackedStakingTokensUniswapERC721.length} Uniswap ERC-721 staking token(s)`);
          let postgresTimestamp = Math.floor(new Date().setSeconds(0) / 1000);
          await fullSyncTransfersAndBalancesERC721(trackedTokenERC721, postgresTimestamp);
          trackedTokensProgressUniswapERC721++;
        }

      }

      // get tracked staking contracts
      let trackedStakingContracts = await StakingContractRepository.getSyncContracts();

      if(meta) {
        trackedStakingContracts = await StakingContractRepository.getContractByMeta(meta);
      }
  
      createLog(`Syncing ${trackedStakingContracts.length} Staking contract(s) - meta: ${meta ? meta : 'undefined'}`);
  
      let trackedStakingContractProgress = 1;
      for(let trackedStakingContract of trackedStakingContracts) {
        createLog(`Syncing ${trackedStakingContract.address} - ${trackedStakingContract.meta} - ${trackedStakingContract.network_name} - ${trackedStakingContract} of ${trackedStakingContract.length} Staking contract(s)`);
        let postgresTimestamp = Math.floor(new Date().setSeconds(0) / 1000);
        await fullSyncStaking(trackedStakingContract, postgresTimestamp);
        trackedStakingContractProgress++;
      }

      let execTimeSecondsFull = Math.floor((new Date().getTime() - startTime) / 1000);
  
      createLog(`SUCCESS: Manual stake sync, exec time: ${execTimeSecondsFull} seconds, finished at ${new Date().toISOString()}`)

      this.sendResponse(res, { success: true });

      
    } catch (e) {
      return this.sendError(res, 'Stake sync error');
    }
  }

  async leaderboardV3(req: Request, res: Response) {

    const errors = await validationResult(req);
    if (!errors.isEmpty()) {
      return this.sendResponse(res, {errors: errors.array()}, "Validation error", 422);
    }

    const {
      mode,
    } = req.params;

    const pagination = this.extractPagination(req);

    let stakingModules = ['0x4021bdaF50500DD718beB929769C6eD296796c63','0x5f2EFcf3e5aEc1E058038016f60e0C9cc8fBc861','0x9dc3d771b5633850C5D10c86a47ADDD36a8B4487'];
    if(mode === 'testnet') {
      stakingModules = ['0x4021bdaF50500DD718beB929769C6eD296796c63','0x5f2EFcf3e5aEc1E058038016f60e0C9cc8fBc861','0x9dc3d771b5633850C5D10c86a47ADDD36a8B4487'];
    }

    try {

      let stakingLeaderboard = await StakingEventRepository.getStakingLeaderboard(
        stakingModules,
        pagination,
        LeaderboardOutputTransformer
      );

      stakingLeaderboard.data = stakingLeaderboard.data.map((entry: any) => {
        let result = {
          staker: entry.staker,
          pstake_staking_power: Number(Number(utils.formatUnits(entry.total_staking_power, 8)).toFixed(2)),
          pro_rewards_withdrawn: Number(Number(utils.formatUnits(entry.total_pro_rewards_withdrawn, 8)).toFixed(2)),
          pro_rewards_forfeited: Number(Number(utils.formatUnits(entry.total_pro_rewards_foregone, 8)).toFixed(2)),
          pro_value_staked: Number(Number(utils.formatUnits(new BigNumber(entry.total_pro_amount).plus(entry.total_virtual_pro_amount).toString(), 8)).toFixed(2)),
        };
        return result;
      })

      this.sendResponse(res, stakingLeaderboard);
      
    } catch (e) {
      console.log({e})
      return this.sendError(res, 'Leaderboard error');
    }
  }
}

export default StakeController;