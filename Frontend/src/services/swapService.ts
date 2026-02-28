const API_BASE_URL = 'http://localhost:3001';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RubicChain {
  id: number | null;          // numeric chain ID (e.g. 1 for ETH, 137 for POLYGON)
  blockchainName: string;     // Rubic name, e.g. "ETH", "POLYGON"
  displayName: string;
  type: string;               // "EVM", "SOLANA", "TRON", etc.
  proxyAvailable: boolean;
  testnet: boolean;
  providers: {
    crossChain: string[];
    onChain: string[];
  };
}

export interface RubicToken {
  symbol: string;
  address: string;            // native = 0x0000000000000000000000000000000000000000
  decimals: number;
  name: string;
  image: string | null;
  rank: number;
}

/** A single swap route returned by Rubic quoteAll / quoteBest, normalized by the backend */
export interface RubicRoute {
  id: string;
  type: string;               // "on-chain" | "cross-chain"  (from swapType)
  provider: string;           // e.g. "UNI_SWAP_V3", "ODOS", "STARGATE" (from providerType)
  fromAmount: string;         // source amount (human-readable)
  toAmount: string;           // estimated destination amount (from estimate.destinationTokenAmount)
  toAmountMin: string;        // minimum with slippage (from estimate.destinationTokenMinAmount)
  toAmountUsd: number;        // estimated USD value of output
  priceImpact: number | null; // percent price impact
  estimatedTime?: number;     // seconds (durationInMinutes * 60)
  fees: {
    nativeTokenAddress: string;
    percent: number;
    tokenSymbol: string;
  }[];
  tags?: string[];
  transaction?: unknown;      // raw swap tx data (populated by /routes/swap)
  useRubicContract?: boolean;
  [key: string]: unknown;
}

/** Transaction data returned by rubic swap endpoint */
export interface RubicTransactionData {
  data: string;               // hex encoded calldata
  to: string;                 // contract address
  value: string;              // native token value (wei as string)
}

export interface QuoteAllParams {
  srcTokenAddress: string;
  srcTokenBlockchain: string;
  dstTokenAddress: string;
  dstTokenBlockchain: string;
  srcTokenAmount: string;
}

export interface SwapDataParams extends QuoteAllParams {
  id: string;
  fromAddress: string;
  receiverAddress?: string;
}

// ─── RubicSwapService ─────────────────────────────────────────────────────────

class RubicSwapService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  // ── Chains ──────────────────────────────────────────────────────────────────

  /** Fetch all supported chains from Rubic API via the backend proxy */
  async getChains(includeTestnets = false): Promise<RubicChain[]> {
    const url = `${this.baseUrl}/api/rubic/chains${includeTestnets ? '?testnet=true' : ''}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed to fetch chains');
    return data.chains as RubicChain[];
  }

  // ── Tokens ──────────────────────────────────────────────────────────────────

  /**
   * Fetch tokens for a blockchain, optionally filtering by symbol search.
   * Calls the Rubic Token API via the backend proxy.
   */
  async getTokens(
    blockchain: string,
    search = '',
    page = 1,
    pageSize = 50,
  ): Promise<RubicToken[]> {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });
    if (search) params.set('search', search);
    const url = `${this.baseUrl}/api/rubic/tokens/${blockchain.toUpperCase()}?${params}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed to fetch tokens');
    return data.tokens as RubicToken[];
  }

  // ── Quotes ──────────────────────────────────────────────────────────────────

  /** Fetches ALL available swap routes for the token pair / amount. */
  async getQuoteAll(params: QuoteAllParams): Promise<RubicRoute[]> {
    const res = await fetch(`${this.baseUrl}/api/rubic/quote-all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed to fetch routes');
    return data.routes as RubicRoute[];
  }

  /** Fetches the single best swap route. */
  async getQuoteBest(params: QuoteAllParams): Promise<RubicRoute> {
    const res = await fetch(`${this.baseUrl}/api/rubic/quote-best`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed to fetch best route');
    return data.route as RubicRoute;
  }

  // ── Swap execution ───────────────────────────────────────────────────────────

  /** Fetches the swap transaction data for a selected route. */
  async getSwapData(params: SwapDataParams): Promise<{ transaction: RubicTransactionData }> {
    const res = await fetch(`${this.baseUrl}/api/rubic/swap-data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed to get swap data');
    return data.data as { transaction: RubicTransactionData };
  }

  // ── Cross-chain status ──────────────────────────────────────────────────────

  async getCrossChainStatus(txHash: string, srcBlockchain: string): Promise<unknown> {
    const res = await fetch(
      `${this.baseUrl}/api/rubic/status/${txHash}?srcBlockchain=${srcBlockchain.toUpperCase()}`
    );
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed to get status');
    return data.status;
  }

  // ── Utilities ───────────────────────────────────────────────────────────────

  isNativeToken(address: string): boolean {
    return !address || address === '0x0000000000000000000000000000000000000000';
  }

  formatAmount(amount: string | number, decimals = 6): string {
    const n = parseFloat(String(amount));
    if (isNaN(n)) return '0';
    return n.toFixed(decimals);
  }

  getExplorerTxUrl(explorer: string, txHash: string): string {
    return `${explorer}/tx/${txHash}`;
  }
}

// Singleton export
export const rubicSwapService = new RubicSwapService();
export { RubicSwapService };
