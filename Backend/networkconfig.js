const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY || 'ivn1pyvI9XKDlq_0bKxTj';

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
  80002: `https://polygon-amoy.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
  97: `https://bnb-testnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
  421614: `https://arb-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
  11155420: `https://opt-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
  84532: `https://base-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
  43113: `https://avax-fuji.g.alchemy.com/v2/${ALCHEMY_API_KEY}`
};

// Quoter and Router information moved to Rubic API (swap.js)


const WRAPPED_NATIVE = {
  // Mainnet
  1: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  137: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
  56: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
  42161: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  10: '0x4200000000000000000000000000000000000006',
  8453: '0x4200000000000000000000000000000000000006',
  43114: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7',
  // Testnet
  11155111: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14',
  80002: '0x360ad4f9a9A8EFe9A8DCB5f461c4Cc1047E1Dcf9',
  97: '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd',
  421614: '0x980B62Da83eFf3D4576C647993b0c1D7faf17c73',
  11155420: '0x4200000000000000000000000000000000000006',
  84532: '0x4200000000000000000000000000000000000006',
  43113: '0xd00ae08403B9bbb9124bB305C09058E32C39A48c'
};

const STABLECOINS = {
  // Mainnet
  1: {
    USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F'
  },
  137: {
    USDC: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
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
  // Testnet
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

const NETWORK_CONFIGS = {
  // Mainnet - Uniswap V3 supported
  1: {
    name: 'Ethereum Mainnet',
    symbol: 'ETH',
    rpcUrl: ALCHEMY_ENDPOINTS[1],
    fallbackRpcUrls: ['https://ethereum-rpc.publicnode.com'],
    explorer: 'https://etherscan.io',
    type: 'mainnet',
    defaultDex: 'uniswapV3'
  },
  137: {
    name: 'Polygon',
    symbol: 'MATIC',
    rpcUrl: ALCHEMY_ENDPOINTS[137],
    fallbackRpcUrls: ['https://polygon-rpc.com'],
    explorer: 'https://polygonscan.com',
    type: 'mainnet',
    defaultDex: 'uniswapV3'
  },
  56: {
    name: 'BSC',
    symbol: 'BNB',
    rpcUrl: ALCHEMY_ENDPOINTS[56],
    fallbackRpcUrls: ['https://bsc-dataseed.binance.org'],
    explorer: 'https://bscscan.com',
    type: 'mainnet',
    defaultDex: 'uniswapV3'
  },
  42161: {
    name: 'Arbitrum One',
    symbol: 'ETH',
    rpcUrl: ALCHEMY_ENDPOINTS[42161],
    fallbackRpcUrls: ['https://arb1.arbitrum.io/rpc'],
    explorer: 'https://arbiscan.io',
    type: 'mainnet',
    defaultDex: 'uniswapV3'
  },
  10: {
    name: 'Optimism',
    symbol: 'ETH',
    rpcUrl: ALCHEMY_ENDPOINTS[10],
    fallbackRpcUrls: ['https://mainnet.optimism.io'],
    explorer: 'https://optimistic.etherscan.io',
    type: 'mainnet',
    defaultDex: 'uniswapV3'
  },
  8453: {
    name: 'Base',
    symbol: 'ETH',
    rpcUrl: ALCHEMY_ENDPOINTS[8453],
    fallbackRpcUrls: ['https://mainnet.base.org'],
    explorer: 'https://basescan.org',
    type: 'mainnet',
    defaultDex: 'uniswapV3'
  },
  43114: {
    name: 'Avalanche',
    symbol: 'AVAX',
    rpcUrl: ALCHEMY_ENDPOINTS[43114],
    fallbackRpcUrls: ['https://api.avax.network/ext/bc/C/rpc'],
    explorer: 'https://snowtrace.io',
    type: 'mainnet',
    defaultDex: 'uniswapV3'
  },
  // Testnet
  11155111: {
    name: 'Sepolia',
    symbol: 'ETH',
    rpcUrl: ALCHEMY_ENDPOINTS[11155111],
    fallbackRpcUrls: ['https://rpc.sepolia.org'],
    explorer: 'https://sepolia.etherscan.io',
    type: 'testnet',
    defaultDex: 'uniswapV3'
  },
  80002: {
    name: 'Polygon Amoy',
    symbol: 'MATIC',
    rpcUrl: ALCHEMY_ENDPOINTS[80002],
    fallbackRpcUrls: ['https://rpc-amoy.polygon.technology'],
    explorer: 'https://amoy.polygonscan.com',
    type: 'testnet',
    defaultDex: 'uniswapV3'
  },
  97: {
    name: 'BSC Testnet',
    symbol: 'tBNB',
    rpcUrl: ALCHEMY_ENDPOINTS[97],
    fallbackRpcUrls: ['https://bsc-testnet-rpc.publicnode.com'],
    explorer: 'https://testnet.bscscan.com',
    type: 'testnet',
    defaultDex: 'uniswapV3'
  },
  421614: {
    name: 'Arbitrum Sepolia',
    symbol: 'ETH',
    rpcUrl: ALCHEMY_ENDPOINTS[421614],
    fallbackRpcUrls: ['https://sepolia-rollup.arbitrum.io/rpc'],
    explorer: 'https://sepolia.arbiscan.io',
    type: 'testnet',
    defaultDex: 'uniswapV3'
  },
  11155420: {
    name: 'Optimism Sepolia',
    symbol: 'ETH',
    rpcUrl: ALCHEMY_ENDPOINTS[11155420],
    fallbackRpcUrls: ['https://sepolia.optimism.io'],
    explorer: 'https://sepolia-optimistic.etherscan.io',
    type: 'testnet',
    defaultDex: 'uniswapV3'
  },
  84532: {
    name: 'Base Sepolia',
    symbol: 'ETH',
    rpcUrl: ALCHEMY_ENDPOINTS[84532],
    fallbackRpcUrls: ['https://sepolia.base.org'],
    explorer: 'https://sepolia.basescan.org',
    type: 'testnet',
    defaultDex: 'uniswapV3'
  },
  43113: {
    name: 'Avalanche Fuji',
    symbol: 'AVAX',
    rpcUrl: ALCHEMY_ENDPOINTS[43113],
    fallbackRpcUrls: ['https://api.avax-test.network/ext/bc/C/rpc'],
    explorer: 'https://testnet.snowtrace.io',
    type: 'testnet',
    defaultDex: 'uniswapV3'
  }
};

module.exports = {
  ALCHEMY_API_KEY,
  ALCHEMY_ENDPOINTS,
  WRAPPED_NATIVE,
  STABLECOINS,
  NETWORK_CONFIGS
};
