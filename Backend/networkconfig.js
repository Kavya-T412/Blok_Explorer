/**
 * Centralized Network Configuration
 * Used by both index.js and swap.js for blockchain network settings
 */

// ============================================
// ALCHEMY API KEY
// ============================================
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY || 'ivn1pyvI9XKDlq_0bKxTj';

// ============================================
// ALCHEMY RPC ENDPOINTS
// ============================================
const ALCHEMY_ENDPOINTS = {
  // Mainnet
  1: `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
  137: `https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
  56: `https://bnb-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
  42161: `https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
  10: `https://opt-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
  8453: `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
  43114: `https://avax-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
  // Testnet
  11155111: `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
  17000: `https://eth-holesky.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
  80002: `https://polygon-amoy.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
  97: `https://bnb-testnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
  421614: `https://arb-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
  11155420: `https://opt-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
  84532: `https://base-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
  43113: `https://avax-fuji.g.alchemy.com/v2/${ALCHEMY_API_KEY}`
};

// ============================================
// DEX ROUTER ADDRESSES BY CHAIN
// ============================================
const DEX_ROUTERS = {
  // Mainnet DEX Routers
  1: {
    // Ethereum Mainnet
    uniswapV3: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45', // SwapRouter02
    sushiswap: '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F'
  },
  137: {
    // Polygon Mainnet - Use QuickSwap (V2)
    quickswap: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff', // QuickSwap V2 Router
    uniswapV3: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45', // SwapRouter02 (fallback)
    sushiswap: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
  },
  56: {
    // BSC Mainnet
    pancakeswap: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
    pancakeswapV3: '0x13f4EA83D0bd40E75C8222255bc855a974568Dd4' // PancakeSwap V3 SmartRouter
  },
  42161: {
    // Arbitrum One
    uniswapV3: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45', // SwapRouter02
    sushiswap: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
    camelot: '0xc873fEcbd354f5A56E00E710B90EF4201db2448d'
  },
  10: {
    // Optimism
    uniswapV3: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45', // SwapRouter02
    velodrome: '0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858'
  },
  8453: {
    // Base
    uniswapV3: '0x2626664c2603336E57B271c5C0b26F421741e481', // SwapRouter02 on Base
    aerodrome: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43'
  },
  43114: {
    // Avalanche C-Chain
    traderjoe: '0xb4315e873dBcf96Ffd0acd8EA43f689D8c20fB30', // JoeRouter02
    pangolin: '0xE54Ca86531e17Ef3616d22Ca28b0D458b6C89106'
  },
  // Testnet DEX Routers
  11155111: {
    // Sepolia
    uniswapV3: '0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E' // SwapRouter02 on Sepolia
  },
  80002: {
    // Polygon Amoy - Use QuickSwap (V2)
    quickswap: '0x8954AfA98594b838bda56FE4C12a09D7739D179b', // QuickSwap V2 Router on Amoy
    uniswapV3: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45' // Fallback if available
  },
  97: {
    // BSC Testnet
    pancakeswap: '0xD99D1c33F9fC3444f8101754aBC46c52416550D1'
  },
  421614: {
    // Arbitrum Sepolia
    uniswapV3: '0x101F443B4d1b059569D643917553c771E1b9663E'
  },
  11155420: {
    // Optimism Sepolia
    uniswapV3: '0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4'
  },
  84532: {
    // Base Sepolia
    uniswapV3: '0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4'
  },
  43113: {
    // Avalanche Fuji
    traderjoe: '0xd7f655E3376cE2D7A2b08fF01Eb3B1023191A901' // JoeRouter on Fuji
  }
};

// ============================================
// WRAPPED NATIVE TOKEN ADDRESSES BY CHAIN
// ============================================
const WRAPPED_NATIVE = {
  // Mainnet
  1: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH (Ethereum)
  137: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', // WMATIC (Polygon)
  56: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', // WBNB (BSC)
  42161: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', // WETH (Arbitrum)
  10: '0x4200000000000000000000000000000000000006', // WETH (Optimism)
  8453: '0x4200000000000000000000000000000000000006', // WETH (Base)
  43114: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7', // WAVAX (Avalanche)
  // Testnet
  11155111: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14', // WETH (Sepolia)
  17000: '0x94373a4919B3240D86eA41593D5eBa789FEF3848', // WETH (Holesky)
  80002: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff', // WMATIC (Amoy) - Official address
  97: '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd', // WBNB (BSC Testnet)
  421614: '0x980B62Da83eFf3D4576C647993b0c1D7faf17c73', // WETH (Arbitrum Sepolia)
  11155420: '0x4200000000000000000000000000000000000006', // WETH (Optimism Sepolia)
  84532: '0x4200000000000000000000000000000000000006', // WETH (Base Sepolia)
  43113: '0xd00ae08403B9bbb9124bB305C09058E32C39A48c' // WAVAX (Fuji)
};

// ============================================
// STABLECOIN ADDRESSES BY CHAIN
// ============================================
const STABLECOINS = {
  // Mainnet
  1: {
    USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F'
  },
  137: {
    USDC: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', // Native USDC on Polygon
    'USDC.e': '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', // Bridged USDC
    USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    DAI: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063'
  },
  56: {
    USDC: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
    USDT: '0x55d398326f99059fF775485246999027B3197955',
    BUSD: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56'
  },
  42161: {
    USDC: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
    USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
  },
  10: {
    USDC: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607',
    USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
    DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
  },
  8453: {
    USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb'
  },
  43114: {
    USDC: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
    USDT: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7',
    DAI: '0xd586E7F844cEa2F87f50152665BCbc2C279D8d70'
  },
  // Testnet - Sepolia uses Uniswap's official test tokens with V3 pools
  11155111: {
    USDC: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    DAI: '0x68194a729C2450ad26072b3D33ADaCbcef39D574',
    UNI: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
    LINK: '0x779877A7B0D9E8603169DdbD7836e478b4624789'
  },
  97: {
    USDT: '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd',
    BUSD: '0xaB1a4d4f1D656d2450692D237fdD6C7f9146e814'
  },
  43113: {
    USDC: '0x5425890298aed601595a70AB815c96711a31Bc65'
  }
};

// ============================================
// NETWORK CONFIGURATIONS
// ============================================
const NETWORK_CONFIGS = {
  // ===== MAINNET =====
  1: {
    name: 'Ethereum Mainnet',
    symbol: 'ETH',
    rpcUrl: ALCHEMY_ENDPOINTS[1],
    fallbackRpcUrls: ['https://ethereum-rpc.publicnode.com', 'https://eth.llamarpc.com', 'https://rpc.flashbots.net'],
    explorer: 'https://etherscan.io',
    type: 'mainnet',
    defaultDex: 'uniswapV3' // Use Uniswap V3
  },
  137: {
    name: 'Polygon',
    symbol: 'MATIC',
    rpcUrl: ALCHEMY_ENDPOINTS[137],
    fallbackRpcUrls: ['https://polygon-rpc.com', 'https://polygon-bor-rpc.publicnode.com'],
    explorer: 'https://polygonscan.com',
    type: 'mainnet',
    defaultDex: 'quickswap'
  },
  56: {
    name: 'BSC',
    symbol: 'BNB',
    rpcUrl: ALCHEMY_ENDPOINTS[56],
    fallbackRpcUrls: ['https://bsc-dataseed.binance.org', 'https://bsc-rpc.publicnode.com'],
    explorer: 'https://bscscan.com',
    type: 'mainnet',
    defaultDex: 'pancakeswapV3' // Use PancakeSwap V3 (Uniswap V3 fork)
  },
  42161: {
    name: 'Arbitrum One',
    symbol: 'ETH',
    rpcUrl: ALCHEMY_ENDPOINTS[42161],
    fallbackRpcUrls: ['https://arbitrum-one-rpc.publicnode.com', 'https://arb1.arbitrum.io/rpc'],
    explorer: 'https://arbiscan.io',
    type: 'mainnet',
    defaultDex: 'uniswapV3'
  },
  10: {
    name: 'Optimism',
    symbol: 'ETH',
    rpcUrl: ALCHEMY_ENDPOINTS[10],
    fallbackRpcUrls: ['https://optimism-rpc.publicnode.com', 'https://mainnet.optimism.io'],
    explorer: 'https://optimistic.etherscan.io',
    type: 'mainnet',
    defaultDex: 'uniswapV3'
  },
  8453: {
    name: 'Base',
    symbol: 'ETH',
    rpcUrl: ALCHEMY_ENDPOINTS[8453],
    fallbackRpcUrls: ['https://base-rpc.publicnode.com', 'https://mainnet.base.org'],
    explorer: 'https://basescan.org',
    type: 'mainnet',
    defaultDex: 'uniswapV3'
  },
  43114: {
    name: 'Avalanche',
    symbol: 'AVAX',
    rpcUrl: ALCHEMY_ENDPOINTS[43114],
    fallbackRpcUrls: ['https://avalanche-c-chain-rpc.publicnode.com', 'https://api.avax.network/ext/bc/C/rpc'],
    explorer: 'https://snowtrace.io',
    type: 'mainnet',
    defaultDex: 'traderjoe' // Use TraderJoe V2
  },
  // ===== TESTNET =====
  11155111: {
    name: 'Sepolia',
    symbol: 'ETH',
    rpcUrl: ALCHEMY_ENDPOINTS[11155111],
    fallbackRpcUrls: ['https://ethereum-sepolia-rpc.publicnode.com', 'https://rpc.sepolia.org'],
    explorer: 'https://sepolia.etherscan.io',
    type: 'testnet',
    defaultDex: 'uniswapV3'
  },
  17000: {
    name: 'Holesky',
    symbol: 'ETH',
    rpcUrl: ALCHEMY_ENDPOINTS[17000],
    fallbackRpcUrls: ['https://ethereum-holesky-rpc.publicnode.com', 'https://rpc.holesky.ethpandaops.io'],
    explorer: 'https://holesky.etherscan.io',
    type: 'testnet',
    defaultDex: 'uniswapV3'
  },
  80002: {
    name: 'Polygon Amoy',
    symbol: 'MATIC',
    rpcUrl: ALCHEMY_ENDPOINTS[80002],
    fallbackRpcUrls: ['https://rpc-amoy.polygon.technology', 'https://polygon-amoy-bor-rpc.publicnode.com'],
    explorer: 'https://amoy.polygonscan.com',
    type: 'testnet',
    defaultDex: 'quickswap'
  },
  97: {
    name: 'BSC Testnet',
    symbol: 'tBNB',
    rpcUrl: ALCHEMY_ENDPOINTS[97],
    fallbackRpcUrls: ['https://bsc-testnet-rpc.publicnode.com', 'https://data-seed-prebsc-1-s1.binance.org:8545'],
    explorer: 'https://testnet.bscscan.com',
    type: 'testnet',
    defaultDex: 'pancakeswap'
  },
  421614: {
    name: 'Arbitrum Sepolia',
    symbol: 'ETH',
    rpcUrl: ALCHEMY_ENDPOINTS[421614],
    fallbackRpcUrls: ['https://arbitrum-sepolia-rpc.publicnode.com', 'https://sepolia-rollup.arbitrum.io/rpc'],
    explorer: 'https://sepolia.arbiscan.io',
    type: 'testnet',
    defaultDex: 'uniswapV3'
  },
  11155420: {
    name: 'Optimism Sepolia',
    symbol: 'ETH',
    rpcUrl: ALCHEMY_ENDPOINTS[11155420],
    fallbackRpcUrls: ['https://optimism-sepolia-rpc.publicnode.com', 'https://sepolia.optimism.io'],
    explorer: 'https://sepolia-optimistic.etherscan.io',
    type: 'testnet',
    defaultDex: 'uniswapV3'
  },
  84532: {
    name: 'Base Sepolia',
    symbol: 'ETH',
    rpcUrl: ALCHEMY_ENDPOINTS[84532],
    fallbackRpcUrls: ['https://sepolia.base.org', 'https://base-sepolia-rpc.publicnode.com'],
    explorer: 'https://sepolia.basescan.org',
    type: 'testnet',
    defaultDex: 'uniswapV3'
  },
  43113: {
    name: 'Avalanche Fuji',
    symbol: 'AVAX',
    rpcUrl: ALCHEMY_ENDPOINTS[43113],
    fallbackRpcUrls: ['https://avalanche-fuji-c-chain-rpc.publicnode.com', 'https://api.avax-test.network/ext/bc/C/rpc'],
    explorer: 'https://testnet.snowtrace.io',
    type: 'testnet',
    defaultDex: 'traderjoe'
  }
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get network configuration by chain ID
 * @param {number} chainId - The blockchain chain ID
 * @returns {Object|null} - Network configuration or null if not found
 */
function getNetworkConfig(chainId) {
  return NETWORK_CONFIGS[chainId] || null;
}

/**
 * Get RPC URL with fallback support
 * @param {number} chainId - The blockchain chain ID
 * @returns {string} - Primary RPC URL
 */
function getRpcUrl(chainId) {
  const config = getNetworkConfig(chainId);
  return config ? config.rpcUrl : null;
}

/**
 * Get all RPC URLs including fallbacks
 * @param {number} chainId - The blockchain chain ID
 * @returns {Array} - Array of RPC URLs (primary + fallbacks)
 */
function getAllRpcUrls(chainId) {
  const config = getNetworkConfig(chainId);
  if (!config) return [];
  return [config.rpcUrl, ...config.fallbackRpcUrls];
}

/**
 * Get DEX router address for a specific chain and DEX
 * @param {number} chainId - The blockchain chain ID
 * @param {string} dexName - The DEX name (e.g., 'uniswapV3', 'pancakeswap')
 * @returns {string|null} - Router address or null if not found
 */
function getDexRouter(chainId, dexName) {
  const routers = DEX_ROUTERS[chainId];
  return routers ? routers[dexName] || null : null;
}

/**
 * Get default DEX router for a chain
 * @param {number} chainId - The blockchain chain ID
 * @returns {string|null} - Default router address or null
 */
function getDefaultDexRouter(chainId) {
  const config = getNetworkConfig(chainId);
  if (!config) return null;
  return getDexRouter(chainId, config.defaultDex) || null;
}

/**
 * Get wrapped native token address for a chain
 * @param {number} chainId - The blockchain chain ID
 * @returns {string|null} - WRAPPED token address or null
 */
function getWrappedNativeToken(chainId) {
  return WRAPPED_NATIVE[chainId] || null;
}

/**
 * Get stablecoin addresses for a chain
 * @param {number} chainId - The blockchain chain ID
 * @returns {Object|null} - Stablecoin addresses or null
 */
function getStablecoins(chainId) {
  return STABLECOINS[chainId] || null;
}

/**
 * Check if a chain is mainnet
 * @param {number} chainId - The blockchain chain ID
 * @returns {boolean} - True if mainnet, false otherwise
 */
function isMainnet(chainId) {
  const config = getNetworkConfig(chainId);
  return config ? config.type === 'mainnet' : false;
}

/**
 * Check if a chain is testnet
 * @param {number} chainId - The blockchain chain ID
 * @returns {boolean} - True if testnet, false otherwise
 */
function isTestnet(chainId) {
  const config = getNetworkConfig(chainId);
  return config ? config.type === 'testnet' : false;
}

/**
 * Get all supported chain IDs
 * @returns {Array} - Array of supported chain IDs
 */
function getSupportedChains() {
  return Object.keys(NETWORK_CONFIGS).map(Number);
}

// ============================================
// EXPORTS
// ============================================
module.exports = {
  ALCHEMY_API_KEY,
  ALCHEMY_ENDPOINTS,
  DEX_ROUTERS,
  WRAPPED_NATIVE,
  STABLECOINS,
  NETWORK_CONFIGS,
  // Utility functions
  getNetworkConfig,
  getRpcUrl,
  getAllRpcUrls,
  getDexRouter,
  getDefaultDexRouter,
  getWrappedNativeToken,
  getStablecoins,
  isMainnet,
  isTestnet,
  getSupportedChains
};
