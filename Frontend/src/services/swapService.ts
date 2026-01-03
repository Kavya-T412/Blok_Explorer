const API_BASE_URL = 'http://localhost:3001';

export interface ChainConfig {
  chainId: number;
  name: string;
  symbol: string;
  type: 'mainnet' | 'testnet';
  dexes: string[];
  explorer: string;
  wrappedNative: string;
  stablecoins: Record<string, string>;
}

export interface Token {
  symbol: string;
  name?: string;
  address: string;
  decimals: number;
}

export interface TokensResponse {
  success: boolean;
  chainId: number;
  network: string;
  tokens: Record<string, Token>;
}

export interface AccountInfo {
  address: string;
  balance: string;
  balanceWei: string;
  network: string;
  chainId: number;
  symbol: string;
  blockNumber: number;
}

class SwapService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async getChains(mode?: 'mainnet' | 'testnet'): Promise<ChainConfig[]> {
    const url = mode 
      ? `${this.baseUrl}/api/swap/chains?mode=${mode}`
      : `${this.baseUrl}/api/swap/chains`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.success) {
      return data.chains;
    }
    throw new Error(data.error || 'Failed to fetch chains');
  }

  async getTokens(chainId: number): Promise<TokensResponse> {
    const response = await fetch(`${this.baseUrl}/api/swap/tokens/${chainId}`);
    const data = await response.json();
    
    if (data.success) {
      return data;
    }
    throw new Error(data.error || 'Failed to fetch tokens');
  }

  async getAccountInfo(chainId: number, address: string): Promise<AccountInfo> {
    const response = await fetch(`${this.baseUrl}/api/swap/account/${chainId}/${address}`);
    const data = await response.json();
    
    if (data.success) {
      return data.account;
    }
    throw new Error(data.error || 'Failed to fetch account info');
  }

  formatBalance(balance: string, decimals: number = 6): string {
    const num = parseFloat(balance);
    if (isNaN(num)) return '0';
    return num.toFixed(decimals);
  }

  getExplorerTxUrl(explorer: string, txHash: string): string {
    return `${explorer}/tx/${txHash}`;
  }
}

export const swapService = new SwapService();
export { SwapService };

export const CHAIN_IDS = {
  ETHEREUM: 1,
  POLYGON: 137,
  ARBITRUM: 42161,
  OPTIMISM: 10,
  BASE: 8453,
  SEPOLIA: 11155111,
  ARBITRUM_SEPOLIA: 421614,
  OPTIMISM_SEPOLIA: 11155420,
  BASE_SEPOLIA: 84532,
} as const;

export const NETWORK_NAMES: Record<number, string> = {
  1: 'Ethereum',
  137: 'Polygon',
  42161: 'Arbitrum One',
  10: 'Optimism',
  8453: 'Base',
  11155111: 'Sepolia',
  421614: 'Arbitrum Sepolia',
  11155420: 'Optimism Sepolia',
  84532: 'Base Sepolia',
};

export const NATIVE_SYMBOLS: Record<number, string> = {
  1: 'ETH',
  137: 'MATIC',
  42161: 'ETH',
  10: 'ETH',
  8453: 'ETH',
  11155111: 'ETH',
  421614: 'ETH',
  11155420: 'ETH',
  84532: 'ETH',
};
