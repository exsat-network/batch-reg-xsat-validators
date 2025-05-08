import * as process from 'node:process';
import { config } from 'dotenv';
config();

export const NETWORK = process.env.NETWORK || 'mainnet';
export const KEYSTORE_PATH = process.env.KEYSTORE_PATH || './keystore_files';
export const KEYSTORE_PASSWORD = process.env.KEYSTORE_PASSWORD || '123456';
export const EXSAT_RPC_URLS = JSON.parse(process.env.EXSAT_RPC_URLS) || [];
export const EVM_RPC_URL = process.env.EVM_RPC_URL || '';
export const EVM_CHAIN_ID = process.env.EVM_CHAIN_ID || 1;

export const PRIVATE_KEY = process.env.PRIVATE_KEY || '';
export const STAKER_REWARD_ADDRESS = process.env.STAKER_REWARD_ADDRESS || '';

export const ACCOUNT_PREFIX = process.env.ACCOUNT_PREFIX || 'valid';
export const ACCOUNT_SUFFIX = process.env.ACCOUNT_SUFFIX || '.sat';
export const TOTAL: number = Number(process.env.TOTAL) || 10;
// export const DEPOSIT_AMOUNT = process.env.DEPOSIT_AMOUNT || '2100000000000000000000';

// logger config
export const LOGGER_MAX_SIZE: string = process.env.LOGGER_MAX_SIZE || '30m';
export const LOGGER_MAX_FILES: string = process.env.LOGGER_MAX_FILES || '30d';
export const LOGGER_DIR: string = process.env.LOGGER_DIR || 'logs';
export const VALID_CHARS = process.env.VALID_CHARS  || '12345abcdefghijklmnopqrstuvwxyz';

//export const XSAT_STAKE_HELPER_CONTRACT= process.env.XSAT_STAKE_HELPER_CONTRACT || "0x1c3d4a2f5b7e8c9f6b8e7a2d3c4f5e6b7a8c9d0e"

// export const BTC_RPC_URL = process.env.BTC_RPC_URL ||  "http://your-btc-rpc:8332"
// export const BTC_RPC_USERNAME=process.env.BTC_RPC_USERNAME || "exsat"
// export const BTC_RPC_PASSWORD=process.env.BTC_RPC_PASSWORD || "exsat"
