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

export interface PoolDetails {
  address: string;
  fee: number;
  sqrtPriceX96: string;
  tick: number;
  liquidity: string;
  token0: string;
  token1: string;
  exists: boolean;
}

export interface QuoteDetails {
  fee: number;
  amountOut: string;
  gasEstimate: string;
}

export interface DetailedQuote {
  success: boolean;
  chainId: number;
  network: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  estimatedOutput: string;
  feeTier: number;
  gasEstimate?: string;
  pools: PoolDetails[];
  allQuotes: QuoteDetails[];
  isWrapUnwrap?: boolean;
  error?: string;
}

export interface SwapPayload {
  poolDetails: PoolDetails[];
  quote: {
    amountOut: string;
    amountOutMin: string;
    fee: number;
    gasEstimate: string;
    allQuotes: QuoteDetails[];
  };
  swapParams: {
    tokenIn: string;
    tokenOut: string;
    fee: number;
    amountIn: string;
    amountOutMinimum: string;
  };
  deadline: number;
  routerAddress: string;
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

  // Step 1: Get Pool Details
  async getPoolDetails(chainId: number, tokenIn: string, tokenOut: string): Promise<PoolDetails[]> {
    const response = await fetch(`${this.baseUrl}/api/swap/pool-details`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chainId, tokenIn, tokenOut })
    });
    const data = await response.json();
    
    if (data.success) {
      return data.pools;
    }
    throw new Error(data.error || 'Failed to fetch pool details');
  }

  // Step 2: Get Detailed Quote
  async getDetailedQuote(
    chainId: number,
    tokenIn: string,
    tokenOut: string,
    amountIn: string,
    fromDecimals: number,
    toDecimals: number
  ): Promise<DetailedQuote> {
    const response = await fetch(`${this.baseUrl}/api/swap/quote-detailed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chainId,
        tokenIn,
        tokenOut,
        amountIn,
        fromDecimals,
        toDecimals
      })
    });
    const data = await response.json();
    
    if (data.success) {
      return data;
    }
    throw new Error(data.error || 'Failed to fetch detailed quote');
  }

  // Step 3: Create Swap Payload
  async createSwapPayload(
    chainId: number,
    tokenIn: string,
    tokenOut: string,
    amountIn: string,
    fromDecimals: number,
    slippagePercent: number = 5
  ): Promise<SwapPayload> {
    const response = await fetch(`${this.baseUrl}/api/swap/create-payload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chainId,
        tokenIn,
        tokenOut,
        amountIn,
        fromDecimals,
        slippagePercent
      })
    });
    const data = await response.json();
    
    if (data.success) {
      return data.payload;
    }
    throw new Error(data.error || 'Failed to create swap payload');
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
