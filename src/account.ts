import { generateMnemonic, mnemonicToSeedSync } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import HDKey from 'hdkey';
import { PrivateKey } from '@wharfkit/antelope';
import { writeFileSync } from 'fs';
import WIF from 'wif';
import { bytesToHex } from 'web3-utils';
import { createKeystore } from './keystore';
import axios from 'axios';
import { EXSAT_RPC_URLS, KEYSTORE_PATH, PASSWORD, VALID_CHARS, ACCOUNT_PREFIX, ACCOUNT_SUFFIX, TOTAL } from './constant';

export async function getUserAccount(accountName) {
  accountName = accountName.endsWith('.sat') ? accountName : `${accountName}.sat`;
  try {
    const response = await axios.post(
      `${EXSAT_RPC_URLS[0]}/v1/chain/get_account`,
      JSON.stringify({
        account_name: accountName,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
    const owner = response.data.permissions.find((p) => p.perm_name === 'owner');
    return { account: response.data.account_name, pubkey: owner.required_auth.keys[0].key };
  } catch (error: any) {
    if (error.response && error.response.data.message === 'Account lookup') {
      return false;
    }
    throw error;
  }
}

async function saveKeystore(privateKey, username, role) {
  // Continue with the rest of the keystore saving logic
  const keystore = await createKeystore(
    `${bytesToHex(WIF.decode(privateKey.toWif(), 128).privateKey)}`,
    PASSWORD,
    username,
    role
  );

  const keystoreFilePath = `${KEYSTORE_PATH}/${username}_keystore.json`;
  writeFileSync(keystoreFilePath, JSON.stringify(keystore), { mode: 0o600 });

  console.log(`Saved successfully: ${keystoreFilePath}\n`);
  return keystoreFilePath;
}

export async function generateKeystore(username, role) {
  const mnemonic = generateMnemonic(wordlist);

  const seed = mnemonicToSeedSync(mnemonic);
  const master = HDKey.fromMasterSeed(Buffer.from(seed));
  const node = master.derive("m/44'/194'/0'/0/0");

  const privateKey = PrivateKey.from(WIF.encode(128, node.privateKey!, false).toString());
  const publicKey = privateKey.toPublic().toString();

  await saveKeystore(privateKey, username, role);

  return { privateKey, publicKey, username };
}

function numberToValidChars(num: number): string {
  // Convert number to allowed characters
  // Use a combination of 1-5 and a-z
  const digits: string[] = [];
  if (num === 0) return '1';

  while (num > 0) {
    const remainder = num % VALID_CHARS.length;
    digits.unshift(VALID_CHARS[remainder]);
    num = Math.floor(num / VALID_CHARS.length);
  }

  return digits.join('');
}

export function generateExsatAccounts(): string[] {
  const accounts: string[] = [];

  // Generate accounts
  for (let i = 0; i < TOTAL; i++) {
    const numPart = numberToValidChars(i);
    const account = `${ACCOUNT_PREFIX}${numPart}${ACCOUNT_SUFFIX}`;

    // Validate complete account length
    if (account.length > 12) {
      throw new Error(`Account ${account} exceeds the 12 character limit`);
    }

    accounts.push(account);
  }

  return accounts;
}
