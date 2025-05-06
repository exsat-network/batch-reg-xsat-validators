import { API, Session } from '@wharfkit/session';
import { logger } from './logger';
import axios from 'axios';
import moment from 'moment';
import { WalletPluginPrivateKey } from '@wharfkit/wallet-plugin-privatekey';
import { sleep } from './utils';

class ExsatApi {
  private session: Session;
  private walletPlugin: WalletPluginPrivateKey;
  private nodes: string[];
  private currentNodeIndex: number;
  private accountName: string;
  private maxRetries: number = 3;
  private retryDelay: number = 1000;
  private executeActions: number = 0;
  private chainId: string;

  /**
   * Constructor initializes the API with account information and node list.
   * @param accountInfo - The account name and private key.
   * @param nodes - List of nodes to connect to.
   */
  constructor(
    private accountInfo: {
      accountName: string;
      privateKey: string;
    },
    nodes: string[],
  ) {
    this.nodes = nodes;
    this.currentNodeIndex = 0;
    this.accountName = accountInfo.accountName;
    this.walletPlugin = new WalletPluginPrivateKey(accountInfo.privateKey);
  }

  /**
   * Initializes the API by finding a valid node and setting up RPC and API objects.
   */
  public async initialize(): Promise<void> {
    const validNodeFound = await this.findValidNode();
    if (!validNodeFound) {
      throw new Error('No valid exsat node available.');
    }
    this.session = new Session(
      {
        chain: {
          id: this.chainId,
          url: this.getCurrentNode(),
        },
        actor: this.accountName,
        permission: 'active',
        walletPlugin: this.walletPlugin,
      },
      {
        fetch,
      },
    );

    logger.info('ExsatApi initialized successfully.');
  }

  /**
   * Returns the currently active node URL.
   * @returns The current node URL.
   */
  private getCurrentNode(): string {
    return this.nodes[this.currentNodeIndex];
  }

  /**
   * Iterates through nodes to find a valid one.
   * @returns Boolean indicating if a valid node was found.
   */
  private async findValidNode(): Promise<boolean> {
    for (let i = 0; i < this.nodes.length; i++) {
      this.currentNodeIndex = i;
      const valid = await this.isValidNode(this.getCurrentNode());
      if (valid) {
        logger.info(`Using node: ${this.getCurrentNode()}`);
        return true;
      }
    }
    return false;
  }

  /**
   * Switches to the next available node if the current one is invalid.
   * @param attemptCount - The number of attempts made to switch nodes.
   * @returns Boolean indicating if the switch was successful.
   */
  private async switchNode(attemptCount: number = 0): Promise<boolean> {
    if (attemptCount >= this.nodes.length) {
      return false;
    }

    this.currentNodeIndex = (this.currentNodeIndex + 1) % this.nodes.length;
    const valid = await this.isValidNode(this.getCurrentNode());

    if (valid) {
      this.session = new Session(
        {
          chain: {
            id: this.chainId,
            url: this.getCurrentNode(),
          },
          actor: this.accountName,
          permission: 'active',
          walletPlugin: this.walletPlugin,
        },
        {
          fetch,
        },
      );
      logger.info(`Switched to node: ${this.getCurrentNode()}`);
      return true;
    }

    return this.switchNode(attemptCount + 1);
  }

  /**
   * Validates if a node is responsive and synchronized with the network.
   * @param url - The node URL to validate.
   * @returns Boolean indicating if the node is valid.
   */
  private async isValidNode(url: string) {
    try {
      const response = await axios.get(`${url}/v1/chain/get_info`, {
        timeout: 3000,
      });
      if (response.status === 200 && response.data) {
        this.chainId = response.data.chain_id;
        const diffMS: number =
          moment(response.data.head_block_time).diff(moment().valueOf()) + moment().utcOffset() * 60_000;
        return Math.abs(diffMS) <= 300_000;
      }
    } catch (e) {
      logger.error(`getInfo from exsat rpc error: [${url}]`);
    }
    return false;
  }

  /**
   * Retries an operation with exponential backoff and switches nodes on failure.
   * @param operation - The operation to retry.
   * @param retryCount - The current retry attempt count.
   * @returns The result of the operation.
   */
  private async retryWithExponentialBackoff<T>(operation: () => Promise<T>, retryCount: number = 0): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (retryCount >= this.maxRetries) {
        throw error;
      }

      const delay = this.retryDelay * Math.pow(2, retryCount);
      logger.warn(`Operation failed, retrying in ${delay}ms...`);
      await sleep(delay);

      let switchRetryCount = 0;
      while (!(await this.switchNode())) {
        // Go to sleep when all nodes are unavailable
        const sleepTime = Math.min(1000 * Math.pow(2, switchRetryCount), 10000); // Maximum sleep time is 10 minutes
        logger.warn(`All nodes are unavailable. Sleeping for ${sleepTime / 1000} seconds.`);
        await sleep(sleepTime);
        switchRetryCount++;
      }

      return await this.retryWithExponentialBackoff(operation, retryCount + 1);
    }
  }

  /**
   * Executes a exsat action and handles potential errors and retries.
   * @param account - The account to execute the action on.
   * @param name - The name of the action to execute.
   * @param data - The data to send with the action.
   * @param showLog
   * @returns The result of the transaction.
   */
  public async executeAction(account: string, name: string, data: any, showLog = true) {
    const authorization = [
      {
        actor: 'res.xsat',
        permission: 'res',
      },
      {
        actor: this.accountName,
        permission: 'active',
      },
    ];
    try {
      const result = await this.session.transact(
        {
          actions: [
            {
              account,
              name,
              authorization,
              data,
            },
          ],
        },
        {
          expireSeconds: 30,
        },
      );
      // logger.info(`Execute actions: ${this.executeActions++}`);
      return result.response;
    } catch (e: any) {
      let dataStr = JSON.stringify(data);
      dataStr = dataStr.length > 500 ? dataStr.substring(0, 500) + '...' : dataStr;
      if (showLog) {
        logger.info(`Transaction result, account: ${account}, name: ${name}, data: ${dataStr}`, e);
      }
      throw e;
    }
  }

  /**
   * Checks if the client is properly configured and authorized.
   * @param type - The type of client (e.g., Synchronizer or Validator).
   */

  /**
   * Retrieves rows from a table, with support for pagination and retry logic.
   * @param code - The smart contract to query.
   * @param scope - The account to query within the contract.
   * @param table - The table name to query.
   * @param options - Query options, including pagination.
   * @returns The rows retrieved from the table.
   */
  public async getTableRows<T>(
    code: string,
    scope: string | number,
    table: string,
    options: {
      limit?: number;
      lower_bound?: API.v1.TableIndexType;
      upper_bound?: API.v1.TableIndexType;
      index_position?:
        | 'primary'
        | 'secondary'
        | 'tertiary'
        | 'fourth'
        | 'fifth'
        | 'sixth'
        | 'seventh'
        | 'eighth'
        | 'ninth'
        | 'tenth';
      key_type?: keyof API.v1.TableIndexTypes;
      reverse?: boolean;
      fetch_all?: boolean;
    } = {
      fetch_all: false,
    },
  ): Promise<T[]> {
    return await this.retryWithExponentialBackoff(async () => {
      let rows: T[] = [];
      let lower_bound = options.lower_bound;
      let more = true;

      do {
        const result = await this.session.client.v1.chain.get_table_rows({
          json: true,
          code,
          scope: String(scope),
          table,
          limit: options.limit || 10,
          lower_bound: lower_bound,
          upper_bound: options.upper_bound,
          index_position: options.index_position,
          key_type: options.key_type,
          reverse: false,
          show_payer: false,
        });

        rows = rows.concat(result.rows as T[]);
        more = result.more;
        if (more && options.fetch_all) {
          lower_bound = result.next_key as API.v1.TableIndexType;
        } else {
          more = false;
        }
      } while (more && options.fetch_all);
      return rows;
    });
  }

  /**
   * regValidator
   */
  public async regxSatValidator(account: string, evmAddress: string) {
    if (!evmAddress.match(/^(0x)?[0-9a-fA-F]{40}$/)) {
      throw new Error('Invalid EVM address format');
    }

    try {
      const result = await this.executeAction('endrmng.xsat', 'newregvldtor', {
        validator: account,
        role: '1',
        stake_addr: evmAddress.startsWith('0x') ? evmAddress.slice(2) : evmAddress,
        reward_addr: evmAddress.startsWith('0x') ? evmAddress.slice(2) : evmAddress,
        commission_rate: null,
      });

      return result;
    } catch (error) {
      console.error('错误:', (error as Error).message);
    }
  }


}


export default ExsatApi;
