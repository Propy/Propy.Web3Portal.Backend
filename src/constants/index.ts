import dotenv from "dotenv";

dotenv.config();

// App
export const APP_ENV = process.env.APP_ENV || "prod";

// Web3
// export const ALCHEMY_API_KEY_ETHEREUM = process.env['ALCHEMY_API_KEY_ETHEREUM'];
export const ALCHEMY_API_KEY_ETHEREUM = "5UBWkhjaAHyyIysY3t4Jr7VtT_KLW52y";
export const ALCHEMY_API_KEY_OPTIMISM = process.env['ALCHEMY_API_KEY_OPTIMISM'];
export const ALCHEMY_API_KEY_ARBITRUM = process.env['ALCHEMY_API_KEY_ARBITRUM'];
export const ALCHEMY_API_KEY_GOERLI = process.env['ALCHEMY_API_KEY_GOERLI'];
export const ALCHEMY_API_KEY_SEPOLIA = process.env['ALCHEMY_API_KEY_SEPOLIA'];

export const QUICKNODE_API_KEY_ETHEREUM = process.env['QUICKNODE_API_KEY_ETHEREUM'];
export const QUICKNODE_API_KEY_ARBITRUM = process.env['QUICKNODE_API_KEY_ARBITRUM'];
export const QUICKNODE_API_KEY_GOERLI = process.env['QUICKNODE_API_KEY_GOERLI'];
export const QUICKNODE_API_KEY_SEPOLIA = process.env['QUICKNODE_API_KEY_SEPOLIA'];

export const NETWORK_TO_ALCHEMY_ENDPOINT: {[key: string]: string} = {
  "ethereum": `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY_ETHEREUM}`,
  "arbitrum": `https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY_ARBITRUM}`,
  "goerli": `https://eth-goerli.g.alchemy.com/v2/${ALCHEMY_API_KEY_GOERLI}`,
  "sepolia": `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY_SEPOLIA}`,
}

export const NETWORK_TO_QUICKNODE_ENDPOINT: {[key: string]: string} = {
  "ethereum": `https://fittest-cosmological-grass.quiknode.pro/${QUICKNODE_API_KEY_ETHEREUM}/`,
  "arbitrum": `https://methodical-cosmological-county.arbitrum-mainnet.quiknode.pro/${QUICKNODE_API_KEY_ARBITRUM}/`,
  "goerli": `https://prettiest-proportionate-dinghy.ethereum-goerli.quiknode.pro/${QUICKNODE_API_KEY_GOERLI}/`,
  "sepolia": `https://wandering-light-lambo.ethereum-sepolia.quiknode.pro/${QUICKNODE_API_KEY_SEPOLIA}/`,
}

export const PROVIDER_MODE = "alchemy";

export const NETWORK_TO_ENDPOINT_ALL_PROVIDERS: {[key: string]: {[key: string]: string}} = {
  alchemy: NETWORK_TO_ALCHEMY_ENDPOINT,
  quicknode: NETWORK_TO_QUICKNODE_ENDPOINT,
}

export const NETWORK_TO_ENDPOINT = NETWORK_TO_ENDPOINT_ALL_PROVIDERS[PROVIDER_MODE];

// Block Explorers
export const ETHERSCAN_API_KEY = process.env['ETHERSCAN_API_KEY'];
export const ARBISCAN_API_KEY = process.env['ARBISCAN_API_KEY'];

// JWT
export const JWT_SECRET_ADMIN = process.env["JWT_SECRET_ADMIN"];
export const JWT_SECRET_USER = process.env["JWT_SECRET_USER"];
export const JWT_AUTO_RENEW_THRESHOLD_SECONDS = 120; // 120 seconds
export const JWT_ADMIN_LIFETIME_SECONDS = 60 * 5; // 5 Minutes

// CoinGecko
export const COINGECKO_API_KEY = process.env['COINGECKO_API_KEY'];

export const networkToCoingeckoId: {[key: string]: string} = {
  "arbitrum": "arbitrum-one",
  "ethereum": "ethereum",
  "optimism": "optimistic-ethereum",
  "canto": "canto",
}

export const networkToBaseAssetId: {[key: string]: string} = {
  "arbitrum": "ethereum",
  "ethereum": "ethereum",
  "optimism": "optimism",
  "canto": "canto",
}

export const baseAssetIdToSymbol: {[key: string]: string} = {
  "arbitrum": "ETH",
  "ethereum": "ETH",
  "optimism": "OP",
  "canto": "CANTO",
}

export const baseAssetSymbolToCoingeckoId: {[key: string]: string} = {
  "ETH": "ethereum",
  "OP": "optimism",
  "CANTO": "canto",
}

export const NETWORK_TO_MAX_BLOCK_BATCH_SIZE_TRANSFERS_ALCHEMY : {[key: string]: number} = {
  "ethereum": 25000,
  "arbitrum": 300000,
  "optimism": 300000,
  "goerli": 25000,
  "sepolia": 25000,
}

export const NETWORK_TO_MAX_BLOCK_BATCH_SIZE_TRANSFERS_QUICKNODE : {[key: string]: number} = {
  "ethereum": 10000,
  "arbitrum": 10000,
  "optimism": 10000,
  "goerli": 10000,
  "sepolia": 10000,
}

export const NETWORK_TO_MAX_BLOCK_BATCH_SIZE_TRANSFERS_ALL_NETWORKS : {[key: string]: {[key: string]: number}} = {
  alchemy: NETWORK_TO_MAX_BLOCK_BATCH_SIZE_TRANSFERS_ALCHEMY,
  quicknode: NETWORK_TO_MAX_BLOCK_BATCH_SIZE_TRANSFERS_QUICKNODE,
}

export const PROVIDER_MODE_TO_MAX_RPC_BATCH_SIZE = {
  alchemy: 15,
  quicknode: 100,
}

export const MAX_RPC_BATCH_SIZE = PROVIDER_MODE_TO_MAX_RPC_BATCH_SIZE[PROVIDER_MODE];

export const NETWORK_TO_MAX_BLOCK_BATCH_SIZE_TRANSFERS = NETWORK_TO_MAX_BLOCK_BATCH_SIZE_TRANSFERS_ALL_NETWORKS[PROVIDER_MODE];

export const MINTING_EVENT_OVERRIDE_TX_HASHES = [
  "0x414d8b8d96df922b00ba5578e7c3d5c98efb41cbf134ac7d5e1944852fb7d070"
];

export const debugMode = false;