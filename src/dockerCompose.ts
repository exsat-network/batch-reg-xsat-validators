#!/usr/bin/env ts-node

import { promises as fs } from 'fs';
import * as path from 'path';
import { BTC_RPC_URL, BTC_RPC_USERNAME, BTC_RPC_PASSWORD,  EXSAT_RPC_URLS ,NETWORK } from './constant';

async function organizeKeystoreFiles(folderPath: string): Promise<void> {
  // Read all files in the directory
  const files = await fs.readdir(folderPath);
  const validatorNames: string[] = [];

  // Regex pattern to match file format: [validator].sat_keystore.json
  const regex = /^(.+)\.sat_keystore\.json$/;

  for (const fileName of files) {
    const match = fileName.match(regex);
    if (!match) continue;

    const validator = match[1];
    validatorNames.push(validator);

    const validatorDir = path.join(folderPath, validator);
    // 1. Create a folder named after the validator (if it doesn't exist)
    try {
      await fs.access(validatorDir);
    } catch (err) {
      await fs.mkdir(validatorDir);
    }

    // 2. Move the file to the corresponding folder
    const oldPath = path.join(folderPath, fileName);
    const newPath = path.join(validatorDir, fileName);
    await fs.rename(oldPath, newPath);

    // 3. Create a .env file in the folder, replacing the [validator] placeholder
    const envContent =
      `
# mainnet config
# NETWORK = mainnet
# EXSAT_RPC_URLS = ["https://rpc-us.exsat.network","https://rpc-sg.exsat.network"] 
NETWORK=${NETWORK}
EXSAT_RPC_URLS=["${EXSAT_RPC_URLS}"]
BTC_RPC_URL=${BTC_RPC_URL}
BTC_RPC_USERNAME=${BTC_RPC_USERNAME}
BTC_RPC_PASSWORD=${BTC_RPC_PASSWORD}
PROMETHEUS=false
PROMETHEUS_ADDRESS=0.0.0.0:9900
VALIDATOR_KEYSTORE_FILE=/app/.exsat/${validator}.sat_keystore.json
VALIDATOR_KEYSTORE_PASSWORD=123456
`.trim() + '\n';

    await fs.writeFile(path.join(validatorDir, '.env'), envContent, 'utf8');
  }

  // 5. Create a docker-compose.yml file in the original folder path
  let composeContent = `version: '3.8'

services:
`;

  // Add a service for each validator
  for (const validator of validatorNames) {
    composeContent += `
  ${validator}:
    image: exsatnetwork/validator:latest
    volumes:
      - $HOME/.exsat/${validator}/.env:/app/.env
      - $HOME/.exsat/${validator}/:/root/.exsat
    command: --run
    container_name: ${validator}
    logging:
      driver: "json-file"
      options:
        max-size: "5m"
`;
  }

  await fs.writeFile(path.join(folderPath, 'docker-compose.yml'), composeContent.trim() + '\n', 'utf8');
}

// Main execution
async function main() {
  // You can get the folder path from command line arguments, default is $HOME/.xsatstk
  const folderPath = process.argv[2] || path.join(process.env.HOME || '', '.xsatstk');

  try {
    await organizeKeystoreFiles(folderPath);
    console.log('Operation completed!');
  } catch (error) {
    console.error('Operation failed:', error);
  }
}

main();
