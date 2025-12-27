// Swap Service for Frontend
// This service provides methods to interact with the swap API

const API_BASE_URL = 'http://localhost:3001';

// Types
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

export interface DexInfo {
  name: string;
  address: string;
  isDefault: boolean;
}

export interface DexesResponse {
  success: boolean;
  chainId: number;
  network: string;
  defaultDex: string;
  dexes: DexInfo[];
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

export interface SwapParams {
  amount: string;
  tokenIn?: string;
  tokenOut?: string;
  slippage?: number;
  dex?: string;
}

export type SwapType = 'wrap' | 'unwrap' | 'nativeToToken' | 'tokenToNative' | 'tokenToToken';

// Swap Service Class
class SwapService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  // Get all supported chains
  async getChains(mode?: 'mainnet' | 'testnet'): Promise<ChainConfig[]> {
    try {
      const url = mode 
        ? `${this.baseUrl}/api/swap/chains?mode=${mode}`
        : `${this.baseUrl}/api/swap/chains`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        return data.chains;
      }
      throw new Error(data.error || 'Failed to fetch chains');
    } catch (error) {
      console.error('Error fetching chains:', error);
      throw error;
    }
  }

  // Get mainnet chains
  async getMainnetChains(): Promise<ChainConfig[]> {
    return this.getChains('mainnet');
  }

  // Get testnet chains
  async getTestnetChains(): Promise<ChainConfig[]> {
    return this.getChains('testnet');
  }

  // Get tokens for a specific chain
  async getTokens(chainId: number): Promise<TokensResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/swap/tokens/${chainId}`);
      const data = await response.json();
      
      if (data.success) {
        return data;
      }
      throw new Error(data.error || 'Failed to fetch tokens');
    } catch (error) {
      console.error('Error fetching tokens:', error);
      throw error;
    }
  }

  // Get DEXes for a specific chain
  async getDexes(chainId: number): Promise<DexesResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/swap/dexes/${chainId}`);
      const data = await response.json();
      
      if (data.success) {
        return data;
      }
      throw new Error(data.error || 'Failed to fetch DEXes');
    } catch (error) {
      console.error('Error fetching DEXes:', error);
      throw error;
    }
  }

  // Get account info on a specific chain
  async getAccountInfo(chainId: number, address: string): Promise<AccountInfo> {
    try {
      const response = await fetch(`${this.baseUrl}/api/swap/account/${chainId}/${address}`);
      const data = await response.json();
      
      if (data.success) {
        return data.account;
      }
      throw new Error(data.error || 'Failed to fetch account info');
    } catch (error) {
      console.error('Error fetching account info:', error);
      throw error;
    }
  }

  // Get swap quote
  async getQuote(
    chainId: number,
    tokenIn: string,
    tokenOut: string,
    amountIn: string,
    dex?: string
  ): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/swap/quote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chainId,
          tokenIn,
          tokenOut,
          amountIn,
          dex,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        return data;
      }
      throw new Error(data.error || 'Failed to get quote');
    } catch (error) {
      console.error('Error getting quote:', error);
      throw error;
    }
  }

  // Determine swap type based on tokens
  determineSwapType(
    fromToken: string,
    toToken: string,
    tokens: Record<string, Token>
  ): SwapType {
    const isFromNative = fromToken === 'native';
    const isToNative = toToken === 'native';
    const isFromWrapped = fromToken === 'wrappedNative';
    const isToWrapped = toToken === 'wrappedNative';

    if (isFromNative && isToWrapped) {
      return 'wrap';
    }
    if (isFromWrapped && isToNative) {
      return 'unwrap';
    }
    if (isFromNative || isFromWrapped) {
      return 'nativeToToken';
    }
    if (isToNative || isToWrapped) {
      return 'tokenToNative';
    }
    return 'tokenToToken';
  }

  // Build swap parameters
  buildSwapParams(
    swapType: SwapType,
    amount: string,
    tokens: Record<string, Token>,
    fromToken: string,
    toToken: string,
    slippage: number = 1,
    dex?: string
  ): SwapParams {
    const params: SwapParams = {
      amount,
      slippage,
    };

    if (dex) {
      params.dex = dex;
    }

    switch (swapType) {
      case 'wrap':
      case 'unwrap':
        // Only amount needed
        break;
      case 'nativeToToken':
        params.tokenOut = tokens[toToken]?.address;
        break;
      case 'tokenToNative':
        params.tokenIn = tokens[fromToken]?.address;
        break;
      case 'tokenToToken':
        params.tokenIn = tokens[fromToken]?.address;
        params.tokenOut = tokens[toToken]?.address;
        break;
    }

    return params;
  }

  // Format balance for display
  formatBalance(balance: string, decimals: number = 6): string {
    const num = parseFloat(balance);
    if (isNaN(num)) return '0';
    return num.toFixed(decimals);
  }

  // Get explorer URL for transaction
  getExplorerTxUrl(explorer: string, txHash: string): string {
    return `${explorer}/tx/${txHash}`;
  }

  // Get explorer URL for address
  getExplorerAddressUrl(explorer: string, address: string): string {
    return `${explorer}/address/${address}`;
  }
}

// Export singleton instance
export const swapService = new SwapService();

// Export class for custom instances
export { SwapService };

// Network chain IDs for easy reference
export const CHAIN_IDS = {
  // Mainnet
  ETHEREUM: 1,
  POLYGON: 137,
  BSC: 56,
  ARBITRUM: 42161,
  OPTIMISM: 10,
  BASE: 8453,
  AVALANCHE: 43114,
  // Testnet
  SEPOLIA: 11155111,
  HOLESKY: 17000,
  POLYGON_AMOY: 80002,
  BSC_TESTNET: 97,
  ARBITRUM_SEPOLIA: 421614,
  OPTIMISM_SEPOLIA: 11155420,
  BASE_SEPOLIA: 84532,
  AVALANCHE_FUJI: 43113,
} as const;

// Network names for display
export const NETWORK_NAMES: Record<number, string> = {
  // Mainnet
  1: 'Ethereum',
  137: 'Polygon',
  56: 'BSC',
  42161: 'Arbitrum One',
  10: 'Optimism',
  8453: 'Base',
  43114: 'Avalanche',
  // Testnet
  11155111: 'Sepolia',
  17000: 'Holesky',
  80002: 'Polygon Amoy',
  97: 'BSC Testnet',
  421614: 'Arbitrum Sepolia',
  11155420: 'Optimism Sepolia',
  84532: 'Base Sepolia',
  43113: 'Avalanche Fuji',
};

// Native token symbols by chain
export const NATIVE_SYMBOLS: Record<number, string> = {
  // Mainnet
  1: 'ETH',
  137: 'MATIC',
  56: 'BNB',
  42161: 'ETH',
  10: 'ETH',
  8453: 'ETH',
  43114: 'AVAX',
  // Testnet
  11155111: 'ETH',
  17000: 'ETH',
  80002: 'MATIC',
  97: 'tBNB',
  421614: 'ETH',
  11155420: 'ETH',
  84532: 'ETH',
  43113: 'AVAX',
};
