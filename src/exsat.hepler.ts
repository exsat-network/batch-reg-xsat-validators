import axios from 'axios';
import { EXSAT_RPC_URLS } from './constant';

export class ExsatHelper {
  private rpcUrl: string;

  constructor() {
    try {
      this.rpcUrl = JSON.parse(EXSAT_RPC_URLS)[0];
    } catch (error) {
      this.rpcUrl = EXSAT_RPC_URLS;
    }
  }

  /**
   * Get chain data
   * @param params
   * @returns
   */
  async getTableRows(params: {
    code: string;
    scope: string;
    table: string;
    lower_bound: any;
    upper_bound: any;
    limit: number;
    key_type: string;
    index_position: number;
  }): Promise<{ more: boolean; rows: any[] }> {
    const data = {
      code: params.code,
      scope: params.scope,
      table: params.table,
      json: true,
      index_position: params.index_position,
      lower_bound: params.lower_bound,
      upper_bound: params.upper_bound,
      key_type: params.key_type,
      limit: params.limit,
    };

    const response = await axios.post(`${this.rpcUrl}/v1/chain/get_table_rows`, data);
    return response.data;
  }
}
