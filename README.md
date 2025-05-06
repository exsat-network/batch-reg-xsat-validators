
# Instructions

## Overview  
This guide covers the process of batch-generating client keystores and registering XSAT Validators.  
For more detailed instructions, visit the [XSAT Validator Guide](https://docs.exsat.network/guides-of-data-consensus/run-a-xsat-validator/run-multiple-xsat-validators).

---

## Environment Configuration  

1. Copy the example `.env` file and rename it to `.env`:  
   ```bash
   cp .env.example .env
   vim .env
   ```

2. Modify the `.env` file with the following configuration details:  
   - **`KEYSTORE_PATH`**: Directory to store the keystore files (e.g., `./keystores`).  
   - **`PRIVATE_KEY`**: The EVM address associated with this private key must have enough BTC for creating XSAT Validator accounts (0.0001 BTC per account).  
   - **`STAKER_REWARD_ADDRESS`**: The EVM address used for staking XSAT and refilling gas fees for XSAT Validators.  
   - **`ACCOUNT_PREFIX`**: Prefix for naming XSAT Validator accounts.  


---

## Install Dependencies and Batch Register  

   ```bash
   mkdir keystores
   yarn install
   yarn cracc
   ```
---

## Stake for Validators and Refill Gas Fees  

1. Open the [Validators Portal](https://portal.exsat.network/) and connect to the `STAKER_REWARD_ADDRESS`.  
2. Stake XSAT for each XSAT Validator account (2,100 XSAT per account).  
3. [Refill gas fees](https://docs.exsat.network/guides-of-data-consensus/others/operation-references/common-operations/refill-btc-for-gas-fees) for the XSAT Validators.  
   - **Gas Fee Note**: At the current gas price, each XSAT Validator requires ~0.0005 BTC per month for gas fees.  
4. Use the "Switch" button to toggle between different XSAT Validator accounts as needed.  

---

## Generate Docker Compose Configuration and Run Validators  

1. Modify the `ognize_cli.sh` script to customize Docker Compose configurations:  
   ```bash
   vim ognize_cli.sh
   ```

   Modify the contents after ":-" as needed:  
   ```bash
   # Default directory for keystores
   BASE_DIR="${1:-./keystores}"

   # Check if the directory exists
   if [ ! -d "$BASE_DIR" ]; then
     echo "Directory $BASE_DIR does not exist"
     exit 1
   fi

   # Default values (update as required)
   NETWORK=${NETWORK:-mainnet}
   EXSAT_RPC_URLS=${EXSAT_RPC_URLS:-'["https://rpc-us.exsat.network", "https://rpc-sg.exsat.network"]'}
   BTC_RPC_URL=${BTC_RPC_URL:-your_btc_rpc_url}
   BTC_RPC_USERNAME=${BTC_RPC_USERNAME:-user}
   BTC_RPC_PASSWORD=${BTC_RPC_PASSWORD:-password}
   KEYSTORE_PASSWORD=${KEYSTORE_PASSWORD:-123456}
   ```

2. Make the script executable and generate the `docker-compose.yml` file:  
   ```bash
   chmod +x ognize_cli.sh
   ./ognize_cli.sh
   ```

3. Run the XSAT Validator nodes using Docker Compose:  
   ```bash
   cd keystores
   docker compose up -d
   ```
