#!/bin/bash
set -e

# Default directory is $HOME/.exsat
BASE_DIR="${1:-./keystores}"

# Check if directory exists
if [ ! -d "$BASE_DIR" ]; then
  echo "Directory $BASE_DIR does not exist"
  exit 1
fi

# Set default values if not defined in .env
NETWORK=${NETWORK:-mainnet}
EXSAT_RPC_URLS=${EXSAT_RPC_URLS:-'["https://rpc-us.exsat.network", "https://rpc-sg.exsat.network"]'}
BTC_RPC_URL=${BTC_RPC_URL:-your_btc_rpc_url}
BTC_RPC_USERNAME=${BTC_RPC_USERNAME:-user}
BTC_RPC_PASSWORD=${BTC_RPC_PASSWORD:-password}
KEYSTORE_PASSWORD=${KEYSTORE_PASSWORD:-123456}

# Array to record all validator names
declare -a validators=()

# Function to process a keystore file (FORCE OVERWRITE MODE)
process_keystore() {
  local file="$1"
  local validator="$2"

  # 1. Create folder named after validator (FORCE)
  target_dir="$BASE_DIR/$validator"
  mkdir -p "$target_dir"  # -p ensures it won't fail if dir exists
  echo "Ensured directory: $target_dir"

  # 2. Move file to corresponding folder and rename to [validator]_keystore.json (FORCE)
  target_file="$target_dir/${validator}_keystore.json"
  if [ "$file" != "$target_file" ]; then
    mv -f "$file" "$target_file"  # -f forces overwrite
    echo "Moved/overwrote file $file to $target_file"
  fi

  # 3. Create .env file in the folder (FORCE OVERWRITE)
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
  echo "Overwrote .env file at $env_file"
}

# Find all keystore files in two possible locations:
# 1. Directly in BASE_DIR (*_keystore.json)
# 2. In subdirectories (subdir/*_keystore.json)

# Process keystore files in base directory
for file in "$BASE_DIR"/*_keystore.json; do
  # Skip if no files match
  [ -e "$file" ] || continue

  # Extract validator name
  filename=$(basename "$file")
  validator="${filename%%_keystore.json}"

  # Process this keystore
  process_keystore "$file" "$validator"

  # Add to validators array if not already present
  if [[ ! " ${validators[@]} " =~ " ${validator} " ]]; then
    validators+=("$validator")
  fi
done

# Process keystore files in subdirectories
for dir in "$BASE_DIR"/*/; do
  # Skip if no directories match
  [ -d "$dir" ] || continue

  for file in "$dir"*_keystore.json; do
    # Skip if no files match
    [ -e "$file" ] || continue

    # Extract validator name from directory name
    dirname=$(basename "$dir")
    validator="${dirname}"

    # Process this keystore
    process_keystore "$file" "$validator"

    # Add to validators array if not already present
    if [[ ! " ${validators[@]} " =~ " ${validator} " ]]; then
      validators+=("$validator")
    fi
  done
done

# 4. Create docker-compose.yml file in BASE_DIR (FORCE OVERWRITE)
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
      - ./${validator}:/app/.exsat
    command: ""
    logging:
      driver: "json-file"
      options:
        max-size: "5m"
EOF
done

echo "Generated docker-compose.yml at $compose_file"
echo "Operation completed!"
