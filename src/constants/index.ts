import dotenv from "dotenv";

dotenv.config();

// App
export const APP_ENV = process.env.APP_ENV || "prod";

// Web3
export const ALCHEMY_API_KEY_ETHEREUM = process.env['ALCHEMY_API_KEY_ETHEREUM'];
export const ALCHEMY_API_KEY_OPTIMISM = process.env['ALCHEMY_API_KEY_OPTIMISM'];
export const ALCHEMY_API_KEY_ARBITRUM = process.env['ALCHEMY_API_KEY_ARBITRUM'];
export const ALCHEMY_API_KEY_GOERLI = process.env['ALCHEMY_API_KEY_GOERLI'];
export const ALCHEMY_API_KEY_SEPOLIA = process.env['ALCHEMY_API_KEY_SEPOLIA'];

export const NETWORK_TO_ALCHEMY_ENDPOINT: {[key: string]: string} = {
  "ethereum": `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY_ETHEREUM}`,
  "arbitrum": `https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY_ARBITRUM}`,
  "goerli": `https://eth-goerli.g.alchemy.com/v2/${ALCHEMY_API_KEY_GOERLI}`,
  "sepolia": `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY_SEPOLIA}`,
}

// Block Explorers
export const ETHERSCAN_API_KEY = process.env['ETHERSCAN_API_KEY'];
export const ARBISCAN_API_KEY = process.env['ARBISCAN_API_KEY'];

// JWT
export const JWT_SECRET_ADMIN = process.env["JWT_SECRET_ADMIN"];
export const JWT_SECRET_USER = process.env["JWT_SECRET_USER"];

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

export const NETWORK_TO_MAX_BLOCK_BATCH_SIZE_TRANSFERS : {[key: string]: number} = {
  "ethereum": 25000,
  "arbitrum": 300000,
  "optimism": 300000,
  "goerli": 25000,
  "sepolia": 25000,
}

export const MINTING_EVENT_OVERRIDE_TX_HASHES = [
  "0x414d8b8d96df922b00ba5578e7c3d5c98efb41cbf134ac7d5e1944852fb7d070"
];

export const debugMode = false;