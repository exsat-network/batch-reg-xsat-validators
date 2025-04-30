#!/bin/bash
set -e

# Default directory is $HOME/.exsat
BASE_DIR="${1:-$KEYSTORE_PATH}"

if [ -f "$BASE_DIR/.env" ]; then
  source "$BASE_DIR/.env"
fi

# Check if directory exists
if [ ! -d "$BASE_DIR" ]; then
  echo "Directory $BASE_DIR does not exist"
  exit 1
fi


# Set default values if not defined in .env
NETWORK=${NETWORK:-testnet}
EXSAT_RPC_URLS=${EXSAT_RPC_URLS:-'["https://chain-tst3.exactsat.io"]'}
BTC_RPC_URL=${BTC_RPC_URL:-https://testnet3b.exsat.network}
BTC_RPC_USERNAME=${BTC_RPC_USERNAME:-}
BTC_RPC_PASSWORD=${BTC_RPC_PASSWORD:-}


# Array to record all validator names
declare -a validators=()

# Iterate through files matching *.sat_keystore.json format
for file in "$BASE_DIR"/*.sat_keystore.json; do
  # Skip if no files match
  [ -e "$file" ] || continue

  # Extract validator name, assuming filename format is [validator].sat_keystore.json
  filename=$(basename "$file")
  validator="${filename%%.sat_keystore.json}"
  validators+=("$validator")

  # 1. Create folder named after validator (if it doesn't exist)
  target_dir="$BASE_DIR/$validator"
  if [ ! -d "$target_dir" ]; then
    mkdir "$target_dir"
    echo "Created directory: $target_dir"
  fi

  # 2. Move file to corresponding folder and rename to [validator]_keystore.json
  mv "$file" "$target_dir/${validator}_keystore.json"
  echo "Moved file $filename to $target_dir/${validator}_keystore.json"

  # 3. Create .env file in the folder with the following content:
  # Note: Removed extra lines, keeping only the configuration, and changed keystore file path to /app/.exsat/${validator}_keystore.json
  # Read from existing .env file if it exists, otherwise use defaults

  env_file="$target_dir/.env"
  cat > "$env_file" <<EOF
# Write the values to the new .env file
NETWORK=$NETWORK
EXSAT_RPC_URLS=$EXSAT_RPC_URLS
BTC_RPC_URL=$BTC_RPC_URL
BTC_RPC_USERNAME=$BTC_RPC_USERNAME
BTC_RPC_PASSWORD=$BTC_RPC_PASSWORD
PROMETHEUS=false
PROMETHEUS_ADDRESS=0.0.0.0:9900
VALIDATOR_KEYSTORE_FILE=/app/.exsat/${validator}_keystore.json
VALIDATOR_KEYSTORE_PASSWORD=$KEYSTORE_PASSWORD
EOF
  echo "Created .env file at $target_dir"
done

# 4. Create docker-compose.yml file in BASE_DIR
compose_file="$BASE_DIR/docker-compose.yml"
cat > "$compose_file" <<EOF
version: '3.8'

services:
EOF

# Add corresponding service for each validator
for validator in "${validators[@]}"; do
  cat >> "$compose_file" <<EOF

  ${validator}:
    image: exsatnetwork/exsat-client:latest
    container_name: ${validator}
    environment:
      - CLIENT_TYPE=validator
    volumes:
      - ${KEYSTORE_PATH}/${validator}/.env:/app/.exsat/.env
      - ${KEYSTORE_PATH}/${validator}/${validator}_keystore.json:/app/.exsat/${validator}_keystore.json
    command: ""
    logging:
      driver: "json-file"
      options:
        max-size: "5m"
EOF
done

echo "Generated docker-compose.yml at $BASE_DIR"
echo "Operation completed!"
