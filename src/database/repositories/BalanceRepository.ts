import BigNumber from "bignumber.js";
import { utils } from "ethers";

import { BalanceModel } from "../models";
import BaseRepository from "./BaseRepository";
import { QueryBuilder } from "objection";
import Pagination, { IPaginationRequest } from "../../utils/Pagination";
import { ITransformer } from "../../interfaces";

import {
  NFTRepository,
} from './';

import {
	createLog,
  createErrorLog,
} from '../../logger';

BigNumber.config({ EXPONENTIAL_AT: 1e+9 })

interface IPaginationQuery {
  assetAddress?: string;
}

class BalanceRepository extends BaseRepository {
  getModel() {
    return BalanceModel
  }

  async paginate(
    perPage = 10,
    page = 1,
    query : IPaginationQuery = {},
    transformer?: ITransformer,
  ) {
    let assetAddress = query.assetAddress ? query.assetAddress : null;

    const results = await this.model.query()
      .withGraphJoined('asset')
      .withGraphJoined('nft')
      .where(function (this: QueryBuilder<BalanceModel>) {
        if (assetAddress) {
          this.where('balance.asset_address', assetAddress);
        }
      })
      .page(page - 1, perPage)

    return this.parserResult(new Pagination(results, perPage, page), transformer);
  }

  async getBalanceByAssetAndHolder(assetAddress: string, holderAddress: string, networkName: string) {
    const result = await this.model.query().where(function (this: QueryBuilder<BalanceModel>) {
      this.where('asset_address', assetAddress);
      this.where('holder_address', holderAddress);
      this.where('network_name', networkName);
    }).first();

    return this.parserResult(result);
  }

  async getBalanceByAssetAndTokenIdAndHolder(assetAddress: string, holderAddress: string, tokenId: string, networkName: string) {
    const result = await this.model.query().where(function (this: QueryBuilder<BalanceModel>) {
      this.where('asset_address', assetAddress);
      this.where('holder_address', holderAddress);
      this.where('token_id', tokenId);
      this.where('network_name', networkName);
    }).first();

    return this.parserResult(result);
  }

  async getBalanceByHolder(holderAddress: string) {
    const result = await this.model.query()
    .withGraphJoined('asset')
    .withGraphJoined('nft')
    .where(function (this: QueryBuilder<BalanceModel>) {
      this.where('holder_address', holderAddress);
    });

    return this.parserResult(result);
  }

  async getBalanceByHolderPaginated(
    holderAddress: string,
    pagination: IPaginationRequest,
  ) {

    const { 
      perPage,
      page
    } = pagination;

    const result = await this.model.query()
    .withGraphJoined('asset')
    .withGraphJoined('nft')
    .where(function (this: QueryBuilder<BalanceModel>) {
      this.where('holder_address', holderAddress);
    })
    .orderBy('asset.standard', 'ASC')
    .page(page - 1, perPage);

    return this.parserResult(new Pagination(result, perPage, page));
  }

  async getBalanceByHolderAndAsset(
    holderAddress: string,
    assetAddress: string,
  ) {

    const result = await this.model.query()
    .withGraphJoined('asset')
    .withGraphJoined('nft')
    .where(function (this: QueryBuilder<BalanceModel>) {
      this.where('holder_address', holderAddress);
      this.where('asset.address', assetAddress);
    })
    .orderBy('asset.standard', 'ASC')

    return this.parserResult(result);
  }

  async getBalanceByHolderAndAssetIncludeStakingStatus(
    holderAddress: string,
    assetAddress: string,
    includeLastStakerRecords: boolean = false,
    onlyLastStakerRecords: boolean = false,
  ) {

    const result = await this.model.query()
    .withGraphJoined('asset')
    .withGraphJoined('nft')
    .withGraphJoined('nft_staking_status')
    .where(function (this: QueryBuilder<BalanceModel>) {
      if(onlyLastStakerRecords) {
        this.where('nft_staking_status.last_staking_address', holderAddress);
        this.whereNot('holder_address', holderAddress);
      } else {
        this.where('holder_address', holderAddress);
        if(includeLastStakerRecords) {
          this.orWhere('nft_staking_status.last_staking_address', holderAddress);
        }
      }
    })
    .where('asset.address', assetAddress)
    .orderBy('asset.standard', 'ASC');

    return this.parserResult(result);
  }

  async getRecordsMissingMetadataByStandard(tokenStandard: string) {
    const results = await this.model.query()
      .withGraphJoined('asset')
      .withGraphJoined('nft')
      .where(function (this: QueryBuilder<BalanceModel>) {
        this.where('asset.standard', tokenStandard);
        this.where('nft.metadata', null);
      });

    return this.parserResult(results);
  }

  async getFirstBalanceByAssetAddress(
    assetAddress: string,
  ) {

    const result = await this.model.query()
    .withGraphJoined('asset')
    .withGraphJoined('nft')
    .where(function (this: QueryBuilder<BalanceModel>) {
      this.where('balance.asset_address', assetAddress);
    })
    .first()

    return this.parserResult(result);
  }

  async increaseFungibleTokenHolderBalance(tokenHolder: string, tokenAddress: string, network: string, amount: string, event: any, hideChangeLog: boolean) {
    let holderRecordExists = await this.getBalanceByAssetAndHolder(tokenAddress, tokenHolder, network);

    if(holderRecordExists) {
      // update existing record

      const newBalance = new BigNumber(holderRecordExists.balance).plus(new BigNumber(amount));

      if(!hideChangeLog) {
        createLog(`Increasing balance of holder ${tokenHolder} of token contract ${tokenAddress} from ${holderRecordExists.balance} to ${newBalance} (${holderRecordExists.balance} + ${amount})`)
      }

      // update balance
      await this.model.query().update({'balance': newBalance.toString()}).where(function (this: QueryBuilder<BalanceModel>) {
        this.where('network_name', network);
        this.where('asset_address', tokenAddress);
        this.where('holder_address', tokenHolder);
      })

    } else {
      // create new record
      if(!hideChangeLog) {
        createLog(`Setting balance of holder ${tokenHolder} of token contract ${tokenAddress} to ${amount}`)
      }
      await this.create({
        network_name: network,
        asset_address: tokenAddress,
        holder_address: tokenHolder,
        balance: amount,
      });
    }
  }

  async decreaseFungibleTokenHolderBalance(tokenHolder: string, tokenAddress: string, network: string, amount: string, event: any, hideChangeLog: boolean) {
    let currentRecord = await this.getBalanceByAssetAndHolder(tokenAddress, tokenHolder, network);

    if(!currentRecord && !hideChangeLog) {
      createLog(`Trying to decrease balance of holder ${tokenHolder} of token contract ${tokenAddress} from ${currentRecord?.balance} to (${currentRecord?.balance} - ${amount})`, { event })
    }

    const newBalance = new BigNumber(currentRecord.balance).minus(new BigNumber(amount));

    if(!hideChangeLog) {
      createLog(`Decreasing balance of holder ${tokenHolder} of token contract ${tokenAddress} from ${currentRecord.balance} to ${newBalance} (${currentRecord.balance} - ${amount})`)
    }

    // update balance
    if(new BigNumber(newBalance).toNumber() === 0) {
      await this.model.query().delete().where(function (this: QueryBuilder<BalanceModel>) {
        this.where('asset_address', tokenAddress);
        this.where('holder_address', tokenHolder);
        this.where('network_name', network);
      })
    } else {
      await this.model.query().update({'balance': newBalance.toString()}).where(function (this: QueryBuilder<BalanceModel>) {
        this.where('asset_address', tokenAddress);
        this.where('holder_address', tokenHolder);
        this.where('network_name', network);
      })
    }
  }

  async increaseNonFungibleTokenHolderBalance(tokenHolder: string, tokenAddress: string, tokenId: string, network: string, timestamp: string, createNft: boolean, hideChangeLog: boolean) {
    let nftRecordExists = await NFTRepository.getNftByAddressAndNetworkAndTokenId(tokenAddress, tokenId, network);

    if(!nftRecordExists && createNft) {
      try {
        let nftFingerprint = `${network}-${tokenAddress}-${tokenId}`
        await NFTRepository.create({
          network_name: network,
          asset_address: tokenAddress,
          token_id: tokenId,
          mint_timestamp: timestamp,
          nft_fingerprint: nftFingerprint,
        })
      } catch (e) {
        createErrorLog("Unable to create NFT record", e);
      }
    }

    let holderRecordExists = await this.getBalanceByAssetAndTokenIdAndHolder(tokenAddress, tokenHolder, tokenId, network);

    if(holderRecordExists) {
      // update existing record

      const newBalance = new BigNumber(holderRecordExists.balance).plus(new BigNumber(1));

      if(!hideChangeLog) {
        createLog(`Increasing balance of holder ${tokenHolder} of token contract ${tokenAddress} of token ID ${tokenId} from ${holderRecordExists.balance} to ${newBalance} (${holderRecordExists.balance} + 1)`)
      }

      // update balance
      await this.model.query().update({'balance': newBalance.toString()}).where(function (this: QueryBuilder<BalanceModel>) {
        this.where('network_name', network);
        this.where('asset_address', tokenAddress);
        this.where('holder_address', tokenHolder);
        this.where('token_id', tokenId);
      })

    } else {
      // create new record
      if(!hideChangeLog) {
        createLog(`Setting balance of holder ${tokenHolder} of token contract ${tokenAddress} of token ID ${tokenId} to 1`)
      }
      await this.create({
        network_name: network,
        asset_address: tokenAddress,
        token_id: tokenId,
        holder_address: tokenHolder,
        balance: 1,
      });
    }
  }

  async decreaseNonFungibleTokenHolderBalance(tokenHolder: string, tokenAddress: string, tokenId: string, network: string, timestamp: string, hideChangeLog: boolean) {

    let currentBalanceRecord = await this.getBalanceByAssetAndTokenIdAndHolder(tokenAddress, tokenHolder, tokenId, network);

    if(!currentBalanceRecord && !hideChangeLog) {
      createLog(`Trying to decrease balance of holder ${tokenHolder} of token contract ${tokenAddress} of token ID ${tokenId} from ${currentBalanceRecord?.balance} to (${currentBalanceRecord?.balance} - 1)`, {event})
    }

    const newBalance = new BigNumber(currentBalanceRecord.balance).minus(new BigNumber(1));

    if(!hideChangeLog) {
      createLog(`Decreasing balance of holder ${tokenHolder} of token contract ${tokenAddress} of token ID ${tokenId} from ${currentBalanceRecord.balance} to ${newBalance} (${currentBalanceRecord.balance} - 1)`)
    }

    // update balance
    if(new BigNumber(newBalance).toNumber() === 0) {
      await this.model.query().delete().where(function (this: QueryBuilder<BalanceModel>) {
        this.where('asset_address', tokenAddress);
        this.where('holder_address', tokenHolder);
        this.where('network_name', network);
        this.where('token_id', tokenId);
      })
    } else {
      await this.model.query().update({'balance': newBalance.toString()}).where(function (this: QueryBuilder<BalanceModel>) {
        this.where('asset_address', tokenAddress);
        this.where('holder_address', tokenHolder);
        this.where('network_name', network);
        this.where('token_id', tokenId);
      })
    }
  }
  async clearRecordsByAssetAddress(assetAddress: string) {
    return await this.model.query().where(function (this: QueryBuilder<BalanceModel>) {
      this.where("asset_address", assetAddress);
    }).delete();
  }
  async getTalliedBalanceByHolderAndAsset(
    holderAddress: string,
    assetAddress: string,
    pagination: IPaginationRequest,
  ) {

    const { 
      perPage,
      page
    } = pagination;

    const result = await this.model.query()
    .select('holder_address')
    .count('holder_address as count')
    .join('asset', 'asset.address', 'balance.asset_address')
    .where(function (this: QueryBuilder<BalanceModel>) {
      this.where('holder_address', holderAddress);
      this.where('asset.address', assetAddress);
    })
    .groupBy('holder_address')
    .orderBy('count', 'DESC')
    .page(page - 1, perPage);

    return this.parserResult(result);
  }
  async getTalliedBalanceByAsset(
    assetAddress: string,
    pagination: IPaginationRequest,
  ) {

    const { 
      perPage,
      page
    } = pagination;

    const result = await this.model.query()
    .select('holder_address')
    .count('holder_address as count')
    .join('asset', 'asset.address', 'balance.asset_address')
    .where('asset.address', assetAddress)
    .groupBy('holder_address')
    .orderBy('count', 'DESC')
    .page(page - 1, perPage);

    return this.parserResult(result);
  }
}

export default new BalanceRepository()
