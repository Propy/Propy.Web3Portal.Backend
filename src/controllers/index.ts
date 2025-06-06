// Public controllers
import AuthController from './AuthController';
import BalanceController from './BalanceController';
import AssetController from './AssetController';
import NFTController from './NFTController';
import ApiController from './ApiController';
import SignatureController from './SignatureController';
import BridgeController from './BridgeController';
import StakeController from './StakeController';
import GasEstimateController from './GasEstimateController';
import TimeseriesController from './TimeseriesController';
import OnchainProxyController from './OnchainProxyController';
import GeoController from './GeoController';
import ListingController from './ListingController';
import PaymasterController from './PaymasterController';
import MerkleController from './MerkleController';

// Authed controllers
import AdminController from './AdminController';

export default {
  AuthController,
  BalanceController,
  AssetController,
  NFTController,
  ApiController,
  SignatureController,
  BridgeController,
  StakeController,
  GasEstimateController,
  TimeseriesController,
  OnchainProxyController,
  GeoController,
  ListingController,
  MerkleController,
  // Paymaster
  PaymasterController,
  // Authed
  AdminController,
};
