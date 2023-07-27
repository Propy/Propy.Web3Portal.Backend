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

import BalanceOutputTransformer from '../database/transformers/balance/output';

import Controller from './Controller';

BigNumber.config({ EXPONENTIAL_AT: [-1e+9, 1e+9] });

class BalanceController extends Controller {
  async getAccountBalances(req: Request, res: Response) {

    const {
      account
    } = req.params;

    let checksumAddress = '';
    try {
      checksumAddress = utils.getAddress(account);
    } catch (error) {
      this.sendError(res, 'Invalid Address');
      return;
    }

    let balances = await BalanceRepository.getBalanceByHolder(checksumAddress);

    let results : IOwnedBalancesResult = {
      'ERC-20': {},
      'ERC-721': {},
    }

    for(let balance of balances) {
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
    this.sendResponse(res, results ? results : {});
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
        console.log({paginatedBalances})
        results['ERC-721'][nonBaseAsset.address].balances = paginatedBalances.data;
        results['ERC-721'][nonBaseAsset.address].balancesPagination = paginatedBalances.pagination;
      }
    }
  
    this.sendResponse(res, results ? results : {});

  }
}

export default BalanceController;