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
  BaseBridgeContractRepository,
  BaseWithdrawalInitiatedEventRepository,
  BaseDepositBridgeInitiatedEventRepository,
} from '../database/repositories';

import {
	fullSyncBaseBridge
} from '../tasks/full-sync-base-bridge';

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
  NETWORK_ID_TO_BASE_L1_OPTIMISM_PORTAL_ADDRESS,
  NETWORK_ID_TO_BASE_L1_STANDARD_BRIDGE,
  NETWORK_ID_TO_BASE_L2_STANDARD_BRIDGE,
} from '../constants';

import BalanceOutputTransformer from '../database/transformers/balance/output';
import BaseWithdrawalInitiatedEventOutputTransformer from '../database/transformers/withdrawal-initiated-event/output';
import BaseDepositBridgeInitiatedEventOutputTransformer from '../database/transformers/deposit-bridge-initiated-event/output';

import Controller from './Controller';

BigNumber.config({ EXPONENTIAL_AT: [-1e+9, 1e+9] });

class BridgeController extends Controller {
  async triggerBridgeSync(req: Request, res: Response) {

    const errors = await validationResult(req);
    if (!errors.isEmpty()) {
      return this.sendResponse(res, {errors: errors.array()}, "Validation error", 422);
    }

    const payload = req.body;

    const {
      l1_network: l1Network,
      l2_network: l2Network,
    } = payload;

    if(l1Network && l2Network) {

      let trackedBaseBridgeContractsL1 = await BaseBridgeContractRepository.getSyncContractsByNetwork(l1Network.toString());

      if(!trackedBaseBridgeContractsL1 || trackedBaseBridgeContractsL1.length === 0) {
        this.sendError(res, 'Invalid L1 Network');
        return;
      }

      let trackedBaseBridgeContractsL2 = await BaseBridgeContractRepository.getSyncContractsByNetwork(l2Network.toString());

      if(!trackedBaseBridgeContractsL2 || trackedBaseBridgeContractsL2.length === 0) {
        this.sendError(res, 'Invalid L2 Network');
        return;
      }

      let trackedBaseBridgeContracts = [...trackedBaseBridgeContractsL1, ...trackedBaseBridgeContractsL2];

      let trackedBaseBridgeContractProgress = 1;
      for(let trackedBaseBridgeContract of trackedBaseBridgeContracts) {
        createLog(`Syncing ${trackedBaseBridgeContract.address} - ${trackedBaseBridgeContract.meta} - ${trackedBaseBridgeContract.network_name} - ${trackedBaseBridgeContractProgress} of ${trackedBaseBridgeContracts.length} Base Bridge contract(s)`);
        let postgresTimestamp = Math.floor(new Date().setSeconds(0) / 1000);
        await fullSyncBaseBridge(trackedBaseBridgeContract, postgresTimestamp);
      }

      this.sendResponse(res, { success: true });

    } else {
      this.sendError(res, 'L1 Network & L2 Network Required');
      return;
    }

  }
  async getBaseBridgeTransactionByTransactionHash(req: Request, res: Response) {

    const {
      l1Network,
      l2Network,
      transactionHash,
    } = req.query;

    if(l1Network && l2Network && transactionHash) {

      let l1OptimismPortalAddress;
      if(l1Network && NETWORK_ID_TO_BASE_L1_OPTIMISM_PORTAL_ADDRESS[l1Network.toString()]) {
        l1OptimismPortalAddress = NETWORK_ID_TO_BASE_L1_OPTIMISM_PORTAL_ADDRESS[l1Network.toString()];
      }
      if(!l1OptimismPortalAddress) {
        this.sendError(res, 'Invalid L1 Optimism Portal Address');
        return;
      }

      let l1StandardBridgeAddress;
      if(l1Network && NETWORK_ID_TO_BASE_L1_STANDARD_BRIDGE[l1Network.toString()]) {
        l1StandardBridgeAddress = NETWORK_ID_TO_BASE_L1_STANDARD_BRIDGE[l1Network.toString()];
      }
      if(!l1StandardBridgeAddress) {
        this.sendError(res, 'Invalid L1 Standard Bridge Address');
        return;
      }

      let l2StandardBridgeAddress;
      if(l2Network && NETWORK_ID_TO_BASE_L2_STANDARD_BRIDGE[l2Network.toString()]) {
        l2StandardBridgeAddress = NETWORK_ID_TO_BASE_L2_STANDARD_BRIDGE[l2Network.toString()];
      }
      if(!l2StandardBridgeAddress) {
        this.sendError(res, 'Invalid L2 Standard Bridge Address');
        return;
      }

      let bridgeTransaction = await BaseWithdrawalInitiatedEventRepository.fetchAllWithdrawalInitiatedEventsByTransactionHash(
        l2Network.toString(),
        l2StandardBridgeAddress,
        transactionHash.toString(),
        BaseWithdrawalInitiatedEventOutputTransformer,
      );

      this.sendResponse(res, bridgeTransaction ? bridgeTransaction : {});

    } else {
      this.sendError(res, 'Missing query parameter(s)');
    }

  }
  async getBaseBridgeOverviewByAccountAndTokenAddresses(req: Request, res: Response) {

    const {
      l1Network,
      l2Network,
      accountAddress,
      l1TokenAddress,
      l2TokenAddress,
    } = req.query;

    if(accountAddress && l1TokenAddress && l2TokenAddress && l1Network && l2Network) {

      let checksumAccountAddress = '';
      try {
        checksumAccountAddress = utils.getAddress(accountAddress.toString());
      } catch (error) {
        this.sendError(res, 'Invalid Address');
        return;
      }

      let checksumL1TokenAddress = '';
      try {
        checksumL1TokenAddress = utils.getAddress(l1TokenAddress.toString());
      } catch (error) {
        this.sendError(res, 'Invalid Address');
        return;
      }

      let checksumL2TokenAddress = '';
      try {
        checksumL2TokenAddress = utils.getAddress(l2TokenAddress.toString());
      } catch (error) {
        this.sendError(res, 'Invalid Address');
        return;
      }

      // Get L1 token record
      let l1AssetRecord = await AssetRepository.getAssetByAddressAndNetwork(checksumL1TokenAddress, l1Network.toString())
      if(!l1AssetRecord) {
        this.sendError(res, 'Invalid L1 Asset');
        return;
      }

      // Get L2 token record
      let l2AssetRecord = await AssetRepository.getAssetByAddressAndNetwork(checksumL2TokenAddress, l2Network.toString())
      if(!l2AssetRecord) {
        this.sendError(res, 'Invalid L2 Asset');
        return;
      }

      let l1OptimismPortalAddress;
      if(l1Network && NETWORK_ID_TO_BASE_L1_OPTIMISM_PORTAL_ADDRESS[l1Network.toString()]) {
        l1OptimismPortalAddress = NETWORK_ID_TO_BASE_L1_OPTIMISM_PORTAL_ADDRESS[l1Network.toString()];
      }
      if(!l1OptimismPortalAddress) {
        this.sendError(res, 'Invalid L1 Optimism Portal Address');
        return;
      }

      let l1StandardBridgeAddress;
      if(l1Network && NETWORK_ID_TO_BASE_L1_STANDARD_BRIDGE[l1Network.toString()]) {
        l1StandardBridgeAddress = NETWORK_ID_TO_BASE_L1_STANDARD_BRIDGE[l1Network.toString()];
      }
      if(!l1StandardBridgeAddress) {
        this.sendError(res, 'Invalid L1 Standard Bridge Address');
        return;
      }

      let l2StandardBridgeAddress;
      if(l2Network && NETWORK_ID_TO_BASE_L2_STANDARD_BRIDGE[l2Network.toString()]) {
        l2StandardBridgeAddress = NETWORK_ID_TO_BASE_L2_STANDARD_BRIDGE[l2Network.toString()];
      }
      if(!l2StandardBridgeAddress) {
        this.sendError(res, 'Invalid L2 Standard Bridge Address');
        return;
      }

      // Handle withdrawal events (L2 -> L1 events)
      // Order of withdrawal events: withdrawal initiated -> withdrawal proven -> withdrawal finalized

      let relevantWithdrawalInitiatedEvents = await BaseWithdrawalInitiatedEventRepository.fetchAllWithdrawalInitiatedEvents(
        l2Network.toString(),
        l2StandardBridgeAddress,
        checksumL1TokenAddress,
        checksumL2TokenAddress,
        checksumAccountAddress,
        checksumAccountAddress,
        BaseWithdrawalInitiatedEventOutputTransformer,
      );

      let relevantDepositBridgeInitiatedEvents = await BaseDepositBridgeInitiatedEventRepository.fetchAllDepositBridgeInitiatedEvents(
        l1Network.toString(),
        l1StandardBridgeAddress,
        checksumL1TokenAddress,
        checksumL2TokenAddress,
        checksumAccountAddress,
        checksumAccountAddress,
        BaseDepositBridgeInitiatedEventOutputTransformer,
      );

      const combinedResults = [...relevantWithdrawalInitiatedEvents, ...relevantDepositBridgeInitiatedEvents];
      combinedResults.sort((a, b) => a.timestamp - b.timestamp);

      this.sendResponse(res, combinedResults ? combinedResults : {});

    } else {
      this.sendError(res, 'Missing query parameter(s)');
    }

  }
  async getBaseBridgeDepositsOverviewByAccountAndTokenAddresses(req: Request, res: Response) {

    const {
      l1Network,
      l2Network,
      accountAddress,
      l1TokenAddress,
      l2TokenAddress,
    } = req.query;

    if(accountAddress && l1TokenAddress && l2TokenAddress && l1Network && l2Network) {

      let checksumAccountAddress = '';
      try {
        checksumAccountAddress = utils.getAddress(accountAddress.toString());
      } catch (error) {
        this.sendError(res, 'Invalid Address');
        return;
      }

      let checksumL1TokenAddress = '';
      try {
        checksumL1TokenAddress = utils.getAddress(l1TokenAddress.toString());
      } catch (error) {
        this.sendError(res, 'Invalid Address');
        return;
      }

      let checksumL2TokenAddress = '';
      try {
        checksumL2TokenAddress = utils.getAddress(l2TokenAddress.toString());
      } catch (error) {
        this.sendError(res, 'Invalid Address');
        return;
      }

      // Get L1 token record
      let l1AssetRecord = await AssetRepository.getAssetByAddressAndNetwork(checksumL1TokenAddress, l1Network.toString())
      if(!l1AssetRecord) {
        this.sendError(res, 'Invalid L1 Asset');
        return;
      }

      // Get L2 token record
      let l2AssetRecord = await AssetRepository.getAssetByAddressAndNetwork(checksumL2TokenAddress, l2Network.toString())
      if(!l2AssetRecord) {
        this.sendError(res, 'Invalid L2 Asset');
        return;
      }

      let l1OptimismPortalAddress;
      if(l1Network && NETWORK_ID_TO_BASE_L1_OPTIMISM_PORTAL_ADDRESS[l1Network.toString()]) {
        l1OptimismPortalAddress = NETWORK_ID_TO_BASE_L1_OPTIMISM_PORTAL_ADDRESS[l1Network.toString()];
      }
      if(!l1OptimismPortalAddress) {
        this.sendError(res, 'Invalid L1 Optimism Portal Address');
        return;
      }

      let l1StandardBridgeAddress;
      if(l1Network && NETWORK_ID_TO_BASE_L1_STANDARD_BRIDGE[l1Network.toString()]) {
        l1StandardBridgeAddress = NETWORK_ID_TO_BASE_L1_STANDARD_BRIDGE[l1Network.toString()];
      }
      if(!l1StandardBridgeAddress) {
        this.sendError(res, 'Invalid L1 Standard Bridge Address');
        return;
      }

      let l2StandardBridgeAddress;
      if(l2Network && NETWORK_ID_TO_BASE_L2_STANDARD_BRIDGE[l2Network.toString()]) {
        l2StandardBridgeAddress = NETWORK_ID_TO_BASE_L2_STANDARD_BRIDGE[l2Network.toString()];
      }
      if(!l2StandardBridgeAddress) {
        this.sendError(res, 'Invalid L2 Standard Bridge Address');
        return;
      }

      let relevantDepositBridgeInitiatedEvents = await BaseDepositBridgeInitiatedEventRepository.fetchAllDepositBridgeInitiatedEvents(
        l1Network.toString(),
        l1StandardBridgeAddress,
        checksumL1TokenAddress,
        checksumL2TokenAddress,
        checksumAccountAddress,
        checksumAccountAddress,
        BaseDepositBridgeInitiatedEventOutputTransformer,
      );

      this.sendResponse(res, relevantDepositBridgeInitiatedEvents ? relevantDepositBridgeInitiatedEvents : {});

    } else {
      this.sendError(res, 'Missing query parameter(s)');
    }

  }
  async getBaseBridgeWithdrawalsOverviewByAccountAndTokenAddresses(req: Request, res: Response) {

    const {
      l1Network,
      l2Network,
      accountAddress,
      l1TokenAddress,
      l2TokenAddress,
    } = req.query;

    if(accountAddress && l1TokenAddress && l2TokenAddress && l1Network && l2Network) {

      let checksumAccountAddress = '';
      try {
        checksumAccountAddress = utils.getAddress(accountAddress.toString());
      } catch (error) {
        this.sendError(res, 'Invalid Address');
        return;
      }

      let checksumL1TokenAddress = '';
      try {
        checksumL1TokenAddress = utils.getAddress(l1TokenAddress.toString());
      } catch (error) {
        this.sendError(res, 'Invalid Address');
        return;
      }

      let checksumL2TokenAddress = '';
      try {
        checksumL2TokenAddress = utils.getAddress(l2TokenAddress.toString());
      } catch (error) {
        this.sendError(res, 'Invalid Address');
        return;
      }

      // Get L1 token record
      let l1AssetRecord = await AssetRepository.getAssetByAddressAndNetwork(checksumL1TokenAddress, l1Network.toString())
      if(!l1AssetRecord) {
        this.sendError(res, 'Invalid L1 Asset');
        return;
      }

      // Get L2 token record
      let l2AssetRecord = await AssetRepository.getAssetByAddressAndNetwork(checksumL2TokenAddress, l2Network.toString())
      if(!l2AssetRecord) {
        this.sendError(res, 'Invalid L2 Asset');
        return;
      }

      let l1OptimismPortalAddress;
      if(l1Network && NETWORK_ID_TO_BASE_L1_OPTIMISM_PORTAL_ADDRESS[l1Network.toString()]) {
        l1OptimismPortalAddress = NETWORK_ID_TO_BASE_L1_OPTIMISM_PORTAL_ADDRESS[l1Network.toString()];
      }
      if(!l1OptimismPortalAddress) {
        this.sendError(res, 'Invalid L1 Optimism Portal Address');
        return;
      }

      let l1StandardBridgeAddress;
      if(l1Network && NETWORK_ID_TO_BASE_L1_STANDARD_BRIDGE[l1Network.toString()]) {
        l1StandardBridgeAddress = NETWORK_ID_TO_BASE_L1_STANDARD_BRIDGE[l1Network.toString()];
      }
      if(!l1StandardBridgeAddress) {
        this.sendError(res, 'Invalid L1 Standard Bridge Address');
        return;
      }

      let l2StandardBridgeAddress;
      if(l2Network && NETWORK_ID_TO_BASE_L2_STANDARD_BRIDGE[l2Network.toString()]) {
        l2StandardBridgeAddress = NETWORK_ID_TO_BASE_L2_STANDARD_BRIDGE[l2Network.toString()];
      }
      if(!l2StandardBridgeAddress) {
        this.sendError(res, 'Invalid L2 Standard Bridge Address');
        return;
      }

      let relevantWithdrawalInitiatedEvents = await BaseWithdrawalInitiatedEventRepository.fetchAllWithdrawalInitiatedEvents(
        l2Network.toString(),
        l2StandardBridgeAddress,
        checksumL1TokenAddress,
        checksumL2TokenAddress,
        checksumAccountAddress,
        checksumAccountAddress,
        BaseWithdrawalInitiatedEventOutputTransformer,
      );

      this.sendResponse(res, relevantWithdrawalInitiatedEvents ? relevantWithdrawalInitiatedEvents : {});

    } else {
      this.sendError(res, 'Missing query parameter(s)');
    }

  }
}

export default BridgeController;