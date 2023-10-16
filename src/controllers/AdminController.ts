import { validationResult } from "express-validator";
import e, { Request, Response } from 'express';
import { utils } from "ethers";

import BigNumber from 'bignumber.js';

import {
  getTokenInfoERC20
} from '../web3/jobs';

import {
  AssetRepository,
  SyncTrackRepository,
  MetadataSyncTrackRepository,
  SyncPerformanceLogRepository,
  SystemReportRepository,
  BalanceRepository,
  NFTRepository,
} from '../database/repositories';

import {
  IAssetRecordDB,
  IMixedBalancesResult,
  IOwnedBalancesResult,
} from '../interfaces';

import {
	createLog,
  createErrorLog,
} from '../logger';

import {
	fullSyncTransfersAndBalancesERC20
} from '../tasks/full-sync-transfers-and-balances-erc20';

import {
	fullSyncTransfersAndBalancesERC721
} from '../tasks/full-sync-transfers-and-balances-erc721';

import {
	sanityCheckTokenMetadata
} from '../tasks/sanity-check-token-metadata';

import Controller from './Controller';

BigNumber.config({ EXPONENTIAL_AT: [-1e+9, 1e+9] });

class AdminController extends Controller {
  async runFullSync(req: Request, res: Response) {
    const errors = await validationResult(req);
    if (!errors.isEmpty()) {
      if(errors.array().find((item) => item.param === "authorization")) {
        return this.sendResponse(res, {errors: errors.array()}, "Expired or invalid JWT", 403);
      }
      return this.sendResponse(res, {errors: errors.array()}, "Validation error", 422);
    }

    const payload = req.body;

    const {
      contract_address,
    } = payload;

    // TODO full sync trigger logic

    return this.sendResponse(res, {contract_address});

  }
  async triggerResyncLight(req: Request, res: Response) {
    let startTime = new Date().getTime();

    const errors = await validationResult(req);
    if (!errors.isEmpty()) {
      if(errors.array().find((item) => item.param === "authorization")) {
        return this.sendResponse(res, {errors: errors.array()}, "Expired or invalid JWT", 403);
      }
      return this.sendResponse(res, {errors: errors.array()}, "Validation error", 422);
    }

    const payload = req.body;

    const {
      contract_address,
    } = payload;

    let checksumAddress = '';
    try {
      checksumAddress = utils.getAddress(contract_address);
    } catch (error) {
      this.sendError(res, 'Invalid Address');
      return;
    }

    try {

      // get asset record
      let assetRecord = await AssetRepository.findByColumn('address', checksumAddress);

      if(assetRecord) {
        // check if sync is currently in progress
        let assetSyncTrackRecord = await SyncTrackRepository.findByColumn('contract_address', checksumAddress);
        if(!assetSyncTrackRecord || !assetSyncTrackRecord.in_progress) {

          this.sendResponse(res, { resync_triggered: true });

          if(assetSyncTrackRecord) {
            // set latest_block_synced to 0 to restart the sync process, also sets latest_block_timestamp to current time for the sake of seeing when the refresh started
            await SyncTrackRepository.update({latest_block_synced: 0, latest_block_timestamp: Math.floor(new Date().getTime() / 1000)}, assetSyncTrackRecord.id);
          }

          // clear any nft / nft_metadata / sync_track / metadata_sync_track / balance records associated with this checksumAddress
          let balanceRecordsDeleted = await BalanceRepository.clearRecordsByAssetAddress(checksumAddress);
          createLog({balanceRecordsDeleted});

          if(assetRecord.standard === 'ERC-20') {
            createLog("Resyncing asset");
            let postgresTimestamp = Math.floor(new Date().setSeconds(0) / 1000);
            await fullSyncTransfersAndBalancesERC20(assetRecord, postgresTimestamp);
          } else if (assetRecord.standard === 'ERC-721') {
            let nftRecordsDeleted = await NFTRepository.clearRecordsByAssetAddress(checksumAddress);
            createLog({nftRecordsDeleted});
            createLog("Resyncing asset");
            let postgresTimestamp = Math.floor(new Date().setSeconds(0) / 1000);
            await fullSyncTransfersAndBalancesERC721(assetRecord, postgresTimestamp);
          }

          let execTimeSeconds = Math.floor((new Date().getTime() - startTime) / 1000);

          await SyncPerformanceLogRepository.create({name: `manual-resync-${checksumAddress}`, sync_duration_seconds: execTimeSeconds});

          createLog(`SUCCESS: Resync on ${checksumAddress}, exec time: ${execTimeSeconds} seconds, finished at ${new Date().toISOString()}`)

        } else {
          this.sendError(res, 'Sync currently in progress');
          return;
        }
      } else {
        this.sendError(res, 'Asset not found');
        return;
      }

    } catch (e) {
      createErrorLog(`FAILURE: Resync on ${checksumAddress}, exec time: ${Math.floor((new Date().getTime() - startTime) / 1000)} seconds, finished at ${new Date().toISOString()}`, e)
    }

  }
  async getAssetSyncTrack(req: Request, res: Response) {
    const errors = await validationResult(req);
    if (!errors.isEmpty()) {
      if(errors.array().find((item) => item.param === "authorization")) {
        return this.sendResponse(res, {errors: errors.array()}, "Expired or invalid JWT", 403);
      }
      return this.sendResponse(res, {errors: errors.array()}, "Validation error", 422);
    }

    let results = await SyncTrackRepository.query().withGraphJoined('asset')

    this.sendResponse(res, results);
  }
  async cancelSync(req: Request, res: Response) {
    let startTime = new Date().getTime();

    const errors = await validationResult(req);
    if (!errors.isEmpty()) {
      if(errors.array().find((item) => item.param === "authorization")) {
        return this.sendResponse(res, {errors: errors.array()}, "Expired or invalid JWT", 403);
      }
      return this.sendResponse(res, {errors: errors.array()}, "Validation error", 422);
    }

    const payload = req.body;

    const {
      contract_address,
      network,
      meta,
    } = payload;

    let checksumAddress = '';
    try {
      checksumAddress = utils.getAddress(contract_address);
    } catch (error) {
      this.sendError(res, 'Invalid Address');
      return;
    }

    try {

      // get asset record
      let assetRecord = await AssetRepository.findByColumn('address', checksumAddress);

      if(assetRecord) {
        // check if sync is currently in progress
        let assetSyncTrackRecord = await SyncTrackRepository.getSyncTrack(checksumAddress, network, meta);
        if (assetSyncTrackRecord) {
          await SyncTrackRepository.update({in_progress: false}, assetSyncTrackRecord.id);
          this.sendResponse(res, { sync_cancelled: true });
        }
      } else {
        this.sendError(res, 'Asset not found');
        return;
      }

    } catch (e) {
      createErrorLog(`FAILURE: Cancel sync on ${checksumAddress}, exec time: ${Math.floor((new Date().getTime() - startTime) / 1000)} seconds, finished at ${new Date().toISOString()}`, e)
    }

  }
  async getMetadataSyncTrack(req: Request, res: Response) {
    const errors = await validationResult(req);
    if (!errors.isEmpty()) {
      if(errors.array().find((item) => item.param === "authorization")) {
        return this.sendResponse(res, {errors: errors.array()}, "Expired or invalid JWT", 403);
      }
      return this.sendResponse(res, {errors: errors.array()}, "Validation error", 422);
    }

    let results = await MetadataSyncTrackRepository.query();

    this.sendResponse(res, results);
  }
  async getSystemReport(req: Request, res: Response) {
    const errors = await validationResult(req);
    if (!errors.isEmpty()) {
      if(errors.array().find((item) => item.param === "authorization")) {
        return this.sendResponse(res, {errors: errors.array()}, "Expired or invalid JWT", 403);
      }
      return this.sendResponse(res, {errors: errors.array()}, "Validation error", 422);
    }

    const payload = req.body;

    const {
      report_name
    } = payload;

    let results = await SystemReportRepository.findByColumn('name', report_name);

    this.sendResponse(res, results);
  }
  async generateSystemReport(req: Request, res: Response) {
    const errors = await validationResult(req);
    if (!errors.isEmpty()) {
      if(errors.array().find((item) => item.param === "authorization")) {
        return this.sendResponse(res, {errors: errors.array()}, "Expired or invalid JWT", 403);
      }
      return this.sendResponse(res, {errors: errors.array()}, "Validation error", 422);
    }

    const payload = req.body;

    const {
      report_name
    } = payload;

    try {

      switch(report_name) {
        case "sanity-check-token-metadata-id-alignment":
          await sanityCheckTokenMetadata();
          break;
      }

      this.sendResponse(res, {generated: true});
      return;

    } catch (e) {
      this.sendError(res, 'Error generating report');
      return;
    }

  }
  async getSyncPerformanceLogTimeseries(req: Request, res: Response) {
    const errors = await validationResult(req);
    if (!errors.isEmpty()) {
      if(errors.array().find((item) => item.param === "authorization")) {
        return this.sendResponse(res, {errors: errors.array()}, "Expired or invalid JWT", 403);
      }
      return this.sendResponse(res, {errors: errors.array()}, "Validation error", 422);
    }

    const payload = req.body;

    const {
      metric_name
    } = payload;

    let results = await SyncPerformanceLogRepository.getTimeseries(metric_name);

    this.sendResponse(res, results);
  }
}

export default AdminController;