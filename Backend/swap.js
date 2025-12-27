const { ethers } = require('ethers');
require('dotenv').config();

// ============================================
// NETWORK CONFIGURATIONS FOR MAINNET & TESTNET
// ============================================

// DEX Router Addresses by Chain
// Note: Using Universal Router / SwapRouter02 addresses where available for better compatibility
const DEX_ROUTERS = {
  // Mainnet DEX Routers
  1: { // Ethereum Mainnet
    uniswapV3: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45', // SwapRouter02
    sushiswap: '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F'
  },
  137: { // Polygon Mainnet
    quickswap: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff',
    sushiswap: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
    uniswapV3: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45' // SwapRouter02
  },
  56: { // BSC Mainnet
    pancakeswap: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
    pancakeswapV3: '0x13f4EA83D0bd40E75C8222255bc855a974568Dd4' // PancakeSwap V3 SmartRouter
  },
  42161: { // Arbitrum One
    uniswapV3: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45', // SwapRouter02
    sushiswap: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
    camelot: '0xc873fEcbd354f5A56E00E710B90EF4201db2448d'
  },
  10: { // Optimism
    uniswapV3: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45', // SwapRouter02
    velodrome: '0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858'
  },
  8453: { // Base
    uniswapV3: '0x2626664c2603336E57B271c5C0b26F421741e481', // SwapRouter02 on Base
    aerodrome: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43'
  },
  43114: { // Avalanche C-Chain
    traderjoe: '0xb4315e873dBcf96Ffd0acd8EA43f689D8c20fB30', // JoeRouter02
    pangolin: '0xE54Ca86531e17Ef3616d22Ca28b0D458b6C89106'
  },
  // Testnet DEX Routers
  11155111: { // Sepolia
    uniswapV3: '0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E' // SwapRouter02 on Sepolia
  },
  80002: { // Polygon Amoy
    quickswap: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff'
  },
  97: { // BSC Testnet
    pancakeswap: '0xD99D1c33F9fC3444f8101754aBC46c52416550D1'
  },
  421614: { // Arbitrum Sepolia
    uniswapV3: '0x101F443B4d1b059569D643917553c771E1b9663E'
  },
  11155420: { // Optimism Sepolia
    uniswapV3: '0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4'
  },
  84532: { // Base Sepolia
    uniswapV3: '0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4'
  },
  43113: { // Avalanche Fuji
    traderjoe: '0xd7f655E3376cE2D7A2b08fF01Eb3B1023191A901' // JoeRouter on Fuji
  }
};

// Wrapped Native Token Addresses by Chain
const WRAPPED_NATIVE = {
  // Mainnet
  1: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',     // WETH (Ethereum)
  137: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',   // WMATIC (Polygon)
  56: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',    // WBNB (BSC)
  42161: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', // WETH (Arbitrum)
  10: '0x4200000000000000000000000000000000000006',    // WETH (Optimism)
  8453: '0x4200000000000000000000000000000000000006',  // WETH (Base)
  43114: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7', // WAVAX (Avalanche)
  // Testnet
  11155111: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14', // WETH (Sepolia)
  17000: '0x94373a4919B3240D86eA41593D5eBa789FEF3848',    // WETH (Holesky)
  80002: '0x360ad4f9a9A8EFe9A8DCB5f461c4Cc1047E1Dcf9',   // WMATIC (Amoy)
  97: '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd',      // WBNB (BSC Testnet)
  421614: '0x980B62Da83eFf3D4576C647993b0c1D7faf17c73',  // WETH (Arbitrum Sepolia)
  11155420: '0x4200000000000000000000000000000000000006', // WETH (Optimism Sepolia)
  84532: '0x4200000000000000000000000000000000000006',   // WETH (Base Sepolia)
  43113: '0xd00ae08403B9bbb9124bB305C09058E32C39A48c'    // WAVAX (Fuji)
};

// Common Stablecoin Addresses by Chain
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
    // Official USDC on Sepolia (Circle) - may have limited V3 liquidity
    USDC: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    // Uniswap test DAI - has V3 pools
    DAI: '0x68194a729C2450ad26072b3D33ADaCbcef39D574',
    // Uniswap test UNI token - has V3 pools  
    UNI: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
    // LINK on Sepolia
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

// Network Configurations
const NETWORK_CONFIGS = {
  // ===== MAINNET =====
  1: {
    name: 'Ethereum Mainnet',
    symbol: 'ETH',
    rpcUrl: 'https://ethereum-rpc.publicnode.com',
    fallbackRpcUrls: ['https://eth.llamarpc.com', 'https://rpc.flashbots.net'],
    explorer: 'https://etherscan.io',
    type: 'mainnet',
    defaultDex: 'uniswapV3'
  },
  137: {
    name: 'Polygon',
    symbol: 'MATIC',
    rpcUrl: 'https://polygon-rpc.com',
    fallbackRpcUrls: ['https://polygon-bor-rpc.publicnode.com'],
    explorer: 'https://polygonscan.com',
    type: 'mainnet',
    defaultDex: 'quickswap'
  },
  56: {
    name: 'BSC',
    symbol: 'BNB',
    rpcUrl: 'https://bsc-dataseed.binance.org',
    fallbackRpcUrls: ['https://bsc-rpc.publicnode.com'],
    explorer: 'https://bscscan.com',
    type: 'mainnet',
    defaultDex: 'pancakeswap'
  },
  42161: {
    name: 'Arbitrum One',
    symbol: 'ETH',
    rpcUrl: 'https://arbitrum-one-rpc.publicnode.com',
    fallbackRpcUrls: ['https://arb1.arbitrum.io/rpc'],
    explorer: 'https://arbiscan.io',
    type: 'mainnet',
    defaultDex: 'uniswapV3'
  },
  10: {
    name: 'Optimism',
    symbol: 'ETH',
    rpcUrl: 'https://optimism-rpc.publicnode.com',
    fallbackRpcUrls: ['https://mainnet.optimism.io'],
    explorer: 'https://optimistic.etherscan.io',
    type: 'mainnet',
    defaultDex: 'uniswapV3'
  },
  8453: {
    name: 'Base',
    symbol: 'ETH',
    rpcUrl: 'https://base-rpc.publicnode.com',
    fallbackRpcUrls: ['https://mainnet.base.org'],
    explorer: 'https://basescan.org',
    type: 'mainnet',
    defaultDex: 'uniswapV3'
  },
  43114: {
    name: 'Avalanche',
    symbol: 'AVAX',
    rpcUrl: 'https://avalanche-c-chain-rpc.publicnode.com',
    fallbackRpcUrls: ['https://api.avax.network/ext/bc/C/rpc'],
    explorer: 'https://snowtrace.io',
    type: 'mainnet',
    defaultDex: 'traderjoe'
  },
  // ===== TESTNET =====
  11155111: {
    name: 'Sepolia',
    symbol: 'ETH',
    rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
    fallbackRpcUrls: ['https://rpc.sepolia.org'],
    explorer: 'https://sepolia.etherscan.io',
    type: 'testnet',
    defaultDex: 'uniswapV3'
  },
  80002: {
    name: 'Polygon Amoy',
    symbol: 'MATIC',
    rpcUrl: 'https://rpc-amoy.polygon.technology',
    fallbackRpcUrls: ['https://polygon-amoy-bor-rpc.publicnode.com'],
    explorer: 'https://amoy.polygonscan.com',
    type: 'testnet',
    defaultDex: 'quickswap'
  },
  97: {
    name: 'BSC Testnet',
    symbol: 'tBNB',
    rpcUrl: 'https://bsc-testnet-rpc.publicnode.com',
    fallbackRpcUrls: ['https://data-seed-prebsc-1-s1.binance.org:8545'],
    explorer: 'https://testnet.bscscan.com',
    type: 'testnet',
    defaultDex: 'pancakeswap'
  },
  421614: {
    name: 'Arbitrum Sepolia',
    symbol: 'ETH',
    rpcUrl: 'https://arbitrum-sepolia-rpc.publicnode.com',
    fallbackRpcUrls: ['https://sepolia-rollup.arbitrum.io/rpc'],
    explorer: 'https://sepolia.arbiscan.io',
    type: 'testnet',
    defaultDex: 'uniswapV3'
  },
  11155420: {
    name: 'Optimism Sepolia',
    symbol: 'ETH',
    rpcUrl: 'https://optimism-sepolia-rpc.publicnode.com',
    fallbackRpcUrls: ['https://sepolia.optimism.io'],
    explorer: 'https://sepolia-optimism.etherscan.io',
    type: 'testnet',
    defaultDex: 'uniswapV3'
  },
  84532: {
    name: 'Base Sepolia',
    symbol: 'ETH',
    rpcUrl: 'https://base-sepolia-rpc.publicnode.com',
    fallbackRpcUrls: ['https://sepolia.base.org'],
    explorer: 'https://sepolia.basescan.org',
    type: 'testnet',
    defaultDex: 'uniswapV3'
  },
  43113: {
    name: 'Avalanche Fuji',
    symbol: 'AVAX',
    rpcUrl: 'https://avalanche-fuji-c-chain-rpc.publicnode.com',
    fallbackRpcUrls: ['https://api.avax-test.network/ext/bc/C/rpc'],
    explorer: 'https://testnet.snowtrace.io',
    type: 'testnet',
    defaultDex: 'traderjoe'
  }
};

// ============================================
// ABI DEFINITIONS
// ============================================

const WETH_ABI = [
  'function deposit() public payable',
  'function withdraw(uint256 wad) public',
  'function balanceOf(address owner) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)'
];

const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)'
];

// SwapRouter02 ABI for Uniswap V3 (different from old SwapRouter)
// The struct order for ExactInputSingleParams is: tokenIn, tokenOut, fee, recipient, amountIn, amountOutMinimum, sqrtPriceLimitX96
const UNISWAP_V3_ROUTER02_ABI = [
  'function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96) params) external payable returns (uint256 amountOut)',
  'function exactInput(tuple(bytes path, address recipient, uint256 amountIn, uint256 amountOutMinimum) params) external payable returns (uint256 amountOut)',
  'function multicall(uint256 deadline, bytes[] data) external payable returns (bytes[] memory results)',
  'function multicall(bytes[] data) external payable returns (bytes[] memory results)',
  'function unwrapWETH9(uint256 amountMinimum, address recipient) external payable',
  'function refundETH() external payable',
  'function wrapETH(uint256 value) external payable',
  'function sweepToken(address token, uint256 amountMinimum, address recipient) external payable'
];

// Legacy SwapRouter ABI (for chains that still use it) - has deadline in struct
const UNISWAP_V3_ROUTER_LEGACY_ABI = [
  'function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96) params) external payable returns (uint256 amountOut)',
  'function exactInput(tuple(bytes path, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum) params) external payable returns (uint256 amountOut)'
];

// Quoter V2 ABI for getting quotes (use staticCall)
const UNISWAP_V3_QUOTER_ABI = [
  'function quoteExactInputSingle(address tokenIn, address tokenOut, uint24 fee, uint256 amountIn, uint160 sqrtPriceLimitX96) external returns (uint256 amountOut)',
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

// Quoter addresses by chain
const UNISWAP_V3_QUOTER = {
  1: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',      // Ethereum Mainnet QuoterV2
  137: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',    // Polygon QuoterV2
  42161: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',  // Arbitrum QuoterV2
  10: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',     // Optimism QuoterV2
  8453: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',   // Base QuoterV2
  11155111: '0xEd1f6473345F45b75F8179591dd5bA1888cf2FB3' // Sepolia QuoterV2
};

// Special addresses for SwapRouter02
const ADDRESS_THIS = '0x0000000000000000000000000000000000000002'; // For routing through router
const MSG_SENDER = '0x0000000000000000000000000000000000000001'; // For sending to msg.sender

// ============================================
// SWAP SERVICE CLASS
// ============================================

class SwapService {
  constructor(privateKey, chainId = 11155111) {
    this.chainId = chainId;
    this.networkConfig = NETWORK_CONFIGS[chainId];
    
    if (!this.networkConfig) {
      throw new Error(`Unsupported chain ID: ${chainId}`);
    }
    
    this.provider = new ethers.JsonRpcProvider(this.networkConfig.rpcUrl);
    this.signer = new ethers.Wallet(privateKey, this.provider);
    this.account = this.signer.address;
    
    console.log(`\n🔗 Connected to ${this.networkConfig.name} (Chain ID: ${chainId})`);
    console.log(`📍 Account: ${this.account}`);
  }

  // Get provider with fallback support
  async getProvider() {
    try {
      await this.provider.getBlockNumber();
      return this.provider;
    } catch (error) {
      // Try fallback RPCs
      for (const fallbackUrl of this.networkConfig.fallbackRpcUrls || []) {
        try {
          const fallbackProvider = new ethers.JsonRpcProvider(fallbackUrl);
          await fallbackProvider.getBlockNumber();
          this.provider = fallbackProvider;
          this.signer = new ethers.Wallet(this.signer.privateKey, fallbackProvider);
          console.log(`⚠️ Switched to fallback RPC: ${fallbackUrl}`);
          return this.provider;
        } catch (e) {
          continue;
        }
      }
      throw new Error('All RPC endpoints failed');
    }
  }

  // Get basic account info
  async getAccountInfo() {
    try {
      await this.getProvider();
      
      const balance = await this.provider.getBalance(this.account);
      const blockNumber = await this.provider.getBlockNumber();
      
      return {
        address: this.account,
        balance: ethers.formatEther(balance),
        balanceWei: balance.toString(),
        network: this.networkConfig.name,
        chainId: this.chainId,
        symbol: this.networkConfig.symbol,
        blockNumber
      };
    } catch (error) {
      console.error('Error getting account info:', error.message);
      throw error;
    }
  }

  // Get wrapped native token contract
  getWrappedNativeContract() {
    const wrappedAddress = WRAPPED_NATIVE[this.chainId];
    if (!wrappedAddress) {
      throw new Error(`No wrapped native token for chain ${this.chainId}`);
    }
    return new ethers.Contract(wrappedAddress, WETH_ABI, this.signer);
  }

  // Get ERC20 token contract
  getTokenContract(tokenAddress) {
    return new ethers.Contract(tokenAddress, ERC20_ABI, this.signer);
  }

  // Get token balance
  async getTokenBalance(tokenAddress) {
    const token = this.getTokenContract(tokenAddress);
    const balance = await token.balanceOf(this.account);
    const decimals = await token.decimals();
    const symbol = await token.symbol();
    
    return {
      balance: ethers.formatUnits(balance, decimals),
      balanceRaw: balance.toString(),
      decimals,
      symbol
    };
  }

  // Wrap native token (ETH -> WETH, BNB -> WBNB, etc.)
  async wrapNative(amount) {
    try {
      console.log(`\n--- Wrapping ${this.networkConfig.symbol} to W${this.networkConfig.symbol} ---`);
      
      const wrappedContract = this.getWrappedNativeContract();
      const amountWei = ethers.parseEther(amount.toString());
      
      // Check balance
      const balance = await this.provider.getBalance(this.account);
      if (balance < amountWei) {
        throw new Error(`Insufficient ${this.networkConfig.symbol} balance`);
      }
      
      console.log(`Wrapping ${amount} ${this.networkConfig.symbol}...`);
      const tx = await wrappedContract.deposit({ value: amountWei });
      console.log(`Transaction Hash: ${tx.hash}`);
      
      const receipt = await tx.wait();
      console.log(`✅ Wrap confirmed in block ${receipt.blockNumber}`);
      
      const newBalance = await wrappedContract.balanceOf(this.account);
      console.log(`New W${this.networkConfig.symbol} Balance: ${ethers.formatEther(newBalance)}`);
      
      return {
        success: true,
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        amountWrapped: amount,
        newBalance: ethers.formatEther(newBalance)
      };
    } catch (error) {
      console.error('Error wrapping native token:', error.message);
      throw error;
    }
  }

  // Unwrap native token (WETH -> ETH, WBNB -> BNB, etc.)
  async unwrapNative(amount = null) {
    try {
      console.log(`\n--- Unwrapping W${this.networkConfig.symbol} to ${this.networkConfig.symbol} ---`);
      
      const wrappedContract = this.getWrappedNativeContract();
      const wrappedBalance = await wrappedContract.balanceOf(this.account);
      
      console.log(`Current W${this.networkConfig.symbol} Balance: ${ethers.formatEther(wrappedBalance)}`);
      
      if (wrappedBalance === 0n) {
        throw new Error('No wrapped balance to unwrap');
      }
      
      let amountToUnwrap;
      if (amount === null) {
        amountToUnwrap = wrappedBalance;
      } else {
        amountToUnwrap = ethers.parseEther(amount.toString());
        if (wrappedBalance < amountToUnwrap) {
          console.log('Requested amount exceeds balance, unwrapping all available...');
          amountToUnwrap = wrappedBalance;
        }
      }
      
      console.log(`Unwrapping ${ethers.formatEther(amountToUnwrap)} W${this.networkConfig.symbol}...`);
      const tx = await wrappedContract.withdraw(amountToUnwrap);
      console.log(`Transaction Hash: ${tx.hash}`);
      
      const receipt = await tx.wait();
      console.log(`✅ Unwrap confirmed in block ${receipt.blockNumber}`);
      
      const newBalance = await this.provider.getBalance(this.account);
      console.log(`New ${this.networkConfig.symbol} Balance: ${ethers.formatEther(newBalance)}`);
      
      return {
        success: true,
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        amountUnwrapped: ethers.formatEther(amountToUnwrap),
        newBalance: ethers.formatEther(newBalance)
      };
    } catch (error) {
      console.error('Error unwrapping native token:', error.message);
      throw error;
    }
  }

  // Approve token for DEX router
  async approveToken(tokenAddress, spenderAddress, amount = ethers.MaxUint256) {
    try {
      const token = this.getTokenContract(tokenAddress);
      const currentAllowance = await token.allowance(this.account, spenderAddress);
      
      if (currentAllowance >= amount) {
        console.log('Token already approved');
        return { success: true, alreadyApproved: true };
      }
      
      console.log(`Approving token for ${spenderAddress}...`);
      const tx = await token.approve(spenderAddress, amount);
      const receipt = await tx.wait();
      
      console.log(`✅ Approval confirmed in block ${receipt.blockNumber}`);
      return {
        success: true,
        txHash: tx.hash,
        blockNumber: receipt.blockNumber
      };
    } catch (error) {
      console.error('Error approving token:', error.message);
      throw error;
    }
  }

  // Get DEX router based on chain
  getDexRouter(dexType = null) {
    const dex = dexType || this.networkConfig.defaultDex;
    const routers = DEX_ROUTERS[this.chainId];
    
    if (!routers || !routers[dex]) {
      throw new Error(`DEX ${dex} not available on ${this.networkConfig.name}`);
    }
    
    return {
      address: routers[dex],
      type: dex
    };
  }

  // Check if this is a SwapRouter02 (newer version without deadline in struct)
  isSwapRouter02(routerAddress) {
    // SwapRouter02 addresses (without deadline in struct)
    const swapRouter02Addresses = [
      '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45', // Mainnet, Polygon, Arbitrum, Optimism
      '0x2626664c2603336E57B271c5C0b26F421741e481', // Base
      '0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E', // Sepolia
    ].map(a => a.toLowerCase());
    
    return swapRouter02Addresses.includes(routerAddress.toLowerCase());
  }

  // Get swap quote (Uniswap V3 style using Quoter)
  async getSwapQuoteV3(tokenIn, tokenOut, amountIn, fee = 3000) {
    try {
      const quoterAddress = UNISWAP_V3_QUOTER[this.chainId];
      if (!quoterAddress) {
        console.log('No quoter available for this chain, skipping quote');
        return null;
      }
      
      const quoter = new ethers.Contract(quoterAddress, UNISWAP_V3_QUOTER_ABI, this.provider);
      
      // Try the simpler function signature first (QuoterV1 style)
      try {
        const result = await quoter.quoteExactInputSingle.staticCall(
          tokenIn,
          tokenOut,
          fee,
          amountIn,
          0 // sqrtPriceLimitX96
        );
        return result;
      } catch (e) {
        // Try QuoterV2 struct style
        try {
          const params = {
            tokenIn,
            tokenOut,
            amountIn,
            fee,
            sqrtPriceLimitX96: 0
          };
          const result = await quoter['quoteExactInputSingle((address,address,uint256,uint24,uint160))'].staticCall(params);
          return result.amountOut || result[0];
        } catch (e2) {
          return null;
        }
      }
    } catch (error) {
      console.log('Quote failed (pool may not exist for this fee tier):', error.message?.substring(0, 100));
      return null;
    }
  }

  // Try different fee tiers for V3 swaps
  async findBestV3Pool(tokenIn, tokenOut, amountIn) {
    const feeTiers = [500, 3000, 10000]; // 0.05%, 0.3%, 1%
    let bestQuote = null;
    let bestFee = 3000; // Default
    
    for (const fee of feeTiers) {
      try {
        const quote = await this.getSwapQuoteV3(tokenIn, tokenOut, amountIn, fee);
        if (quote && (!bestQuote || quote > bestQuote)) {
          bestQuote = quote;
          bestFee = fee;
        }
      } catch (e) {
        continue;
      }
    }
    
    return { quote: bestQuote, fee: bestFee };
  }

  // Encode V3 swap call data for multicall
  encodeExactInputSingle(params, isRouter02) {
    try {
      const iface = new ethers.Interface(isRouter02 ? UNISWAP_V3_ROUTER02_ABI : UNISWAP_V3_ROUTER_LEGACY_ABI);
      
      // Convert params object to tuple array in correct order
      let tupleParams;
      if (isRouter02) {
        // SwapRouter02 order: tokenIn, tokenOut, fee, recipient, amountIn, amountOutMinimum, sqrtPriceLimitX96
        tupleParams = [
          params.tokenIn,
          params.tokenOut,
          params.fee,
          params.recipient,
          params.amountIn,
          params.amountOutMinimum,
          params.sqrtPriceLimitX96
        ];
      } else {
        // Legacy order: tokenIn, tokenOut, fee, recipient, deadline, amountIn, amountOutMinimum, sqrtPriceLimitX96
        tupleParams = [
          params.tokenIn,
          params.tokenOut,
          params.fee,
          params.recipient,
          params.deadline,
          params.amountIn,
          params.amountOutMinimum,
          params.sqrtPriceLimitX96
        ];
      }
      
      const encoded = iface.encodeFunctionData('exactInputSingle', [tupleParams]);
      console.log(`Encoded calldata length: ${encoded.length} bytes`);
      return encoded;
    } catch (error) {
      console.error('Error encoding exactInputSingle:', error);
      throw error;
    }
  }

  // Swap native token for ERC20 (ETH -> Token)
  async swapNativeForToken(tokenOut, amountIn, slippagePercent = 10, dexType = null) {
    try {
      console.log(`\n--- Swapping ${this.networkConfig.symbol} for Token ---`);
      console.log(`Token out: ${tokenOut}`);
      console.log(`Amount in: ${amountIn} ${this.networkConfig.symbol}`);
      
      await this.getProvider(); // Ensure provider is working
      
      const { address: routerAddress, type: dex } = this.getDexRouter(dexType);
      const amountInWei = ethers.parseEther(amountIn.toString());
      const wrappedNative = WRAPPED_NATIVE[this.chainId];
      
      // Get token info
      const tokenContract = this.getTokenContract(tokenOut);
      let tokenDecimals = 18;
      let tokenSymbol = 'TOKEN';
      try {
        tokenDecimals = await tokenContract.decimals();
        tokenSymbol = await tokenContract.symbol();
        console.log(`Token: ${tokenSymbol} (${tokenDecimals} decimals)`);
      } catch (e) {
        console.log('Could not fetch token info, using defaults');
      }
      
      // Check balance
      const balance = await this.provider.getBalance(this.account);
      if (balance < amountInWei) {
        throw new Error(`Insufficient ${this.networkConfig.symbol} balance. Have: ${ethers.formatEther(balance)}, Need: ${amountIn}`);
      }
      
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes
      
      // Determine if V2 or V3 style swap
      const isV3 = dex.includes('V3') || dex === 'uniswapV3' || dex === 'pancakeswapV3';
      
      if (isV3) {
        const isRouter02 = this.isSwapRouter02(routerAddress);
        console.log(`Using ${isRouter02 ? 'SwapRouter02' : 'SwapRouter'} for V3 swap on ${dex}`);
        
        // Find best pool/fee tier
        const { quote, fee } = await this.findBestV3Pool(wrappedNative, tokenOut, amountInWei);
        
        if (quote) {
          console.log(`Best fee tier: ${fee / 10000}% (estimated output: ${ethers.formatUnits(quote, tokenDecimals)} ${tokenSymbol})`);
        } else {
          console.log(`Using default fee tier: ${3000 / 10000}% (no quote available - pool may have low liquidity)`);
        }
        
        const selectedFee = quote ? fee : 3000;
        const amountOutMin = quote ? quote * BigInt(100 - slippagePercent) / BigInt(100) : 0n;
        
        if (isRouter02) {
          // SwapRouter02 - use multicall with deadline wrapper
          const router = new ethers.Contract(routerAddress, UNISWAP_V3_ROUTER02_ABI, this.signer);
          
          const swapParams = {
            tokenIn: wrappedNative,
            tokenOut: tokenOut,
            fee: selectedFee,
            recipient: this.account,
            amountIn: amountInWei,
            amountOutMinimum: amountOutMin,
            sqrtPriceLimitX96: 0
          };
          
          // Encode the swap call
          const swapCalldata = this.encodeExactInputSingle(swapParams, true);
          
          console.log(`Executing V3 swap via ${dex} (SwapRouter02)...`);
          
          // Estimate gas first
          let gasLimit = 350000n;
          try {
            const gasEstimate = await router['multicall(uint256,bytes[])'].estimateGas(deadline, [swapCalldata], {
              value: amountInWei
            });
            gasLimit = gasEstimate * 130n / 100n; // Add 30% buffer
            console.log(`Estimated gas: ${gasEstimate}, using: ${gasLimit}`);
          } catch (e) {
            console.log(`Gas estimation failed, using default: ${gasLimit}`);
          }
          
          const tx = await router['multicall(uint256,bytes[])'](deadline, [swapCalldata], {
            value: amountInWei,
            gasLimit: gasLimit
          });
          
          console.log(`Transaction Hash: ${tx.hash}`);
          console.log(`Explorer: ${this.networkConfig.explorer}/tx/${tx.hash}`);
          
          const receipt = await tx.wait();
          
          console.log(`✅ Swap confirmed in block ${receipt.blockNumber}`);
          return {
            success: true,
            txHash: tx.hash,
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed.toString(),
            dex,
            feeTier: selectedFee,
            explorer: `${this.networkConfig.explorer}/tx/${tx.hash}`
          };
        } else {
          // Legacy SwapRouter with deadline in struct
          const router = new ethers.Contract(routerAddress, UNISWAP_V3_ROUTER_LEGACY_ABI, this.signer);
          
          const params = {
            tokenIn: wrappedNative,
            tokenOut: tokenOut,
            fee: selectedFee,
            recipient: this.account,
            deadline: deadline,
            amountIn: amountInWei,
            amountOutMinimum: amountOutMin,
            sqrtPriceLimitX96: 0
          };
          
          console.log(`Executing V3 swap via ${dex} (Legacy Router)...`);
          const tx = await router.exactInputSingle(params, {
            value: amountInWei,
            gasLimit: 350000
          });
          
          console.log(`Transaction Hash: ${tx.hash}`);
          const receipt = await tx.wait();
          
          console.log(`✅ Swap confirmed in block ${receipt.blockNumber}`);
          return {
            success: true,
            txHash: tx.hash,
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed.toString(),
            dex,
            feeTier: selectedFee
          };
        }
      }
    } catch (error) {
      console.error('Error in swap:', error.message);
      if (error.data) {
        console.error('Error data:', error.data);
      }
      if (error.transaction) {
        console.error('Failed transaction:', error.transaction);
      }
      throw error;
    }
  }

  // Swap ERC20 token for native (Token -> ETH)
  async swapTokenForNative(tokenIn, amountIn, slippagePercent = 10, dexType = null) {
    try {
      console.log(`\n--- Swapping Token for ${this.networkConfig.symbol} ---`);
      
      await this.getProvider(); // Ensure provider is working
      
      const { address: routerAddress, type: dex } = this.getDexRouter(dexType);
      const token = this.getTokenContract(tokenIn);
      const decimals = await token.decimals();
      const symbol = await token.symbol().catch(() => 'TOKEN');
      const amountInWei = ethers.parseUnits(amountIn.toString(), decimals);
      const wrappedNative = WRAPPED_NATIVE[this.chainId];
      
      console.log(`Token in: ${symbol} (${decimals} decimals)`);
      console.log(`Amount: ${amountIn} ${symbol}`);
      
      // Check token balance
      const tokenBalance = await token.balanceOf(this.account);
      if (tokenBalance < amountInWei) {
        throw new Error(`Insufficient token balance. Have: ${ethers.formatUnits(tokenBalance, decimals)}, Need: ${amountIn}`);
      }
      
      // Approve token if needed
      await this.approveToken(tokenIn, routerAddress, amountInWei);
      
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
      
      const isV3 = dex.includes('V3') || dex === 'uniswapV3' || dex === 'pancakeswapV3';
      
      if (isV3) {
        const isRouter02 = this.isSwapRouter02(routerAddress);
        console.log(`Using ${isRouter02 ? 'SwapRouter02' : 'SwapRouter'} for V3 swap`);
        
        // Find best pool/fee tier
        const { quote, fee } = await this.findBestV3Pool(tokenIn, wrappedNative, amountInWei);
        const selectedFee = quote ? fee : 3000;
        
        if (quote) {
          console.log(`Best fee tier: ${selectedFee / 10000}% (estimated output: ${ethers.formatEther(quote)} ${this.networkConfig.symbol})`);
        } else {
          console.log(`Using default fee tier: 0.3%`);
        }
        
        const amountOutMin = quote ? quote * BigInt(100 - slippagePercent) / BigInt(100) : 0n;
        
        if (isRouter02) {
          // SwapRouter02 - need to unwrap WETH after swap
          const router = new ethers.Contract(routerAddress, UNISWAP_V3_ROUTER02_ABI, this.signer);
          
          // For token -> ETH, swap to WETH first then unwrap
          // Use ADDRESS_THIS (address(2)) to keep WETH in router, then unwrap
          const swapParams = {
            tokenIn: tokenIn,
            tokenOut: wrappedNative,
            fee: selectedFee,
            recipient: ADDRESS_THIS, // Special address meaning "this contract"
            amountIn: amountInWei,
            amountOutMinimum: amountOutMin,
            sqrtPriceLimitX96: 0
          };
          
          const swapCalldata = this.encodeExactInputSingle(swapParams, true);
          
          // Encode unwrapWETH9 call - unwrap all WETH to user
          const unwrapIface = new ethers.Interface(UNISWAP_V3_ROUTER02_ABI);
          const unwrapCalldata = unwrapIface.encodeFunctionData('unwrapWETH9', [amountOutMin, this.account]);
          
          console.log(`Executing V3 swap via ${dex} (SwapRouter02 with unwrap)...`);
          
          // Estimate gas
          let gasLimit = 450000n;
          try {
            const gasEstimate = await router['multicall(uint256,bytes[])'].estimateGas(deadline, [swapCalldata, unwrapCalldata]);
            gasLimit = gasEstimate * 130n / 100n;
            console.log(`Estimated gas: ${gasEstimate}, using: ${gasLimit}`);
          } catch (e) {
            console.log(`Gas estimation failed, using default: ${gasLimit}`);
          }
          
          const tx = await router['multicall(uint256,bytes[])'](deadline, [swapCalldata, unwrapCalldata], {
            gasLimit: gasLimit
          });
          
          console.log(`Transaction Hash: ${tx.hash}`);
          console.log(`Explorer: ${this.networkConfig.explorer}/tx/${tx.hash}`);
          
          const receipt = await tx.wait();
          
          console.log(`✅ Swap confirmed in block ${receipt.blockNumber}`);
          return {
            success: true,
            txHash: tx.hash,
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed.toString(),
            dex,
            feeTier: selectedFee,
            explorer: `${this.networkConfig.explorer}/tx/${tx.hash}`
          };
        } else {
          // Legacy router - swap directly
          const router = new ethers.Contract(routerAddress, UNISWAP_V3_ROUTER_LEGACY_ABI, this.signer);
          
          const params = {
            tokenIn: tokenIn,
            tokenOut: wrappedNative,
            fee: selectedFee,
            recipient: this.account,
            deadline: deadline,
            amountIn: amountInWei,
            amountOutMinimum: amountOutMin,
            sqrtPriceLimitX96: 0
          };
          
          console.log(`Executing V3 swap via ${dex} (Legacy Router)...`);
          const tx = await router.exactInputSingle(params, { gasLimit: 350000 });
          
          console.log(`Transaction Hash: ${tx.hash}`);
          const receipt = await tx.wait();
          
          console.log(`✅ Swap confirmed in block ${receipt.blockNumber}`);
          return {
            success: true,
            txHash: tx.hash,
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed.toString(),
            dex,
            feeTier: selectedFee
          };
        }
      }
    } catch (error) {
      console.error('Error in swap:', error.message);
      if (error.data) {
        console.error('Error data:', error.data);
      }
      if (error.transaction) {
        console.error('Failed transaction:', error.transaction);
      }
      throw error;
    }
  }

  // Swap ERC20 token for another ERC20 token
  async swapTokenForToken(tokenIn, tokenOut, amountIn, slippagePercent = 10, dexType = null) {
    try {
      console.log(`\n--- Swapping Token for Token ---`);
      
      await this.getProvider(); // Ensure provider is working
      
      const { address: routerAddress, type: dex } = this.getDexRouter(dexType);
      const tokenInContract = this.getTokenContract(tokenIn);
      const tokenOutContract = this.getTokenContract(tokenOut);
      
      const decimalsIn = await tokenInContract.decimals();
      const decimalsOut = await tokenOutContract.decimals();
      const symbolIn = await tokenInContract.symbol().catch(() => 'TOKEN_IN');
      const symbolOut = await tokenOutContract.symbol().catch(() => 'TOKEN_OUT');
      
      const amountInWei = ethers.parseUnits(amountIn.toString(), decimalsIn);
      
      console.log(`Swapping ${amountIn} ${symbolIn} -> ${symbolOut}`);
      
      // Check token balance
      const tokenBalance = await tokenInContract.balanceOf(this.account);
      if (tokenBalance < amountInWei) {
        throw new Error(`Insufficient token balance. Have: ${ethers.formatUnits(tokenBalance, decimalsIn)}, Need: ${amountIn}`);
      }
      
      // Approve token if needed
      await this.approveToken(tokenIn, routerAddress, amountInWei);
      
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
      
      const isV3 = dex.includes('V3') || dex === 'uniswapV3' || dex === 'pancakeswapV3';
      
      if (isV3) {
        const isRouter02 = this.isSwapRouter02(routerAddress);
        console.log(`Using ${isRouter02 ? 'SwapRouter02' : 'SwapRouter'} for V3 swap`);
        
        // Find best pool/fee tier
        const { quote, fee } = await this.findBestV3Pool(tokenIn, tokenOut, amountInWei);
        const selectedFee = quote ? fee : 3000;
        
        if (quote) {
          console.log(`Best fee tier: ${selectedFee / 10000}% (estimated output: ${ethers.formatUnits(quote, decimalsOut)} ${symbolOut})`);
        } else {
          console.log(`Using default fee tier: 0.3%`);
        }
        
        const amountOutMin = quote ? quote * BigInt(100 - slippagePercent) / BigInt(100) : 0n;
        
        if (isRouter02) {
          const router = new ethers.Contract(routerAddress, UNISWAP_V3_ROUTER02_ABI, this.signer);
          
          const swapParams = {
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            fee: selectedFee,
            recipient: this.account,
            amountIn: amountInWei,
            amountOutMinimum: amountOutMin,
            sqrtPriceLimitX96: 0
          };
          
          const swapCalldata = this.encodeExactInputSingle(swapParams, true);
          
          console.log(`Executing V3 swap via ${dex} (SwapRouter02)...`);
          
          // Estimate gas
          let gasLimit = 400000n;
          try {
            const gasEstimate = await router['multicall(uint256,bytes[])'].estimateGas(deadline, [swapCalldata]);
            gasLimit = gasEstimate * 130n / 100n;
            console.log(`Estimated gas: ${gasEstimate}, using: ${gasLimit}`);
          } catch (e) {
            console.log(`Gas estimation failed, using default: ${gasLimit}`);
          }
          
          const tx = await router['multicall(uint256,bytes[])'](deadline, [swapCalldata], {
            gasLimit: gasLimit
          });
          
          console.log(`Transaction Hash: ${tx.hash}`);
          console.log(`Explorer: ${this.networkConfig.explorer}/tx/${tx.hash}`);
          
          const receipt = await tx.wait();
          
          console.log(`✅ Swap confirmed in block ${receipt.blockNumber}`);
          return {
            success: true,
            txHash: tx.hash,
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed.toString(),
            dex,
            feeTier: selectedFee,
            explorer: `${this.networkConfig.explorer}/tx/${tx.hash}`
          };
        } else {
          const router = new ethers.Contract(routerAddress, UNISWAP_V3_ROUTER_LEGACY_ABI, this.signer);
          
          const params = {
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            fee: selectedFee,
            recipient: this.account,
            deadline: deadline,
            amountIn: amountInWei,
            amountOutMinimum: amountOutMin,
            sqrtPriceLimitX96: 0
          };
          
          console.log(`Executing V3 swap via ${dex} (Legacy Router)...`);
          const tx = await router.exactInputSingle(params, { gasLimit: 350000 });
          
          console.log(`Transaction Hash: ${tx.hash}`);
          const receipt = await tx.wait();
          
          console.log(`✅ Swap confirmed in block ${receipt.blockNumber}`);
          return {
            success: true,
            txHash: tx.hash,
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed.toString(),
            dex,
            feeTier: selectedFee
          };
        }
      }
    } catch (error) {
      console.error('Error in swap:', error.message);
      if (error.data) {
        console.error('Error data:', error.data);
      }
      throw error;
    }
  }

  // Get available tokens for the current chain
  getAvailableTokens() {
    const tokens = {
      native: {
        symbol: this.networkConfig.symbol,
        name: this.networkConfig.name + ' Native Token',
        address: 'native',
        decimals: 18
      },
      wrappedNative: {
        symbol: `W${this.networkConfig.symbol}`,
        address: WRAPPED_NATIVE[this.chainId],
        decimals: 18
      }
    };
    
    const stables = STABLECOINS[this.chainId];
    if (stables) {
      Object.entries(stables).forEach(([symbol, address]) => {
        tokens[symbol.toLowerCase()] = {
          symbol,
          address,
          decimals: symbol === 'DAI' ? 18 : 6 // USDC/USDT typically have 6 decimals
        };
      });
    }
    
    return tokens;
  }

  // Get available DEXes for the current chain
  getAvailableDexes() {
    return Object.keys(DEX_ROUTERS[this.chainId] || {});
  }
}

// ============================================
// MULTI-CHAIN SWAP MANAGER
// ============================================

class MultiChainSwapManager {
  constructor(privateKey) {
    this.privateKey = privateKey;
    this.services = {};
  }
  
  // Get or create swap service for a specific chain
  getService(chainId) {
    if (!this.services[chainId]) {
      this.services[chainId] = new SwapService(this.privateKey, chainId);
    }
    return this.services[chainId];
  }
  
  // Get all supported chains
  getSupportedChains() {
    return Object.entries(NETWORK_CONFIGS).map(([chainId, config]) => ({
      chainId: parseInt(chainId),
      name: config.name,
      symbol: config.symbol,
      type: config.type,
      dexes: Object.keys(DEX_ROUTERS[chainId] || {}),
      explorer: config.explorer
    }));
  }
  
  // Get mainnet chains only
  getMainnetChains() {
    return this.getSupportedChains().filter(c => c.type === 'mainnet');
  }
  
  // Get testnet chains only
  getTestnetChains() {
    return this.getSupportedChains().filter(c => c.type === 'testnet');
  }
  
  // Execute swap on specific chain
  async executeSwap(chainId, swapType, params) {
    const service = this.getService(chainId);
    
    switch (swapType) {
      case 'wrap':
        return service.wrapNative(params.amount);
      case 'unwrap':
        return service.unwrapNative(params.amount);
      case 'nativeToToken':
        return service.swapNativeForToken(params.tokenOut, params.amount, params.slippage, params.dex);
      case 'tokenToNative':
        return service.swapTokenForNative(params.tokenIn, params.amount, params.slippage, params.dex);
      case 'tokenToToken':
        return service.swapTokenForToken(params.tokenIn, params.tokenOut, params.amount, params.slippage, params.dex);
      default:
        throw new Error(`Unknown swap type: ${swapType}`);
    }
  }
  
  // Get balances across all chains
  async getAllBalances() {
    const balances = {};
    
    for (const chainId of Object.keys(NETWORK_CONFIGS)) {
      try {
        const service = this.getService(parseInt(chainId));
        const info = await service.getAccountInfo();
        balances[chainId] = info;
      } catch (error) {
        balances[chainId] = { error: error.message };
      }
    }
    
    return balances;
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

// Get network config by chain ID
function getNetworkConfig(chainId) {
  return NETWORK_CONFIGS[chainId] || null;
}

// Get all mainnet chain IDs
function getMainnetChainIds() {
  return Object.entries(NETWORK_CONFIGS)
    .filter(([, config]) => config.type === 'mainnet')
    .map(([chainId]) => parseInt(chainId));
}

// Get all testnet chain IDs
function getTestnetChainIds() {
  return Object.entries(NETWORK_CONFIGS)
    .filter(([, config]) => config.type === 'testnet')
    .map(([chainId]) => parseInt(chainId));
}

// ============================================
// MAIN EXECUTION (Example Usage)
// ============================================

async function main() {
  // Get environment variables
  const privateKey = process.env.REACT_APP_PRIVATE_KEY;
  
  if (!privateKey) {
    console.error('❌ Please set REACT_APP_PRIVATE_KEY in .env file');
    process.exit(1);
  }
  
  console.log('═══════════════════════════════════════════');
  console.log('    MULTI-CHAIN SWAP SERVICE');
  console.log('═══════════════════════════════════════════');
  
  // Create multi-chain manager
  const manager = new MultiChainSwapManager(privateKey);
  
  // List all supported chains
  console.log('\n📊 Supported Chains:');
  console.log('\nMainnet Chains:');
  manager.getMainnetChains().forEach(chain => {
    console.log(`  • ${chain.name} (Chain ID: ${chain.chainId}) - DEXes: ${chain.dexes.join(', ') || 'None'}`);
  });
  
  console.log('\nTestnet Chains:');
  manager.getTestnetChains().forEach(chain => {
    console.log(`  • ${chain.name} (Chain ID: ${chain.chainId}) - DEXes: ${chain.dexes.join(', ') || 'None'}`);
  });
  
  // Example: Use Sepolia testnet
  const chainId = parseInt(process.env.CHAIN_ID) || 11155111; // Default to Sepolia
  console.log(`\n🔗 Using chain: ${NETWORK_CONFIGS[chainId]?.name || 'Unknown'}`);
  
  try {
    const service = manager.getService(chainId);
    
    // Get account info
    const accountInfo = await service.getAccountInfo();
    console.log('\n📋 Account Info:');
    console.log(`  Address: ${accountInfo.address}`);
    console.log(`  Balance: ${accountInfo.balance} ${accountInfo.symbol}`);
    console.log(`  Network: ${accountInfo.network}`);
    console.log(`  Block: ${accountInfo.blockNumber}`);
    
    // Show available tokens
    console.log('\n💰 Available Tokens:');
    const tokens = service.getAvailableTokens();
    Object.entries(tokens).forEach(([key, token]) => {
      console.log(`  • ${token.symbol}: ${token.address}`);
    });
    
    // Show available DEXes
    console.log('\n🔄 Available DEXes:');
    const dexes = service.getAvailableDexes();
    dexes.forEach(dex => console.log(`  • ${dex}`));
    
    // Example operations (uncomment to test):
    
    // 1. Wrap native token
    // await service.wrapNative(0.001);
    
    // 2. Unwrap native token
    // await service.unwrapNative(0.001);
    
    // 3. Swap native for token (if DEX available)
    // const usdc = tokens.usdc?.address;
    // if (usdc && dexes.length > 0) {
    //   await service.swapNativeForToken(usdc, 0.001);
    // }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
  
  console.log('\n═══════════════════════════════════════════');
  console.log('    DONE');
  console.log('═══════════════════════════════════════════');
}

// ============================================
// EXPORTS FOR USE AS MODULE
// ============================================

module.exports = {
  SwapService,
  MultiChainSwapManager,
  NETWORK_CONFIGS,
  DEX_ROUTERS,
  WRAPPED_NATIVE,
  STABLECOINS,
  UNISWAP_V3_QUOTER,
  UNISWAP_V3_ROUTER02_ABI,
  UNISWAP_V3_ROUTER_LEGACY_ABI,
  ERC20_ABI,
  WETH_ABI,
  getNetworkConfig,
  getMainnetChainIds,
  getTestnetChainIds
};

// Only run main function when file is executed directly (not when imported as module)
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}