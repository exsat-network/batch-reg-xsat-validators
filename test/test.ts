import { Web3 } from 'web3';

function generateAccountNames(prefix: string, count: number): string[] {
  const accounts: string[] = [];
  const letters = '12345abcdefghijklmnopqrstuvwxyz';
  let letterIndex = 1;

  while (accounts.length < count) {
    let num = letterIndex;
    if (num === 0) {
      accounts.push(`${prefix}${letters[0]}`);
    }
    if (num > 0) {
      let result = '';
      while (num > 0) {
        const remainder = num % letters.length;
        console.log(remainder);
        result = letters[remainder] + result;
        num = Math.floor(num / letters.length) ;
      }
      accounts.push(`${prefix}${result}`);
    }

    letterIndex++;
  }
  return accounts;
}


async function main() {
  // 示例调用
  const accounts = generateAccountNames('chen', 33);
  console.log(accounts);
}

main();
