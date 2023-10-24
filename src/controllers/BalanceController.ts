import { validationResult } from "express-validator";
import e, { Request, Response } from 'express';
import { utils } from "ethers";

import BigNumber from 'bignumber.js';

import {
  getTokenInfoERC20
} from '../web3/jobs';

import {
  AssetRepository,
  BalanceRepository,
} from '../database/repositories';

import {
  IAssetRecordDB,
  IMixedBalancesResult,
  IOwnedBalancesResult,
} from '../interfaces';

import {
	createLog
} from '../logger';

import {
  debugMode,
  PRO_TOKEN_ADDRESS_MAINNET,
} from '../constants';

import BalanceOutputTransformer from '../database/transformers/balance/output';

import Controller from './Controller';

BigNumber.config({ EXPONENTIAL_AT: [-1e+9, 1e+9] });

class BalanceController extends Controller {
  async getAccountBalancesPaginated(req: Request, res: Response) {

    const {
      account
    } = req.params;

    const pagination = this.extractPagination(req);

    let checksumAddress = '';
    try {
      checksumAddress = utils.getAddress(account);
    } catch (error) {
      this.sendError(res, 'Invalid Address');
      return;
    }

    let balances = await BalanceRepository.getBalanceByHolderPaginated(checksumAddress, pagination);

    let results : IOwnedBalancesResult = {
      'ERC-20': {},
      'ERC-721': {},
    }

    if(debugMode) {
      createLog({balances})
    }

    for(let balance of balances.data) {
      if(balance?.asset?.standard === 'ERC-20') {
        results['ERC-20'][balance?.asset?.address] = {
          asset: balance?.asset,
        };
        if(!results['ERC-20'][balance?.asset?.address].balances) {
          results['ERC-20'][balance?.asset?.address].balances = [balance];
        } else {
          results['ERC-20'][balance?.asset?.address].balances?.push(balance);
        }
      }
      if(balance?.asset?.standard === 'ERC-721') {
        if(!results['ERC-721'][balance?.asset?.address]) {
          results['ERC-721'][balance?.asset?.address] = {
            balances: [],
            asset: balance?.asset,
          };
        }
        results['ERC-721'][balance?.asset?.address].balances?.push(balance);
      }
    }

    // If there is no ERC-20 balance, show a 0 balance for PRO token
    if(Object.entries(results['ERC-20']).length === 0) {
      let assetRecord = await AssetRepository.getAssetByAddress(PRO_TOKEN_ADDRESS_MAINNET);
      results['ERC-20'][PRO_TOKEN_ADDRESS_MAINNET] = {
        asset: assetRecord,
      };
      let randomBalance = await BalanceRepository.getFirstBalanceByAssetAddress(PRO_TOKEN_ADDRESS_MAINNET);
      randomBalance.balance = "0";
      randomBalance.holder_address = checksumAddress;
      console.log({randomBalance: randomBalance});
      results['ERC-20'][PRO_TOKEN_ADDRESS_MAINNET].balances = [
        randomBalance,
      ]
      balances.pagination.total = balances.pagination.total + 1;
    }

    let response = {
      data: results,
      metadata: {
        pagination: balances.pagination
      },
    }

    this.sendResponse(res, response ? response : {});
  }
  async getMixedBalances(req: Request, res: Response) {
    let allAssets = await AssetRepository.query();

    let allNonBaseAssets : IAssetRecordDB[] = allAssets.filter((asset: IAssetRecordDB) => !asset.is_base_asset);

    let results : IMixedBalancesResult = {
      'ERC-20': {},
      'ERC-721': {},
    }

    for(let nonBaseAsset of allNonBaseAssets) {
      if(nonBaseAsset.standard === 'ERC-20') {
        results['ERC-20'][nonBaseAsset.address] = {
          asset: nonBaseAsset,
        };
      }
      if(nonBaseAsset.standard === 'ERC-721') {
        results['ERC-721'][nonBaseAsset.address] = {
          asset: nonBaseAsset,
        };
        // paginate some balances for this asset
        let paginatedBalances = await BalanceRepository.paginate(5, 1, { assetAddress: nonBaseAsset.address }, BalanceOutputTransformer);
        results['ERC-721'][nonBaseAsset.address].balances = paginatedBalances.data;
        results['ERC-721'][nonBaseAsset.address].balancesPagination = paginatedBalances.pagination;
      }
    }
  
    this.sendResponse(res, results ? results : {});

  }
}

export default BalanceController;