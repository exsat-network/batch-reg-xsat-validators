import {
  generateKeystore,
  getUserAccount,
  generateExsatAccounts,
  getIsRegisterValidator,
} from './account';
import { Web3 } from 'web3';
import {
  EVM_RPC_URL,
  PRIVATE_KEY,
  EXSAT_RPC_URLS,
  // XSAT_STAKE_HELPER_CONTRACT,
  EVM_CHAIN_ID,
  STAKER_REWARD_ADDRESS,
} from './constant';
// import { stakeHelperAbi } from './abi/StakeHelper';
// import { erc20Abi } from './abi/erc20';
// import { convertAddress } from './utils';
import ExsatApi from './exsat-api';
import * as fs from 'node:fs';
import { decryptKeystore, getKeystore } from './keystore';


// const tokens = {
//   tokenList: {
//     XSAT: {
//       symbol: 'XSAT',
//       address: '0x8266f2fbc720012e5Ac038aD3dbb29d2d613c459',
//       stake_address: XSAT_STAKE_HELPER_CONTRACT,
//       precision: 18,
//       native_precision: 8,
//     },
//   },
// };
// const testnet2 = {
//   tokenList: {
//     XSAT: {
//       symbol: 'XSAT',
//       address: '0x8266f2fbc720012e5Ac038aD3dbb29d2d613c459',
//       stake_address: '0xB5eD0404523c6be6487f1A1A030896c391A02FbF',
//       precision: 18,
//       native_precision: 8,
//     },
//   },
// };
const web3 = new Web3(EVM_RPC_URL);
const signer = web3.eth.accounts.privateKeyToAccount(PRIVATE_KEY);

async function main() {
  const maxRetries = 3;
  let retryCount = 0;
  let success = false;

  while (retryCount <= maxRetries && !success) {
    try {
      await creatAccount();
      success = true;
      console.log('Account creation completed successfully');
    } catch (e: any) {
      retryCount++;
      console.error(`Attempt ${retryCount} failed:`, e.message);

      if (retryCount > maxRetries) {
        console.error('Max retries reached. Account creation failed.');
        console.error('Error details:', e.message, e.stack);
        process.exit(1);
      } else {
        console.log(`Retrying account creation... (${retryCount}/${maxRetries})`);
        // Add delay between retries if needed
        await new Promise((resolve) => setTimeout(resolve, 1000 * retryCount));
      }
    }
  }
}

async function creatAccount() {
  const accounts = generateExsatAccounts();

  for (const newacc of accounts) {
    try {
      const validators = await getIsRegisterValidator(newacc);
      const accountExist = await getUserAccount(newacc);
      if (accountExist) {
        console.log(`${newacc} already exists`);

        if (!validators) {
          console.log(`${newacc} is not a validator, registering as validator...`);
          const keystore = getKeystore(newacc);
          const privateKey = await decryptKeystore(keystore, process.env.KEYSTORE_PASSWORD);

          const exsatApi = new ExsatApi({ accountName: newacc, privateKey: privateKey.toString() }, EXSAT_RPC_URLS);
          await exsatApi.initialize();
          const regres = await exsatApi.regxSatValidator(newacc, STAKER_REWARD_ADDRESS || signer.address);
          console.log('Validator registration successful:', regres.transaction_id);
        }
        continue;
      }

      console.log(`Creating account ${newacc}...`);
      const { privateKey, publicKey } = await generateKeystore(newacc, 'xsat_validator');

      // Register EOS account
      const result = await evmSignup(newacc, publicKey);
      if (!result) {
        throw new Error(`Failed to register EOS account for ${newacc}`);
      }

      const exsatApi = new ExsatApi({ accountName: newacc, privateKey: privateKey.toString() }, EXSAT_RPC_URLS);
      await exsatApi.initialize();

      // Register validator
      const regres = await exsatApi.regxSatValidator(newacc, STAKER_REWARD_ADDRESS || signer.address);
      console.log('Validator registration successful:', regres.transaction_id);

      // Recharge resources for validator (commented out as in original)
      // const recharge = await rechargeGas(newacc);
      // console.log(recharge.transactionHash);

      // EVM approve and stake operations (commented out as in original)
      // await xsatStake(newacc, '2100000000000000000000');

      fs.writeFileSync(`./account.txt`, `${newacc}\n`, { flag: 'a' });

    } catch (e: any) {
      console.error(`Error processing account ${newacc}:`, e.message);
      throw e; // Re-throw to trigger retry in main()
    }
  }
}

async function evmSignup(accountName, publicKey) {
  try {
    const txData = {
      from: signer.address,
      to: '0xbbbbbbbbbbbbbbbbbbbbbbbbc3993d541dc1b200',
      value: '10000000000000',
      data: web3.utils.utf8ToHex(`${accountName}-${publicKey}`),
      chainId: Number(EVM_CHAIN_ID),
      gas: 200000,
      gasPrice: await web3.eth.getGasPrice(),
    };
    console.log(`${accountName}-${publicKey}`);
    console.log(txData);
    const signedTx = await web3.eth.accounts.signTransaction(txData, PRIVATE_KEY);
    return await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
  } catch (error) {
    console.error(accountName + ' registration error: ' + error);
    process.exit(1);
  }

}


// async function rechargeGas(account) {
//   try {
//     account = account.endsWith('.sat') ? account : `${account}.sat`;
//     const txData = {
//       from: signer.address,
//       to: '0xbBbBbBbBbbbbBbbbbBbBbbBBbaB0894D80EE0D90', //rescmng.xsat
//       value: '10000000000000000',
//       data: web3.utils.utf8ToHex(account),
//       chainId: Number(EVM_CHAIN_ID),
//       gas: 200000,
//       gasPrice: await web3.eth.getGasPrice(),
//     };
//     const signedTx = await web3.eth.accounts.signTransaction(txData, PRIVATE_KEY);
//     return await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
//   } catch (error) {
//     console.error(account + ' recharge error: ' + error);
//     process.exit(1);
//   }

// }


// async function xsatStake(account, amount) {
//   account = account.endsWith('.sat') ? account : `${account}.sat`;
//   const tokenContract = new web3.eth.Contract(erc20Abi, tokens.tokenList.XSAT.address);
//   const allowance = await tokenContract.methods.allowance(signer.address, tokens.tokenList.XSAT.stake_address).call();
//   // @ts-ignore
//   if (BigInt(allowance) < BigInt(amount)) {
//     // @ts-ignore
//     const receipt = await approve(tokens.tokenList.XSAT.stake_address, amount);
//     console.log('Approval successful:', receipt);
//   }
//   const receipt = await xsatDeposit(account, amount);
//   console.log('Staking successful:', receipt);
// }


// async function approve(spenderAddress, amount) {
//   try {
//     const tokenContract = new web3.eth.Contract(erc20Abi, tokens.tokenList.XSAT.address);
//     const data = tokenContract.methods.approve(spenderAddress, amount).encodeABI();

//     const txData = {
//       from: signer.address,
//       to: tokens.tokenList.XSAT.address,
//       data,
//       gas: 200000, // Set gas
//       gasPrice: await web3.eth.getGasPrice(), // Get current gas price
//     };

//     // Sign transaction with private key
//     const signedTx = await web3.eth.accounts.signTransaction(txData, PRIVATE_KEY);

//     // Send signed transaction
//     const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
//     return receipt.transactionHash;
//     // console.log('Transaction hash:', receipt.transactionHash);
//   } catch (error) {
//     console.error('Approve error: ' + error);
//     process.exit(1);
//   }

// }

// async function xsatDeposit(targetAddress, depositAmount) {
//   try {
//     const stakeHelperContract = new web3.eth.Contract(stakeHelperAbi, tokens.tokenList.XSAT.stake_address);
//     const data = stakeHelperContract.methods.deposit(convertAddress(targetAddress), depositAmount).encodeABI();
//     const txData = {
//       from: signer.address,
//       to: tokens.tokenList.XSAT.stake_address,
//       data,
//       gas: 200000, // Set gas
//       gasPrice: await web3.eth.getGasPrice(), // Get current gas price
//     };

//     // Sign transaction with private key
//     const signedTx = await web3.eth.accounts.signTransaction(txData, PRIVATE_KEY);

//     // Send signed transaction
//     const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
//     return receipt.transactionHash;
//     // console.log('Transaction hash:', receipt.transactionHash);
//   } catch (error) {
//     console.error('XSAT staking error: ' + error);
//     process.exit(1);
//   }

// }


main().then(() => process.exit(0));
