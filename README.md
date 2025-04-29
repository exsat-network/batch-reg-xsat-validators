
## Instructions
### Overview
Batch generate client keystores and register xsat validators.
### Environment Configuration
  Copy the .env.example file and rename it to .env
  Modify the configuration information in the .env file, mainly configure network nodes and account private keys, and transfer enough test coins
#### Install Dependencies
```
yarn install 
```
### Batch Register
```
yarn cracc
```  

After generating the keystore, copy it to $HOME/.exsat on the server, then put the ognize_cli.sh script in it. Be sure to modify the parameters according to the network configuration, and the docker compose file will be automatically generated after execution.

Run docker compose up -d to start the service.
