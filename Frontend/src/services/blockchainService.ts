import { ethers } from 'ethers';
import { getCustomNetworks, CustomNetwork, NetworkConfig } from '@/types/customNetworks';

// Chain configurations with public RPC endpoints (Mainnet)
// Using public RPC endpoints to avoid rate limiting
const MAINNET_CONFIGS = {
  ethereum: {
    chainId: 1,
    name: 'Ethereum',
    symbol: 'ETH',
    rpcUrl: 'https://ethereum-rpc.publicnode.com',
    fallbackRpcUrls: [
      'https://eth.llamarpc.com',
      'https://rpc.flashbots.net',
      'https://1rpc.io/eth'
    ],
    explorer: 'https://etherscan.io',
    decimals: 18,
    color: 'from-blue-500 to-purple-500',
  },
  polygon: {
    chainId: 137,
    name: 'Polygon',
    symbol: 'MATIC',
    rpcUrl: 'https://polygon-rpc.com',
    fallbackRpcUrls: [
      'https://polygon-bor-rpc.publicnode.com',
      'https://polygon.llamarpc.com',
      'https://1rpc.io/matic'
    ],
    explorer: 'https://polygonscan.com',
    decimals: 18,
    color: 'from-purple-500 to-pink-500',
  },
  bsc: {
    chainId: 56,
    name: 'BSC',
    symbol: 'BNB',
    rpcUrl: 'https://bsc-dataseed.binance.org',
    fallbackRpcUrls: [
      'https://bsc-rpc.publicnode.com',
      'https://bsc.publicnode.com',
      'https://1rpc.io/bnb'
    ],
    explorer: 'https://bscscan.com',
    decimals: 18,
    color: 'from-yellow-500 to-orange-500',
  },
  arbitrum: {
    chainId: 42161,
    name: 'Arbitrum',
    symbol: 'ETH',
    rpcUrl: 'https://arbitrum-one-rpc.publicnode.com',
    fallbackRpcUrls: [
      'https://arb1.arbitrum.io/rpc',
      'https://1rpc.io/arb',
      'https://arbitrum.llamarpc.com'
    ],
    explorer: 'https://arbiscan.io',
    decimals: 18,
    color: 'from-blue-400 to-cyan-400',
  },
  optimism: {
    chainId: 10,
    name: 'Optimism',
    symbol: 'ETH',
    rpcUrl: 'https://optimism-rpc.publicnode.com',
    fallbackRpcUrls: [
      'https://mainnet.optimism.io',
      'https://1rpc.io/op',
      'https://optimism.llamarpc.com'
    ],
    explorer: 'https://optimistic.etherscan.io',
    decimals: 18,
    color: 'from-red-500 to-pink-500',
  },
  base: {
    chainId: 8453,
    name: 'Base',
    symbol: 'ETH',
    rpcUrl: 'https://base-rpc.publicnode.com',
    fallbackRpcUrls: [
      'https://mainnet.base.org',
      'https://1rpc.io/base',
      'https://base.llamarpc.com'
    ],
    explorer: 'https://basescan.org',
    decimals: 18,
    color: 'from-blue-600 to-indigo-600',
  },
  avalanche: {
    chainId: 43114,
    name: 'Avalanche',
    symbol: 'AVAX',
    rpcUrl: 'https://avalanche-c-chain-rpc.publicnode.com',
    fallbackRpcUrls: [
      'https://api.avax.network/ext/bc/C/rpc',
      'https://1rpc.io/avax/c',
      'https://avalanche.drpc.org'
    ],
    explorer: 'https://snowtrace.io',
    decimals: 18,
    color: 'from-red-600 to-orange-600',
  },
};

// Chain configurations with public RPC endpoints (Testnet)
const TESTNET_CONFIGS = {
  sepolia: {
    chainId: 11155111,
    name: 'Sepolia',
    symbol: 'ETH',
    rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
    fallbackRpcUrls: [
      'https://rpc.sepolia.org',
      'https://1rpc.io/sepolia',
      'https://eth-sepolia.g.alchemy.com/v2/demo'
    ],
    explorer: 'https://sepolia.etherscan.io',
    decimals: 18,
    color: 'from-cyan-500 to-blue-500',
  },
  hoodi: {
    chainId: 17000,
    name: 'Hoodi',
    symbol: 'ETH',
    rpcUrl: 'https://ethereum-holesky-rpc.publicnode.com',
    fallbackRpcUrls: [
      'https://holesky.drpc.org',
      'https://1rpc.io/holesky'
    ],
    explorer: 'https://holesky.etherscan.io',
    decimals: 18,
    color: 'from-cyan-400 to-blue-400',
  },
  polygonAmoy: {
    chainId: 80002,
    name: 'Polygon Amoy',
    symbol: 'MATIC',
    rpcUrl: 'https://rpc-amoy.polygon.technology',
    fallbackRpcUrls: [
      'https://polygon-amoy-bor-rpc.publicnode.com',
      'https://rpc.ankr.com/polygon_amoy'
    ],
    explorer: 'https://amoy.polygonscan.com',
    decimals: 18,
    color: 'from-purple-400 to-pink-400',
  },
  bscTestnet: {
    chainId: 97,
    name: 'BSC Testnet',
    symbol: 'tBNB',
    rpcUrl: 'https://bsc-testnet-rpc.publicnode.com',
    fallbackRpcUrls: [
      'https://data-seed-prebsc-1-s1.binance.org:8545',
      'https://bsc-testnet.drpc.org'
    ],
    explorer: 'https://testnet.bscscan.com',
    decimals: 18,
    color: 'from-yellow-400 to-orange-400',
  },
  arbitrumSepolia: {
    chainId: 421614,
    name: 'Arbitrum Sepolia',
    symbol: 'ETH',
    rpcUrl: 'https://arbitrum-sepolia-rpc.publicnode.com',
    fallbackRpcUrls: [
      'https://sepolia-rollup.arbitrum.io/rpc',
      'https://arbitrum-sepolia.drpc.org'
    ],
    explorer: 'https://sepolia.arbiscan.io',
    decimals: 18,
    color: 'from-blue-300 to-cyan-300',
  },
  optimismSepolia: {
    chainId: 11155420,
    name: 'Optimism Sepolia',
    symbol: 'ETH',
    rpcUrl: 'https://optimism-sepolia-rpc.publicnode.com',
    fallbackRpcUrls: [
      'https://sepolia.optimism.io',
      'https://optimism-sepolia.drpc.org'
    ],
    explorer: 'https://sepolia-optimism.etherscan.io',
    decimals: 18,
    color: 'from-red-400 to-pink-400',
  },
  baseSepolia: {
    chainId: 84532,
    name: 'Base Sepolia',
    symbol: 'ETH',
    rpcUrl: 'https://base-sepolia-rpc.publicnode.com',
    fallbackRpcUrls: [
      'https://sepolia.base.org',
      'https://base-sepolia.drpc.org'
    ],
    explorer: 'https://sepolia.basescan.org',
    decimals: 18,
    color: 'from-blue-500 to-indigo-500',
  },
  avalancheFuji: {
    chainId: 43113,
    name: 'Avalanche Fuji',
    symbol: 'AVAX',
    rpcUrl: 'https://avalanche-fuji-c-chain-rpc.publicnode.com',
    fallbackRpcUrls: [
      'https://api.avax-test.network/ext/bc/C/rpc',
      'https://avalanche-fuji.drpc.org'
    ],
    explorer: 'https://testnet.snowtrace.io',
    decimals: 18,
    color: 'from-red-500 to-orange-500',
  },
};

// Combined configurations for chain ID lookup
const ALL_CONFIGS = [...Object.entries(MAINNET_CONFIGS), ...Object.entries(TESTNET_CONFIGS)]
  .reduce((acc, [key, config]) => ({ ...acc, [config.chainId]: { ...config, key } }), {} as Record<number, any>);

// API endpoints and constants
const PRICE_API_COINGECKO = 'https://api.coingecko.com/api/v3/simple/price';
const PRICE_API_COINCAP = 'https://api.coincap.io/v2/assets';
const PRICE_API_CRYPTOCOMPARE = 'https://min-api.cryptocompare.com/data/price';
const BACKEND_API_URL = 'http://localhost:3001'; // Backend transaction history API

// Block explorer API domains for all supported chains
const API_DOMAINS: Record<number, string> = {
  // Mainnet explorers
  1: 'api.etherscan.io',
  137: 'api.polygonscan.com',
  56: 'api.bscscan.com',
  42161: 'api.arbiscan.io',
  10: 'api-optimistic.etherscan.io',
  8453: 'api.basescan.org',
  43114: 'api.snowtrace.io',
  // Testnet explorers
  11155111: 'api-sepolia.etherscan.io',
  17000: 'api-holesky.etherscan.io',
  80002: 'api-amoy.polygonscan.com',
  97: 'api-testnet.bscscan.com',
  421614: 'api-sepolia.arbiscan.io',
  11155420: 'api-sepolia-optimistic.etherscan.io',
  84532: 'api-sepolia.basescan.org',
  43113: 'api-testnet.snowtrace.io',
};

// API Keys (add your own from respective explorers)
const API_KEYS: Record<number, string> = {
  // Ethereum Mainnet & Testnets
  1: '3TVS5MFI9QU3261QD7VTURNBWFCHRNDX4K',
  11155111: '3TVS5MFI9QU3261QD7VTURNBWFCHRNDX4K',
  17000: '3TVS5MFI9QU3261QD7VTURNBWFCHRNDX4K',
  // Polygon Mainnet & Testnets
  137: '3TVS5MFI9QU3261QD7VTURNBWFCHRNDX4K',
  80002: '3TVS5MFI9QU3261QD7VTURNBWFCHRNDX4K',
  // BSC Mainnet & Testnet
  56: '3TVS5MFI9QU3261QD7VTURNBWFCHRNDX4K',
  97: '3TVS5MFI9QU3261QD7VTURNBWFCHRNDX4K',
  // Arbitrum Mainnet & Testnet
  42161: '3TVS5MFI9QU3261QD7VTURNBWFCHRNDX4K',
  421614: '3TVS5MFI9QU3261QD7VTURNBWFCHRNDX4K',
  // Optimism Mainnet & Testnet
  10: '3TVS5MFI9QU3261QD7VTURNBWFCHRNDX4K',
  11155420: '3TVS5MFI9QU3261QD7VTURNBWFCHRNDX4K',
  // Base Mainnet & Testnet
  8453: '3TVS5MFI9QU3261QD7VTURNBWFCHRNDX4K',
  84532: '3TVS5MFI9QU3261QD7VTURNBWFCHRNDX4K',
  // Avalanche Mainnet & Testnet
  43114: '3TVS5MFI9QU3261QD7VTURNBWFCHRNDX4K',
  43113: '3TVS5MFI9QU3261QD7VTURNBWFCHRNDX4K',
};

// CoinGecko/CoinCap IDs for price fetching
const COIN_IDS = { 
  ETH: 'ethereum', 
  MATIC: 'matic-network', 
  BNB: 'binancecoin',
  AVAX: 'avalanche-2'
};

const COINCAP_IDS = { 
  ETH: 'ethereum', 
  MATIC: 'polygon', 
  BNB: 'binance-coin',
  AVAX: 'avalanche'
};

// Map testnet symbols to mainnet equivalents for price lookup
const SYMBOL_MAP: Record<string, string> = { 
  'TBNB': 'BNB',  // Testnet BNB -> BNB
  'ETH': 'ETH',
  'MATIC': 'MATIC',
  'BNB': 'BNB',
  'AVAX': 'AVAX'
};

export interface Balance {
  chain: string;
  symbol: string;
  balance: string;
  usdValue: string;
  usdValueNum: number; // Numeric USD value for calculations
  color: string;
  rawBalance: string;
}

export interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  gas: string;
  chain: string;
  status: 'success' | 'pending' | 'failed';
  time: string;
  date: string; // Formatted date (e.g., "Nov 25, 2025, 10:30 AM")
  timestamp: number;
  gasPrice?: string;
  blockNumber?: number;
  type?: 'transfer' | 'contract-deployment' | 'contract-interaction';
  direction?: 'sent' | 'received' | 'self';
  valueRaw?: string; // Raw value in wei for calculations
  isContractCreation?: boolean;
  contractAddress?: string;
  methodId?: string;
  input?: string;
}

class BlockchainService {
  private providers: Map<string, ethers.JsonRpcProvider> = new Map();
  private fallbackProviders: Map<string, ethers.JsonRpcProvider[]> = new Map();
  private priceCache: Map<string, { price: number; timestamp: number }> = new Map();
  private balanceCache: Map<string, { balance: Balance; timestamp: number }> = new Map();
  private transactionCache: Map<string, { transactions: Transaction[]; timestamp: number }> = new Map();
  private readonly PRICE_CACHE_DURATION = 120000; // 2 minutes for prices
  private readonly BALANCE_CACHE_DURATION = 30000; // 30 seconds for balances
  private readonly TX_CACHE_DURATION = 60000; // 60 seconds for transactions
  private currentChainId: number | null = null;
  private pendingRequests: Map<string, Promise<Transaction[]>> = new Map();
  private pendingBalanceRequests: Map<string, Promise<Balance | null>> = new Map();
  
  // Rate limiting - optimized for faster parallel requests
  private requestQueue: Map<string, Promise<any>> = new Map();
  private lastRequestTime: Map<string, number> = new Map();
  private readonly MIN_REQUEST_INTERVAL = 100; // 100ms between requests (reduced from 200ms)
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000; // Start with 1 second

  constructor() {
    // Initialize providers for all chains (both mainnet and testnet)
    const allConfigs = { ...MAINNET_CONFIGS, ...TESTNET_CONFIGS };
    Object.entries(allConfigs).forEach(([key, config]) => {
      try {
        // Create network object with explicit chainId
        const network = ethers.Network.from({
          name: config.name.toLowerCase().replace(/\s+/g, '-'),
          chainId: config.chainId,
        });

        // Initialize primary provider with explicit network
        const provider = new ethers.JsonRpcProvider(
          config.rpcUrl,
          network,
          {
            staticNetwork: network,
            batchMaxCount: 1, // Disable batching to reduce load
          }
        );
        this.providers.set(key, provider);

        // Initialize fallback providers if available
        if (config.fallbackRpcUrls && config.fallbackRpcUrls.length > 0) {
          const fallbackProviders = config.fallbackRpcUrls.map(url => 
            new ethers.JsonRpcProvider(
              url,
              network,
              {
                staticNetwork: network,
                batchMaxCount: 1,
              }
            )
          );
          this.fallbackProviders.set(key, fallbackProviders);
        }
      } catch (error) {
        console.error(`Failed to initialize provider for ${config.name}:`, error);
      }
    });

    // Listen for chain changes
    this.detectConnectedChain();
    if (typeof window !== 'undefined' && window.ethereum) {
      window.ethereum.on('chainChanged', () => {
        this.detectConnectedChain();
      });
    }
  }

  // Rate-limited request wrapper with retry logic
  private async makeRateLimitedRequest<T>(
    key: string,
    requestFn: () => Promise<T>,
    retryCount: number = 0
  ): Promise<T> {
    // Check if there's already a pending request for this key
    if (this.requestQueue.has(key)) {
      return this.requestQueue.get(key) as Promise<T>;
    }

    const requestPromise = (async () => {
      try {
        // Implement rate limiting
        const lastRequest = this.lastRequestTime.get(key) || 0;
        const timeSinceLastRequest = Date.now() - lastRequest;
        
        if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
          const delay = this.MIN_REQUEST_INTERVAL - timeSinceLastRequest;
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        this.lastRequestTime.set(key, Date.now());

        // Make the request
        const result = await requestFn();
        return result;
      } catch (error: any) {
        // Handle rate limiting errors
        if (error?.code === 429 || error?.message?.includes('429') || 
            error?.message?.includes('Too Many Requests')) {
          
          if (retryCount < this.MAX_RETRIES) {
            // Exponential backoff: 1s, 2s, 4s
            const delay = this.RETRY_DELAY * Math.pow(2, retryCount);
            console.warn(`Rate limit hit, retrying in ${delay}ms (attempt ${retryCount + 1}/${this.MAX_RETRIES})`);
            
            await new Promise(resolve => setTimeout(resolve, delay));
            
            // Remove from queue and retry
            this.requestQueue.delete(key);
            return this.makeRateLimitedRequest(key, requestFn, retryCount + 1);
          } else {
            console.error('Max retries reached for rate-limited request');
            throw new Error('Rate limit exceeded. Please try again in a few moments.');
          }
        }
        
        throw error;
      } finally {
        this.requestQueue.delete(key);
      }
    })();

    this.requestQueue.set(key, requestPromise);
    return requestPromise;
  }

  // Get provider with fallback support
  private async getProviderWithFallback(chain: string): Promise<ethers.JsonRpcProvider | null> {
    const primaryProvider = this.providers.get(chain);
    if (!primaryProvider) return null;

    try {
      // Quick health check with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout (reduced from 3s)
      
      await Promise.race([
        primaryProvider.getBlockNumber(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 2000)
        )
      ]);
      
      clearTimeout(timeoutId);
      return primaryProvider;
    } catch (error) {
      // Try fallback providers silently
      const fallbacks = this.fallbackProviders.get(chain);
      if (fallbacks && fallbacks.length > 0) {
        for (const fallbackProvider of fallbacks) {
          try {
            await Promise.race([
              fallbackProvider.getBlockNumber(),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout')), 2000)
              )
            ]);
            return fallbackProvider;
          } catch (fallbackError) {
            continue;
          }
        }
      }
      
      // If all fallbacks fail, return primary anyway (last resort)
      return primaryProvider;
    }
  }

  // Detect the currently connected chain from wallet
  private async detectConnectedChain(): Promise<void> {
    try {
      if (typeof window !== 'undefined' && window.ethereum) {
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        this.currentChainId = parseInt(chainId, 16);
        console.log('Connected to chain:', this.currentChainId, ALL_CONFIGS[this.currentChainId]?.name || 'Unknown');
      }
    } catch (error) {
      console.error('Failed to detect connected chain:', error);
      this.currentChainId = null;
    }
  }

  // Get active configuration based on settings (not wallet chain)
  private getActiveConfigs(): typeof MAINNET_CONFIGS | typeof TESTNET_CONFIGS {
    // Read from localStorage (set by NetworkModeToggle in Settings)
    const useTestnet = typeof window !== 'undefined' 
      ? localStorage.getItem('useTestnet') === 'true'
      : false;
    
    console.log(`Active mode from settings: ${useTestnet ? 'TESTNET' : 'MAINNET'}`);
    return useTestnet ? TESTNET_CONFIGS : MAINNET_CONFIGS;
  }

  // Get custom networks filtered by type (mainnet or testnet)
  private getActiveCustomNetworks(): CustomNetwork[] {
    const useTestnet = typeof window !== 'undefined' 
      ? localStorage.getItem('useTestnet') === 'true'
      : false;
    
    const customNetworks = getCustomNetworks();
    return customNetworks.filter(network => 
      useTestnet ? network.type === 'testnet' : network.type === 'mainnet'
    );
  }

  // Get combined configs (default + custom)
  private getAllActiveConfigs(): Record<string, NetworkConfig> {
    const baseConfigs = this.getActiveConfigs();
    const customNetworks = this.getActiveCustomNetworks();
    
    // Convert custom networks to NetworkConfig format
    const customConfigs: Record<string, NetworkConfig> = {};
    customNetworks.forEach(network => {
      customConfigs[network.id] = {
        chainId: network.chainId,
        name: network.name,
        symbol: network.symbol,
        rpcUrl: network.rpcUrl,
        explorer: network.explorerUrl || '',
        decimals: network.decimals,
        color: network.color,
        isCustom: true,
        key: network.id,
      };
    });
    
    return { ...baseConfigs, ...customConfigs };
  }

  // Get or create provider for custom network
  private getOrCreateCustomProvider(network: CustomNetwork): ethers.JsonRpcProvider {
    const key = network.id;
    let provider = this.providers.get(key);
    
    if (!provider) {
      console.log(`🔧 Creating new provider for ${network.name} (${network.rpcUrl})`);
      try {
        const ethersNetwork = ethers.Network.from({
          name: network.name.toLowerCase().replace(/\s+/g, '-'),
          chainId: network.chainId,
        });
        
        provider = new ethers.JsonRpcProvider(
          network.rpcUrl,
          ethersNetwork,
          {
            staticNetwork: ethersNetwork,
            batchMaxCount: 1,
          }
        );
        
        this.providers.set(key, provider);
        
        // Initialize fallback providers if available
        if (network.fallbackRpcUrls && network.fallbackRpcUrls.length > 0) {
          const fallbackProviders = network.fallbackRpcUrls.map(url => 
            new ethers.JsonRpcProvider(
              url,
              ethersNetwork,
              {
                staticNetwork: ethersNetwork,
                batchMaxCount: 1,
              }
            )
          );
          this.fallbackProviders.set(key, fallbackProviders);
          console.log(`✅ Provider created with ${fallbackProviders.length} fallback(s) for ${network.name}`);
        } else {
          console.log(`✅ Provider created successfully for ${network.name}`);
        }
      } catch (error: any) {
        console.error(`❌ Failed to create provider for ${network.name}:`, error.message);
        throw error;
      }
    } else {
      console.log(`♻️ Using existing provider for ${network.name}`);
    }
    
    return provider;
  }

  private getProvider(chain: string): ethers.JsonRpcProvider | null {
    return this.providers.get(chain) || null;
  }

  // Helper: Parse transaction and determine direction/type
  private parseTransaction(tx: any, address: string, config: any, isExplorerAPI: boolean = true): Transaction {
    const isContractCreation = !tx.to || tx.to === '';
    const type: Transaction['type'] = isContractCreation ? 'contract-deployment'
      : (tx.input && tx.input !== '0x') ? 'contract-interaction' : 'transfer';

    const fromAddr = (tx.from || '').toLowerCase();
    const toAddr = (tx.to || '').toLowerCase();
    const userAddr = address.toLowerCase();
    
    const direction: Transaction['direction'] = isContractCreation ? 'sent'
      : fromAddr === userAddr && toAddr === userAddr ? 'self'
      : fromAddr === userAddr ? 'sent' : 'received';

    const valueInEther = parseFloat(ethers.formatEther(tx.value));
    const valueFormatted = valueInEther > 0 ? valueInEther.toFixed(6) : '0';
    
    const txTimestamp = isExplorerAPI ? parseInt(tx.timeStamp) : tx.timestamp;

    return {
      hash: tx.hash,
      from: tx.from,
      to: tx.to || tx.contractAddress || 'Contract Creation',
      value: `${valueFormatted} ${config.symbol}`,
      valueRaw: tx.value?.toString?.() || tx.value,
      gas: tx.gas || tx.gasLimit?.toString(),
      chain: config.name,
      status: isExplorerAPI 
        ? ((tx.txreceipt_status === '1' || tx.isError === '0') ? 'success' : 'failed')
        : (tx.status === 1 ? 'success' : tx.status === 0 ? 'failed' : 'pending'),
      time: this.formatTimeAgo(txTimestamp),
      date: this.formatDate(txTimestamp),
      timestamp: txTimestamp,
      gasPrice: tx.gasPrice?.toString?.() || tx.gasPrice,
      blockNumber: isExplorerAPI ? parseInt(tx.blockNumber) : tx.blockNumber,
      type, direction, isContractCreation,
      contractAddress: tx.contractAddress || '',
      methodId: tx.methodId || (tx.input?.length >= 10 ? tx.input.slice(0, 10) : undefined),
      input: tx.input || tx.data,
    };
  }

  // Fetch native token price from multiple API providers (no static fallbacks)
  private async fetchPrice(symbol: string, isTestnet: boolean = false): Promise<number> {
    // Always map testnet symbols to their mainnet equivalents for price lookup
    const mappedSymbol = SYMBOL_MAP[symbol.toUpperCase()] || symbol.toUpperCase();
    
    const cacheKey = mappedSymbol.toLowerCase();
    const cached = this.priceCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.PRICE_CACHE_DURATION) return cached.price;
    
    // Try multiple API providers in sequence
    const price = await this.fetchPriceFromAPIs(mappedSymbol);
    
    if (price > 0) {
      this.priceCache.set(cacheKey, { price, timestamp: Date.now() });
      console.log(`💰 Price for ${symbol} (${mappedSymbol}): $${price}`);
      return price;
    }
    
    // If all APIs fail, log error and return 0 (don't use static values)
    console.error(`❌ Failed to fetch price for ${symbol} (mapped to ${mappedSymbol}) from all API providers`);
    return 0;
  }

  // Try multiple price APIs with fallback chain
  private async fetchPriceFromAPIs(symbol: string): Promise<number> {
    // 1. Try CoinGecko first (most reliable, but rate limited)
    const coinGeckoPrice = await this.fetchFromCoinGecko(symbol);
    if (coinGeckoPrice > 0) {
      console.log(`✅ CoinGecko: ${symbol} = $${coinGeckoPrice}`);
      return coinGeckoPrice;
    }

    // 2. Try CoinCap as first fallback (CORS-friendly)
    const coinCapPrice = await this.fetchFromCoinCap(symbol);
    if (coinCapPrice > 0) {
      console.log(`✅ CoinCap: ${symbol} = $${coinCapPrice}`);
      return coinCapPrice;
    }

    // 3. Try CryptoCompare as second fallback
    const cryptoComparePrice = await this.fetchFromCryptoCompare(symbol);
    if (cryptoComparePrice > 0) {
      console.log(`✅ CryptoCompare: ${symbol} = $${cryptoComparePrice}`);
      return cryptoComparePrice;
    }

    // 4. Try KuCoin as third fallback (CORS-friendly, no API key)
    const kucoinPrice = await this.fetchFromKuCoin(symbol);
    if (kucoinPrice > 0) {
      console.log(`✅ KuCoin: ${symbol} = $${kucoinPrice}`);
      return kucoinPrice;
    }

    // 5. Try Binance API as final fallback (may have CORS issues)
    const binancePrice = await this.fetchFromBinance(symbol);
    if (binancePrice > 0) {
      console.log(`✅ Binance: ${symbol} = $${binancePrice}`);
      return binancePrice;
    }

    return 0; // All APIs failed
  }

  // CoinGecko API
  private async fetchFromCoinGecko(symbol: string): Promise<number> {
    const coinId = COIN_IDS[symbol as keyof typeof COIN_IDS];
    if (!coinId) return 0;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(
        `${PRICE_API_COINGECKO}?ids=${coinId}&vs_currencies=usd`,
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const price = data[coinId]?.usd;
        return (price && price > 0) ? price : 0;
      }
    } catch (error) {
      // Silent fail, try next API
    }
    return 0;
  }

  // CoinCap API (free, no API key needed)
  private async fetchFromCoinCap(symbol: string): Promise<number> {
    const coinCapId = COINCAP_IDS[symbol as keyof typeof COINCAP_IDS];
    if (!coinCapId) return 0;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(
        `${PRICE_API_COINCAP}/${coinCapId}`,
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const price = parseFloat(data?.data?.priceUsd);
        return (price && price > 0) ? price : 0;
      }
    } catch (error) {
      // Silent fail, try next API
    }
    return 0;
  }

  // CryptoCompare API (free tier available)
  private async fetchFromCryptoCompare(symbol: string): Promise<number> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(
        `${PRICE_API_CRYPTOCOMPARE}?fsym=${symbol}&tsyms=USD`,
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const price = data?.USD;
        return (price && price > 0) ? price : 0;
      }
    } catch (error) {
      // Silent fail, try next API
    }
    return 0;
  }

  // KuCoin Public API (CORS-friendly, no auth needed)
  private async fetchFromKuCoin(symbol: string): Promise<number> {
    // KuCoin symbol format
    const kucoinSymbols: Record<string, string> = {
      'ETH': 'ETH-USDT',
      'BNB': 'BNB-USDT',
      'MATIC': 'MATIC-USDT',
      'AVAX': 'AVAX-USDT',
    };
    
    const kucoinSymbol = kucoinSymbols[symbol];
    if (!kucoinSymbol) return 0;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(
        `https://api.kucoin.com/api/v1/market/orderbook/level1?symbol=${kucoinSymbol}`,
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data?.code === '200000' && data?.data?.price) {
          const price = parseFloat(data.data.price);
          return (price && price > 0) ? price : 0;
        }
      }
    } catch (error) {
      // Silent fail, try next API
    }
    return 0;
  }

  // Binance Public API (has CORS restrictions, may not work in browser)
  private async fetchFromBinance(symbol: string): Promise<number> {
    // Only support major coins that exist on Binance
    const binanceSymbols: Record<string, string> = {
      'ETH': 'ETHUSDT',
      'BNB': 'BNBUSDT',
      'MATIC': 'MATICUSDT',
      'AVAX': 'AVAXUSDT',
    };
    
    const binanceSymbol = binanceSymbols[symbol];
    if (!binanceSymbol) return 0; // Symbol not supported

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      // Note: Binance API has CORS restrictions from browsers
      const response = await fetch(
        `https://api.binance.com/api/v3/ticker/price?symbol=${binanceSymbol}`,
        { 
          signal: controller.signal,
          mode: 'cors',
        }
      );
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const price = parseFloat(data?.price);
        return (price && price > 0) ? price : 0;
      }
    } catch (error) {
      // Binance has CORS issues from browsers, silently fail
    }
    return 0;
  }

  // Get wallet balance for a specific chain
  async getBalance(address: string, chain: string, config: any): Promise<Balance | null> {
    if (!address) return null;

    // Check cache first
    const cacheKey = `${chain}-${address}`;
    const cached = this.balanceCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.BALANCE_CACHE_DURATION) {
      return cached.balance;
    }

    // Check if there's already a pending request for this balance
    if (this.pendingBalanceRequests.has(cacheKey)) {
      return this.pendingBalanceRequests.get(cacheKey)!;
    }

    // Create new request promise
    const requestPromise = (async () => {
      try {
        const provider = await this.getProviderWithFallback(chain);
        if (!provider) {
          console.warn(`No provider available for ${config.name}`);
          return null;
        }

        // Rate-limited request with error handling
        const balanceWei = await this.makeRateLimitedRequest(
          `balance-${chain}-${address}`,
          async () => await provider.getBalance(address)
        );

        const balanceEth = ethers.formatEther(balanceWei);
        const balanceNum = parseFloat(balanceEth);
        
        // Validate balance is a valid number
        if (isNaN(balanceNum) || !isFinite(balanceNum) || balanceNum < 0) {
          console.error(`Invalid balance for ${config.name}: ${balanceEth}`);
          return null;
        }
        
        // Check if this is a testnet
        const isTestnet = Object.values(TESTNET_CONFIGS).some(c => c.chainId === config.chainId);
        
        // Fetch price (always returns a valid value - either from API or fallback)
        const price = await this.fetchPrice(config.symbol, isTestnet);
        
        // Validate price is a valid number
        if (isNaN(price) || !isFinite(price) || price <= 0) {
          console.error(`Invalid price for ${config.symbol}: ${price}`);
          return null;
        }
        
        // Calculate USD value with proper precision
        const usdValueNum = Number((balanceNum * price).toFixed(2));
        
        // Validate USD value
        if (isNaN(usdValueNum) || !isFinite(usdValueNum) || usdValueNum < 0) {
          console.error(`Invalid USD value for ${config.name}: balanceNum=${balanceNum}, price=${price}, result=${usdValueNum}`);
          return null;
        }
        
        // Format USD value - show for both mainnet and testnet
        const formattedUsdValue = `$${usdValueNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        const usdValue = isTestnet ? `${formattedUsdValue} (Testnet)` : formattedUsdValue;

        const result = {
          chain: config.name,
          symbol: config.symbol,
          balance: balanceNum.toFixed(4),
          usdValue,
          usdValueNum, // Include both mainnet and testnet in portfolio total
          color: config.color,
          rawBalance: balanceWei.toString(),
        };

        // Cache the result
        this.balanceCache.set(cacheKey, { balance: result, timestamp: Date.now() });

        return result;
      } catch (error: any) {
        // Log error but don't spam console for network issues
        if (error?.message?.includes('Rate limit')) {
          console.warn(`⚠️ Rate limit for ${config.name}`);
        } else if (error?.message?.includes('Unauthorized') || error?.message?.includes('API key')) {
          console.warn(`⚠️ ${config.name}: RPC requires API key, skipping...`);
        } else if (error?.code === 'NETWORK_ERROR' || error?.message?.includes('fetch')) {
          console.warn(`⚠️ ${config.name}: Network error, skipping...`);
        } else {
          console.warn(`⚠️ Failed to get balance for ${config.name}:`, error.message || error);
        }
        return null;
      } finally {
        this.pendingBalanceRequests.delete(cacheKey);
      }
    })();

    this.pendingBalanceRequests.set(cacheKey, requestPromise);
    return requestPromise;
  }

  // Get balances across all chains (including custom networks)
  async getAllBalances(address: string): Promise<Balance[]> {
    if (!address) return [];

    console.log('🔍 Starting getAllBalances...');
    
    // Get active configs based on connected chain (default networks)
    const activeConfigs = this.getActiveConfigs();
    const chains = Object.entries(activeConfigs);
    
    // Get custom networks for current mode
    const customNetworks = this.getActiveCustomNetworks();
    
    console.log(`📊 Fetching balances from ${chains.length} default networks and ${customNetworks.length} custom networks`);
    
    // OPTIMIZATION: Fetch all balances in parallel with batching to avoid overwhelming the API
    const BATCH_SIZE = 5; // Process 5 networks at a time
    const allBalances: Balance[] = [];
    
    // Fetch from default networks in batches
    console.log('🌐 Fetching from default networks (parallel)...');
    for (let i = 0; i < chains.length; i += BATCH_SIZE) {
      const batch = chains.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.allSettled(
        batch.map(([key, config]) => this.getBalance(address, key, config))
      );
      
      batchResults.forEach((result, idx) => {
        if (result.status === 'fulfilled' && result.value) {
          allBalances.push(result.value);
          console.log(`✅ Added balance for ${batch[idx][1].name}: ${result.value.balance} ${result.value.symbol}`);
        } else if (result.status === 'rejected') {
          console.log(`⚠️ Failed to fetch balance for ${batch[idx][1].name}`);
        }
      });
    }
    
    // Fetch from custom networks in batches
    if (customNetworks.length > 0) {
      console.log(`🔧 Fetching from ${customNetworks.length} custom networks (parallel)...`);
      for (let i = 0; i < customNetworks.length; i += BATCH_SIZE) {
        const batch = customNetworks.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.allSettled(
          batch.map(network => this.getCustomNetworkBalance(address, network))
        );
        
        batchResults.forEach((result, idx) => {
          if (result.status === 'fulfilled' && result.value) {
            allBalances.push(result.value);
            console.log(`✅ Added custom network balance for ${batch[idx].name}: ${result.value.balance} ${result.value.symbol}`);
          } else if (result.status === 'rejected') {
            console.log(`⚠️ Failed to fetch balance for custom network ${batch[idx].name}`);
          }
        });
      }
    } else {
      console.log('ℹ️ No custom networks configured for current mode');
    }
    
    console.log(`✅ getAllBalances complete: ${allBalances.length} balances fetched`);
    return allBalances;
  }

  // Get balance for custom network
  async getCustomNetworkBalance(address: string, network: CustomNetwork): Promise<Balance | null> {
    if (!address) return null;

    try {
      console.log(`🔍 Fetching balance for custom network: ${network.name} (Chain ID: ${network.chainId})`);
      const provider = this.getOrCreateCustomProvider(network);

      // Test provider connectivity first with fallback support
      let workingProvider = provider;
      try {
        await provider.getNetwork();
        console.log(`✅ Provider connected for ${network.name}`);
      } catch (connError: any) {
        console.warn(`⚠️ Primary RPC failed for ${network.name}, trying fallbacks...`);
        
        // Try fallback providers
        const fallbacks = this.fallbackProviders.get(network.id);
        if (fallbacks && fallbacks.length > 0) {
          let fallbackWorked = false;
          for (const fallbackProvider of fallbacks) {
            try {
              await fallbackProvider.getNetwork();
              workingProvider = fallbackProvider;
              fallbackWorked = true;
              console.log(`✅ Fallback provider connected for ${network.name}`);
              break;
            } catch {
              continue;
            }
          }
          if (!fallbackWorked) {
            console.error(`❌ All RPC endpoints failed for ${network.name}`);
            throw new Error(`All RPC endpoints failed`);
          }
        } else {
          console.error(`❌ Failed to connect to ${network.name} RPC:`, connError.message);
          throw new Error(`RPC connection failed: ${connError.message}`);
        }
      }

      // Rate-limited request with error handling
      const balanceWei = await this.makeRateLimitedRequest(
        `balance-${network.id}-${address}`,
        async () => {
          console.log(`🔄 Requesting balance from ${network.name}...`);
          return await workingProvider.getBalance(address);
        }
      );

      console.log(`💰 Raw balance for ${network.name}: ${balanceWei.toString()}`);

      const balanceEth = ethers.formatUnits(balanceWei, network.decimals);
      const balanceNum = parseFloat(balanceEth);
      
      console.log(`📊 Formatted balance for ${network.name}: ${balanceNum} ${network.symbol}`);
      
      // Validate balance is a valid number
      if (isNaN(balanceNum) || !isFinite(balanceNum) || balanceNum < 0) {
        console.error(`❌ Invalid balance for ${network.name}: ${balanceEth}`);
        return null;
      }
      
      // Try to fetch price (may not be available for custom tokens)
      const price = await this.fetchPrice(network.symbol, network.type === 'testnet');
      console.log(`💵 Price for ${network.symbol}: $${price}`);
      
      // Calculate USD value if price is available
      const usdValueNum = price > 0 ? Number((balanceNum * price).toFixed(2)) : 0;
      
      // Format USD value
      const formattedUsdValue = usdValueNum > 0 
        ? `$${usdValueNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : '$0.00';
      const usdValue = network.type === 'testnet' ? `${formattedUsdValue} (Testnet)` : formattedUsdValue;

      const result = {
        chain: network.name,
        symbol: network.symbol,
        balance: balanceNum.toFixed(4),
        usdValue,
        usdValueNum,
        color: network.color,
        rawBalance: balanceWei.toString(),
      };
      
      console.log(`✅ Successfully fetched balance for ${network.name}:`, result);
      return result;
    } catch (error: any) {
      console.error(`❌ Failed to get balance for custom network ${network.name}:`, {
        error: error.message || error,
        stack: error.stack,
        rpcUrl: network.rpcUrl,
        chainId: network.chainId
      });
      return null;
    }
  }

  // Get ALL transactions for an address using backend API (Alchemy-powered)
  async getTransactionsFromBackend(address: string): Promise<Transaction[]> {
    try {
      // Determine network mode from localStorage (mainnet or testnet)
      const useTestnet = typeof window !== 'undefined' 
        ? localStorage.getItem('useTestnet') === 'true'
        : false;
      const networkMode = useTestnet ? 'testnet' : 'mainnet';
      
      console.log(`📡 Fetching ${networkMode.toUpperCase()} transactions from backend API for ${address}`);
      
      const response = await fetch(`${BACKEND_API_URL}/api/transactions/${address}?mode=${networkMode}`, {
        signal: AbortSignal.timeout(30000) // 30 second timeout
      });
      
      if (!response.ok) {
        throw new Error(`Backend API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch from backend');
      }
      
      console.log(`📊 Backend returned ${data.transactions?.length || 0} transactions for ${data.networkMode || 'unknown'} mode`);
      
      // If no transactions found, log the network mode
      if (!data.transactions || data.transactions.length === 0) {
        console.log(`ℹ️ No transactions found in ${data.networkMode || 'current'} network`);
      }
      
      // Log first transaction for debugging
      // if (data.transactions && data.transactions.length > 0) {
      //   console.log('Sample transaction:', JSON.stringify(data.transactions[0], null, 2));
      // }
      
      // Transform backend response to match our Transaction interface
      const transactions: Transaction[] = data.transactions.map((tx: any, index: number) => {
        // Alchemy returns value as a decimal number (not wei), so use it directly
        const value = tx.value !== null && tx.value !== undefined ? parseFloat(tx.value) : 0;
        const valueFormatted = value > 0 ? value.toFixed(6) : '0';
        
        // Parse timestamp correctly - backend returns ISO string in metadata.blockTimestamp
        let txTimestamp: number;
        if (tx.metadata?.blockTimestamp) {
          // Convert ISO string to Unix timestamp (in seconds)
          const date = new Date(tx.metadata.blockTimestamp);
          if (!isNaN(date.getTime())) {
            txTimestamp = Math.floor(date.getTime() / 1000);
          } else {
            console.warn(`Invalid timestamp for tx ${tx.hash}: ${tx.metadata.blockTimestamp}`);
            // Fallback: Use block number to estimate timestamp (approximate)
            // Average 12 seconds per block for Ethereum-like chains
            const blockNum = tx.blockNum ? parseInt(tx.blockNum, 16) : 0;
            const estimatedTime = Date.now() - (blockNum > 0 ? (1000000 - blockNum) * 12 * 1000 : 0);
            txTimestamp = Math.floor(estimatedTime / 1000) - index; // Add index to make unique
          }
        } else {
          // Fallback: Use block number to estimate timestamp
          const blockNum = tx.blockNum ? parseInt(tx.blockNum, 16) : 0;
          if (blockNum > 0) {
            // Estimate based on average block time (12 seconds for most EVM chains)
            // This is approximate - newer blocks = more recent timestamp
            const currentBlock = 100000000; // Approximate current block (high estimate)
            const blocksDiff = currentBlock - blockNum;
            const secondsAgo = blocksDiff * 12; // 12 seconds per block
            txTimestamp = Math.floor(Date.now() / 1000) - secondsAgo - index; // Subtract index for uniqueness
          } else {
            // Last resort: use current time with offset based on position in array
            txTimestamp = Math.floor(Date.now() / 1000) - (index * 10); // 10 second offset per transaction
          }
          console.warn(`No timestamp for tx ${tx.hash}, estimated from block ${blockNum}: ${new Date(txTimestamp * 1000).toISOString()}`);
        }
        
        // Get asset symbol, default to 'ETH' if not provided
        const asset = tx.asset || 'ETH';
        
        // Get transaction status from backend txStatus field
        const txStatus: 'success' | 'pending' | 'failed' = 
          tx.txStatus === 'failed' ? 'failed' : 
          tx.txStatus === 'pending' ? 'pending' : 'success';
        
        return {
          hash: tx.hash,
          from: tx.from || '',
          to: tx.to || 'Contract Deployment',
          value: `${valueFormatted} ${asset}`,
          valueRaw: value.toString(),
          gas: tx.gas?.toString() || '0',
          chain: tx.network || 'Unknown',
          status: txStatus,
          time: this.formatTimeAgo(txTimestamp),
          date: this.formatDate(txTimestamp),
          timestamp: txTimestamp,
          blockNumber: tx.blockNum ? parseInt(tx.blockNum, 16) : 0,
          type: (!tx.to || tx.to === null) ? 'contract-deployment' : 
                (tx.category === 'erc20' || tx.category === 'erc721' || tx.category === 'erc1155') ? 'contract-interaction' : 'transfer',
          direction: tx.direction as 'sent' | 'received',
          isContractCreation: !tx.to || tx.to === null,
          contractAddress: tx.contractAddress || '',
        };
      });
      
      console.log(`✅ Backend API returned ${transactions.length} transactions`);
      return transactions;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.error('⏱️ Backend request timed out (30s)');
        } else if (error.message.includes('Failed to fetch')) {
          console.error('🔌 Cannot connect to backend - is it running on port 3001?');
        } else {
          console.error('❌ Backend API error:', error.message);
        }
      } else {
        console.error('❌ Unknown backend error:', error);
      }
      // Throw error so caller knows backend failed
      throw error;
    }
  }

  // Get ALL transactions for an address using block explorer APIs
  async getTransactionsFromExplorer(address: string, chain: string, config: any): Promise<Transaction[]> {
    const apiDomain = API_DOMAINS[config.chainId];
    if (!apiDomain) {
      return [];
    }

    try {
      const apiKey = API_KEYS[config.chainId];
      const apiKeyParam = apiKey ? `&apikey=${apiKey}` : '';
      const apiUrl = `https://${apiDomain}/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=desc${apiKeyParam}`;
      
      const response = await fetch(apiUrl);
      const data = await response.json();

      if (data.status === '1' && Array.isArray(data.result)) {
        const transactions = data.result.map((tx: any) => this.parseTransaction(tx, address, config, true));
        console.log(`✓ Explorer: Found ${transactions.length} transactions on ${config.name}`);
        return transactions;
      } else if (data.status === '0' && data.message === 'No transactions found') {
        console.log(`✓ Explorer: No transactions on ${config.name}`);
        return [];
      }
      
      // For any other status (including NOTOK), return empty and let RPC handle it
      if (data.status === '0' && data.message === 'NOTOK') {
        // This usually means API key is required, silently fall back to RPC
        return [];
      }
      
      return [];
    } catch (error) {
      // Silent fail, let RPC handle it
      return [];
    }
  }

  // Get ALL transactions for an address (RPC fallback method)
  async getTransactions(address: string, chain: string, config: any, limit: number = 50): Promise<Transaction[]> {
    if (!address) return [];

    try {
      const provider = await this.getProviderWithFallback(chain);
      if (!provider) return [];

      const currentBlock = await this.makeRateLimitedRequest(
        `block-${chain}`,
        async () => await provider.getBlockNumber()
      );

      const blocksToCheck = Math.min(50, currentBlock); // Scan only last 50 blocks for speed
      const transactions: Transaction[] = [];
      const BATCH_SIZE = 10; // Check 10 blocks at a time
      
      // Process blocks in batches
      for (let i = 0; i < blocksToCheck && transactions.length < limit; i += BATCH_SIZE) {
        const batchEnd = Math.min(i + BATCH_SIZE, blocksToCheck);
        const blockNumbers = Array.from(
          { length: batchEnd - i }, 
          (_, idx) => currentBlock - i - idx
        );

        try {
          // Fetch blocks WITHOUT transaction details (just hashes) - sequentially to avoid rate limits
          const blocks = [];
          for (const blockNum of blockNumbers) {
            try {
              const block = await this.makeRateLimitedRequest(
                `block-${chain}-${blockNum}`,
                async () => await provider.getBlock(blockNum, false)
              );
              blocks.push(block);
            } catch (e) {
              blocks.push(null);
            }
          }

          // Check each block
          for (const block of blocks) {
            if (!block || !block.transactions || transactions.length >= limit) continue;

            const txHashes = block.transactions as string[];
            if (txHashes.length === 0) continue;
            
            // Check first few transactions sequentially
            for (const txHash of txHashes.slice(0, 10)) {
              if (transactions.length >= limit) break;
              
              try {
                const txDetails = await this.makeRateLimitedRequest(
                  `tx-${chain}-${txHash}`,
                  async () => await provider.getTransaction(txHash)
                );

                if (!txDetails) continue;

                // Quick address check
                if (txDetails.from?.toLowerCase() !== address.toLowerCase() && 
                    txDetails.to?.toLowerCase() !== address.toLowerCase()) {
                  continue;
                }

                const receipt = await this.makeRateLimitedRequest(
                  `receipt-${chain}-${txHash}`,
                  async () => await provider.getTransactionReceipt(txHash)
                );
                
                const txData = {
                  ...txDetails,
                  value: txDetails.value,
                  gasLimit: txDetails.gasLimit,
                  status: receipt?.status || 0,
                  timestamp: block.timestamp,
                  contractAddress: receipt?.contractAddress,
                  data: txDetails.data,
                };

                transactions.push(this.parseTransaction(txData, address, config, false));
              } catch {
                continue;
              }
            }

            if (transactions.length >= limit) break;
          }
        } catch (batchError) {
          // Continue with next batch
          continue;
        }
      }

      if (transactions.length > 0) {
        console.log(`  ✓ ${config.name}: ${transactions.length} txs`);
      } else {
        console.log(`  ○ ${config.name}: No recent txs`);
      }
      
      return transactions;
    } catch (error: any) {
      if (error?.message?.includes('Rate limit')) {
        console.error(`Rate limit error for ${config.name}:`, error.message);
      } else {
        console.error(`${config.name} scan failed:`, error);
      }
      return [];
    }
  }

  // Clear transaction cache (for manual refresh)
  clearTransactionCache(address?: string): void {
    if (address) {
      const cacheKey = `${address}-txs`;
      this.transactionCache.delete(cacheKey);
      console.log(`🗑️ Cleared transaction cache for ${address}`);
    } else {
      this.transactionCache.clear();
      console.log(`🗑️ Cleared all transaction caches`);
    }
  }

  // Get ALL transactions from all chains (with caching and deduplication)
  async getAllTransactions(address: string, forceRefresh: boolean = false): Promise<Transaction[]> {
    if (!address) return [];

    const cacheKey = `${address}-txs`;
    
    // Clear cache if force refresh requested
    if (forceRefresh) {
      this.clearTransactionCache(address);
    }
    
    // Check cache first
    const cached = this.transactionCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.TX_CACHE_DURATION) {
      console.log(`📦 Returning cached transactions (${cached.transactions.length} txs)`);
      return cached.transactions;
    }

    // Check if there's already a pending request for this address
    if (this.pendingRequests.has(cacheKey)) {
      console.log(`⏳ Waiting for existing request...`);
      return this.pendingRequests.get(cacheKey)!;
    }

    // Create new request promise
    const requestPromise = this.fetchTransactionsInternal(address);
    this.pendingRequests.set(cacheKey, requestPromise);

    try {
      const transactions = await requestPromise;
      
      // Cache the results
      this.transactionCache.set(cacheKey, {
        transactions,
        timestamp: Date.now()
      });
      
      return transactions;
    } finally {
      // Clean up pending request
      this.pendingRequests.delete(cacheKey);
    }
  }

  // Fetch transactions from custom network via backend
  async getCustomNetworkTransactions(address: string, network: CustomNetwork): Promise<Transaction[]> {
    try {
      console.log(`📡 Fetching transactions from custom network ${network.name} via backend`);
      
      const response = await fetch(`${BACKEND_API_URL}/api/transactions/custom/${address}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rpcUrl: network.rpcUrl,
          networkName: network.name,
          categories: ["external", "erc20", "erc721", "erc1155"], // Standard categories
        }),
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });
      
      if (!response.ok) {
        throw new Error(`Backend API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch from backend');
      }
      
      console.log(`📊 Backend returned ${data.transactions?.length || 0} transactions for ${network.name}`);
      
      // Transform backend response to match our Transaction interface
      const transactions: Transaction[] = (data.transactions || []).map((tx: any) => {
        const value = tx.value !== null && tx.value !== undefined ? parseFloat(tx.value) : 0;
        const valueFormatted = value > 0 ? value.toFixed(6) : '0';
        
        // Parse timestamp
        let txTimestamp: number;
        if (tx.metadata?.blockTimestamp) {
          const date = new Date(tx.metadata.blockTimestamp);
          if (!isNaN(date.getTime())) {
            txTimestamp = Math.floor(date.getTime() / 1000);
          } else {
            txTimestamp = Math.floor(Date.now() / 1000);
          }
        } else {
          txTimestamp = Math.floor(Date.now() / 1000);
        }
        
        const asset = tx.asset || network.symbol;
        
        // Get transaction status from backend txStatus field
        const txStatus: 'success' | 'pending' | 'failed' = 
          tx.txStatus === 'failed' ? 'failed' : 
          tx.txStatus === 'pending' ? 'pending' : 'success';
        
        return {
          hash: tx.hash,
          from: tx.from || '',
          to: tx.to || 'Contract Deployment',
          value: `${valueFormatted} ${asset}`,
          valueRaw: value.toString(),
          gas: tx.gas?.toString() || '0',
          chain: network.name,
          status: txStatus,
          time: this.formatTimeAgo(txTimestamp),
          date: this.formatDate(txTimestamp),
          timestamp: txTimestamp,
          blockNumber: tx.blockNum ? parseInt(tx.blockNum, 16) : 0,
          type: (!tx.to || tx.to === null) ? 'contract-deployment' : 
                (tx.category === 'erc20' || tx.category === 'erc721' || tx.category === 'erc1155') ? 'contract-interaction' : 'transfer',
          direction: tx.direction as 'sent' | 'received',
          isContractCreation: !tx.to || tx.to === null,
          contractAddress: tx.contractAddress || '',
        };
      });
      
      return transactions;
    } catch (error) {
      console.error(`❌ Failed to fetch transactions for ${network.name}:`, error);
      return [];
    }
  }

  // Internal method to fetch transactions (including custom networks)
  private async fetchTransactionsInternal(address: string): Promise<Transaction[]> {
    console.log(`🔍 Starting transaction fetch for ${address}...`);
    
    // Try backend API first (Alchemy-powered - most comprehensive)
    let backendFailed = false;
    try {
      const backendTxs = await this.getTransactionsFromBackend(address);
      // If we get here, backend succeeded (even if 0 transactions)
      console.log(`✅ Backend API succeeded: ${backendTxs.length} transactions found`);
      
      // Also fetch from custom networks
      const customNetworks = this.getActiveCustomNetworks();
      const customTxs: Transaction[] = [];
      
      for (const network of customNetworks) {
        try {
          const txs = await this.getCustomNetworkTransactions(address, network);
          customTxs.push(...txs);
        } catch (error) {
          console.error(`Error fetching custom network ${network.name}:`, error);
        }
      }
      
      // Combine and sort all transactions
      const allTxs = [...backendTxs, ...customTxs].sort((a, b) => b.timestamp - a.timestamp);
      console.log(`✅ Total transactions (default + custom): ${allTxs.length}`);
      
      return allTxs;
    } catch (error) {
      // Only fall back if backend actually failed/errored
      console.log(`⚠️ Backend API failed, falling back to explorers...`);
      backendFailed = true;
    }
    
    // Only reach here if backend failed
    if (!backendFailed) {
      return [];
    }
    
    const activeConfigs = this.getActiveConfigs();
    const chains = Object.entries(activeConfigs);
    
    console.log(`🔍 Searching transactions across ${chains.length} chains...`);
    
    const allTxs: Transaction[] = [];
    
    // Fetch from chains sequentially to avoid rate limiting
    for (const [key, config] of chains) {
      try {
        // Try explorer API first (silent - no logs if it fails)
        const explorerTxs = await this.getTransactionsFromExplorer(address, key, config);
        
        if (explorerTxs.length > 0) {
          allTxs.push(...explorerTxs);
        } else {
          // Fallback to RPC method if explorer returns empty
          console.log(`🔎 Scanning ${config.name} blocks...`);
          const rpcTxs = await this.getTransactions(address, key, config, 50);
          allTxs.push(...rpcTxs);
        }
        
        // Small delay between chain requests
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (error) {
        console.error(`❌ ${config.name} error:`, error);
        // Continue with other chains
      }
    }

    // Fetch from custom networks as fallback
    const customNetworks = this.getActiveCustomNetworks();
    for (const network of customNetworks) {
      try {
        const txs = await this.getCustomNetworkTransactions(address, network);
        allTxs.push(...txs);
      } catch (error) {
        console.error(`❌ ${network.name} error:`, error);
      }
    }

    // Sort by timestamp (most recent first)
    const sortedTxs = allTxs.sort((a, b) => b.timestamp - a.timestamp);
    
    console.log(`✅ Found ${sortedTxs.length} total transactions (sorted by timestamp)`);
    return sortedTxs;
  }



  // Format timestamp to relative time
  private formatTimeAgo(timestamp: number): string {
    const now = Math.floor(Date.now() / 1000);
    const diff = now - timestamp;

    if (diff < 60) return `${diff} secs ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)} mins ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    return `${Math.floor(diff / 86400)} days ago`;
  }

  // Format timestamp to readable date
  private formatDate(timestamp: number): string {
    const date = new Date(timestamp * 1000);
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return date.toLocaleDateString('en-US', options);
  }

  // Get total portfolio value
  async getTotalValue(address: string): Promise<number> {
    if (!address) return 0;
    
    try {
      const balances = await this.getAllBalances(address);
      
      // Sum up the numeric USD values (includes testnet balances calculated at mainnet prices)
      const total = balances.reduce((sum, balance) => {
        const value = balance.usdValueNum;
        
        // Skip if value is undefined, null, or invalid
        if (value === undefined || value === null || isNaN(value) || !isFinite(value) || value < 0) {
          console.warn(`Skipping invalid balance value for ${balance.chain}:`, value);
          return sum;
        }
        
        // Add with proper precision
        return Number((sum + value).toFixed(2));
      }, 0);
      
      // Ensure total is a valid number and round to 2 decimals
      if (isNaN(total) || !isFinite(total) || total < 0) {
        console.error('Invalid total portfolio value:', total);
        return 0;
      }
      
      // Return with proper precision (2 decimal places)
      return Number(total.toFixed(2));
    } catch (error) {
      console.error('Error calculating total portfolio value:', error);
      return 0;
    }
  }

  // Get explorer URL for a transaction hash based on chain name
  getExplorerUrl(chainName: string, txHash: string): string {
    // Check if it's a custom network first
    const customNetworks = getCustomNetworks();
    const customNetwork = customNetworks.find(n => n.name === chainName);
    
    if (customNetwork && customNetwork.explorerUrl) {
      // Ensure explorer URL ends with /tx/ if it doesn't already
      const baseUrl = customNetwork.explorerUrl.endsWith('/') 
        ? `${customNetwork.explorerUrl}tx/` 
        : `${customNetwork.explorerUrl}/tx/`;
      return `${baseUrl}${txHash}`;
    }
    
    const explorerMap: Record<string, string> = {
      // Mainnet
      'Ethereum': 'https://etherscan.io/tx/',
      'Ethereum Mainnet': 'https://etherscan.io/tx/',
      'Polygon': 'https://polygonscan.com/tx/',
      'Polygon Mainnet': 'https://polygonscan.com/tx/',
      'BSC': 'https://bscscan.com/tx/',
      'BNB Chain': 'https://bscscan.com/tx/',
      'BNB Mainnet': 'https://bscscan.com/tx/',
      'Arbitrum': 'https://arbiscan.io/tx/',
      'Arbitrum One': 'https://arbiscan.io/tx/',
      'Optimism': 'https://optimistic.etherscan.io/tx/',
      'Base': 'https://basescan.org/tx/',
      'Avalanche': 'https://snowtrace.io/tx/',
      'Avalanche C-Chain': 'https://snowtrace.io/tx/',
      // Testnet
      'Sepolia': 'https://sepolia.etherscan.io/tx/',
      'Ethereum Sepolia': 'https://sepolia.etherscan.io/tx/',
      'Hoodi': 'https://holesky.etherscan.io/tx/',
      'Ethereum Hoodi': 'https://holesky.etherscan.io/tx/',
      'Polygon Amoy': 'https://amoy.polygonscan.com/tx/',
      'BSC Testnet': 'https://testnet.bscscan.com/tx/',
      'BNB Testnet': 'https://testnet.bscscan.com/tx/',
      'Arbitrum Sepolia': 'https://sepolia.arbiscan.io/tx/',
      'Optimism Sepolia': 'https://sepolia-optimism.etherscan.io/tx/',
      'Base Sepolia': 'https://sepolia.basescan.org/tx/',
      'Avalanche Fuji': 'https://testnet.snowtrace.io/tx/',
    };
    
    const baseUrl = explorerMap[chainName] || 'https://etherscan.io/tx/';
    return `${baseUrl}${txHash}`;
  }
}

// Export singleton instance
export const blockchainService = new BlockchainService();
