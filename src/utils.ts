import { BN } from 'bn.js';
import * as console from 'node:console';

export function convertAddress(eosAddress: string) {
  try {
    return uint64ToAddr(strToUint64(eosAddress));
  } catch (err) {
    return err;
  }

  function charToSymbol(c) {
    const a = 'a'.charCodeAt(0);
    const z = 'z'.charCodeAt(0);
    const one = '1'.charCodeAt(0);
    const five = '5'.charCodeAt(0);
    const charCode = c.charCodeAt(0);
    if (charCode >= a && charCode <= z) {
      return charCode - a + 6;
    }
    if (charCode >= one && charCode <= five) {
      return charCode - one + 1;
    }
    if (c === '.') {
      return 0;
    }
    throw new Error('invalid address');
  }

  function strToUint64(str) {
    let n = new BN();
    let i = str.length;
    if (i >= 13) {
      // Only the first 12 characters can be full-range ([.1-5a-z]).
      i = 12;

      // The 13th character must be in the range [.1-5a-j] because it needs to be encoded
      // using only four bits (64_bits - 5_bits_per_char * 12_chars).
      n = new BN(charToSymbol(str[12]));
      if (n >= 16) {
        throw new Error('invalid 13th char');
      }
    }
    // Encode full-range characters.

    while (--i >= 0) {
      n = n.or(new BN(charToSymbol(str[i])).shln(64 - 5 * (i + 1)));
    }
    return n.toString(16, 16);
  }

  function uint64ToAddr(str) {
    return '0xbbbbbbbbbbbbbbbbbbbbbbbb' + str;
  }
}
export function reverseConvertAddress(encodedAddress) {
  // Remove the prefix
  const hexStr = encodedAddress.slice(26);

  // Convert hex string back to a BN object
  const n = new BN(hexStr, 16);

  // Initialize an array to store the characters
  const chars = [];

  // Decode up to 12 characters
  for (let i = 0; i < 12; i++) {
    const charValue = n
      .shrn(64 - 5 * (i + 1))
      .and(new BN(31))
      .toNumber();
    chars.push(symbolToChar(charValue));
  }

  // Reverse the array to get the correct order
  const result = chars.join('');
  return result.replace(/\.*$/, '');
}

function symbolToChar(symbol) {
  if (symbol >= 6 && symbol <= 31) {
    return String.fromCharCode(symbol - 6 + 'a'.charCodeAt(0));
  }
  if (symbol >= 1 && symbol <= 5) {
    return String.fromCharCode(symbol - 1 + '1'.charCodeAt(0));
  }
  if (symbol === 0) {
    return '.';
  }
  throw new Error('Invalid symbol');
}

export async function sleep(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
