const { ethers } = require('ethers');
require('dotenv').config();
const { DEX_ROUTERS, WRAPPED_NATIVE, STABLECOINS, NETWORK_CONFIGS, UNISWAP_V3_QUOTER } = require('./networkconfig');

// ABI Definitions
const WETH_ABI = [
  'function deposit() public payable',
  'function withdraw(uint256 wad) public',
  'function balanceOf(address owner) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

// Uniswap V3 SwapRouter02 ABI
const UNISWAP_V3_ROUTER_ABI = [
  'function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96) params) external payable returns (uint256 amountOut)',
  'function multicall(uint256 deadline, bytes[] data) external payable returns (bytes[] memory results)',
  'function unwrapWETH9(uint256 amountMinimum, address recipient) external payable'
];

// Quoter V2 ABI
const QUOTER_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96) params) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const ADDRESS_THIS = '0x0000000000000000000000000000000000000002';
const FEE_TIERS = [500, 3000, 10000];

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
    this.routerAddress = DEX_ROUTERS[chainId]?.uniswapV3;
    
    console.log(`🔗 Connected to ${this.networkConfig.name} (Chain ID: ${chainId})`);
  }

  async getProvider() {
    try {
      await this.provider.getBlockNumber();
      return this.provider;
    } catch {
      for (const fallbackUrl of this.networkConfig.fallbackRpcUrls || []) {
        try {
          const fallbackProvider = new ethers.JsonRpcProvider(fallbackUrl);
          await fallbackProvider.getBlockNumber();
          this.provider = fallbackProvider;
          this.signer = new ethers.Wallet(this.signer.privateKey, fallbackProvider);
          return this.provider;
        } catch {
          continue;
        }
      }
      throw new Error('All RPC endpoints failed');
    }
  }

  async getAccountInfo() {
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
  }

  getWrappedNativeContract() {
    const wrappedAddress = WRAPPED_NATIVE[this.chainId];
    if (!wrappedAddress) {
      throw new Error(`No wrapped native token for chain ${this.chainId}`);
    }
    return new ethers.Contract(wrappedAddress, WETH_ABI, this.signer);
  }

  getTokenContract(tokenAddress) {
    return new ethers.Contract(tokenAddress, ERC20_ABI, this.signer);
  }

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

  async wrapNative(amount) {
    console.log(`\n--- Wrapping ${this.networkConfig.symbol} ---`);
    
    const wrappedContract = this.getWrappedNativeContract();
    const amountWei = ethers.parseEther(amount.toString());
    
    const balance = await this.provider.getBalance(this.account);
    if (balance < amountWei) {
      throw new Error(`Insufficient ${this.networkConfig.symbol} balance`);
    }
    
    const tx = await wrappedContract.deposit({ value: amountWei });
    const receipt = await tx.wait();
    
    return {
      success: true,
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      explorer: `${this.networkConfig.explorer}/tx/${tx.hash}`
    };
  }

  async unwrapNative(amount = null) {
    console.log(`\n--- Unwrapping W${this.networkConfig.symbol} ---`);
    
    const wrappedContract = this.getWrappedNativeContract();
    const wrappedBalance = await wrappedContract.balanceOf(this.account);
    
    if (wrappedBalance === 0n) {
      throw new Error('No wrapped balance to unwrap');
    }
    
    const amountToUnwrap = amount 
      ? ethers.parseEther(amount.toString())
      : wrappedBalance;
    
    const tx = await wrappedContract.withdraw(amountToUnwrap);
    const receipt = await tx.wait();
    
    return {
      success: true,
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      explorer: `${this.networkConfig.explorer}/tx/${tx.hash}`
    };
  }

  async approveToken(tokenAddress, spenderAddress, amount = ethers.MaxUint256) {
    const token = this.getTokenContract(tokenAddress);
    const currentAllowance = await token.allowance(this.account, spenderAddress);
    
    if (currentAllowance >= amount) {
      return { success: true, alreadyApproved: true };
    }
    
    const tx = await token.approve(spenderAddress, amount);
    const receipt = await tx.wait();
    
    return {
      success: true,
      txHash: tx.hash,
      blockNumber: receipt.blockNumber
    };
  }

  async findBestFeeTier(tokenIn, tokenOut, amountIn) {
    const quoterAddress = UNISWAP_V3_QUOTER[this.chainId];
    if (!quoterAddress) return { fee: 3000, quote: null };
    
    const quoter = new ethers.Contract(quoterAddress, QUOTER_ABI, this.provider);
    let bestQuote = null;
    let bestFee = 3000;
    
    for (const fee of FEE_TIERS) {
      try {
        const params = { tokenIn, tokenOut, amountIn, fee, sqrtPriceLimitX96: 0 };
        const result = await quoter.quoteExactInputSingle.staticCall(params);
        const quote = result.amountOut || result[0];
        
        if (!bestQuote || quote > bestQuote) {
          bestQuote = quote;
          bestFee = fee;
        }
      } catch {
        continue;
      }
    }
    
    return { fee: bestFee, quote: bestQuote };
  }

  encodeExactInputSingle(params) {
    const iface = new ethers.Interface(UNISWAP_V3_ROUTER_ABI);
    return iface.encodeFunctionData('exactInputSingle', [[
      params.tokenIn,
      params.tokenOut,
      params.fee,
      params.recipient,
      params.amountIn,
      params.amountOutMinimum,
      params.sqrtPriceLimitX96
    ]]);
  }

  async swapNativeForToken(tokenOut, amountIn, slippagePercent = 5) {
    console.log(`\n--- Swapping ${this.networkConfig.symbol} for Token ---`);
    await this.getProvider();
    
    const amountInWei = ethers.parseEther(amountIn.toString());
    const wrappedNative = WRAPPED_NATIVE[this.chainId];
    const deadline = Math.floor(Date.now() / 1000) + 1200;
    
    const balance = await this.provider.getBalance(this.account);
    if (balance < amountInWei) {
      throw new Error(`Insufficient ${this.networkConfig.symbol} balance`);
    }
    
    const { fee, quote } = await this.findBestFeeTier(wrappedNative, tokenOut, amountInWei);
    const amountOutMin = quote ? quote * BigInt(100 - slippagePercent) / BigInt(100) : 0n;
    
    const router = new ethers.Contract(this.routerAddress, UNISWAP_V3_ROUTER_ABI, this.signer);
    
    const swapParams = {
      tokenIn: wrappedNative,
      tokenOut: tokenOut,
      fee: fee,
      recipient: this.account,
      amountIn: amountInWei,
      amountOutMinimum: amountOutMin,
      sqrtPriceLimitX96: 0
    };
    
    const swapCalldata = this.encodeExactInputSingle(swapParams);
    
    const tx = await router['multicall(uint256,bytes[])'](deadline, [swapCalldata], {
      value: amountInWei,
      gasLimit: 350000n
    });
    
    const receipt = await tx.wait();
    
    return {
      success: true,
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      feeTier: fee,
      explorer: `${this.networkConfig.explorer}/tx/${tx.hash}`
    };
  }

  async swapTokenForNative(tokenIn, amountIn, slippagePercent = 5) {
    console.log(`\n--- Swapping Token for ${this.networkConfig.symbol} ---`);
    await this.getProvider();
    
    const token = this.getTokenContract(tokenIn);
    const decimals = await token.decimals();
    const amountInWei = ethers.parseUnits(amountIn.toString(), decimals);
    const wrappedNative = WRAPPED_NATIVE[this.chainId];
    const deadline = Math.floor(Date.now() / 1000) + 1200;
    
    const tokenBalance = await token.balanceOf(this.account);
    if (tokenBalance < amountInWei) {
      throw new Error('Insufficient token balance');
    }
    
    await this.approveToken(tokenIn, this.routerAddress, amountInWei);
    
    const { fee, quote } = await this.findBestFeeTier(tokenIn, wrappedNative, amountInWei);
    const amountOutMin = quote ? quote * BigInt(100 - slippagePercent) / BigInt(100) : 0n;
    
    const router = new ethers.Contract(this.routerAddress, UNISWAP_V3_ROUTER_ABI, this.signer);
    
    const swapParams = {
      tokenIn: tokenIn,
      tokenOut: wrappedNative,
      fee: fee,
      recipient: ADDRESS_THIS,
      amountIn: amountInWei,
      amountOutMinimum: amountOutMin,
      sqrtPriceLimitX96: 0
    };
    
    const swapCalldata = this.encodeExactInputSingle(swapParams);
    const iface = new ethers.Interface(UNISWAP_V3_ROUTER_ABI);
    const unwrapCalldata = iface.encodeFunctionData('unwrapWETH9', [amountOutMin, this.account]);
    
    const tx = await router['multicall(uint256,bytes[])'](deadline, [swapCalldata, unwrapCalldata], {
      gasLimit: 450000n
    });
    
    const receipt = await tx.wait();
    
    return {
      success: true,
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      feeTier: fee,
      explorer: `${this.networkConfig.explorer}/tx/${tx.hash}`
    };
  }

  async swapTokenForToken(tokenIn, tokenOut, amountIn, slippagePercent = 5) {
    console.log(`\n--- Swapping Token for Token ---`);
    await this.getProvider();
    
    const tokenInContract = this.getTokenContract(tokenIn);
    const tokenOutContract = this.getTokenContract(tokenOut);
    
    const decimalsIn = await tokenInContract.decimals();
    const amountInWei = ethers.parseUnits(amountIn.toString(), decimalsIn);
    const deadline = Math.floor(Date.now() / 1000) + 1200;
    
    const tokenBalance = await tokenInContract.balanceOf(this.account);
    if (tokenBalance < amountInWei) {
      throw new Error('Insufficient token balance');
    }
    
    await this.approveToken(tokenIn, this.routerAddress, amountInWei);
    
    const { fee, quote } = await this.findBestFeeTier(tokenIn, tokenOut, amountInWei);
    const amountOutMin = quote ? quote * BigInt(100 - slippagePercent) / BigInt(100) : 0n;
    
    const router = new ethers.Contract(this.routerAddress, UNISWAP_V3_ROUTER_ABI, this.signer);
    
    const swapParams = {
      tokenIn: tokenIn,
      tokenOut: tokenOut,
      fee: fee,
      recipient: this.account,
      amountIn: amountInWei,
      amountOutMinimum: amountOutMin,
      sqrtPriceLimitX96: 0
    };
    
    const swapCalldata = this.encodeExactInputSingle(swapParams);
    
    const tx = await router['multicall(uint256,bytes[])'](deadline, [swapCalldata], {
      gasLimit: 400000n
    });
    
    const receipt = await tx.wait();
    
    return {
      success: true,
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      feeTier: fee,
      explorer: `${this.networkConfig.explorer}/tx/${tx.hash}`
    };
  }

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
          decimals: symbol === 'DAI' ? 18 : 6
        };
      });
    }
    
    return tokens;
  }
}

class MultiChainSwapManager {
  constructor(privateKey) {
    this.privateKey = privateKey;
    this.services = {};
  }
  
  getService(chainId) {
    if (!this.services[chainId]) {
      this.services[chainId] = new SwapService(this.privateKey, chainId);
    }
    return this.services[chainId];
  }
  
  getSupportedChains() {
    return Object.entries(NETWORK_CONFIGS).map(([chainId, config]) => ({
      chainId: parseInt(chainId),
      name: config.name,
      symbol: config.symbol,
      type: config.type,
      dexes: ['uniswapV3'],
      explorer: config.explorer
    }));
  }
  
  getMainnetChains() {
    return this.getSupportedChains().filter(c => c.type === 'mainnet');
  }
  
  getTestnetChains() {
    return this.getSupportedChains().filter(c => c.type === 'testnet');
  }
  
  async executeSwap(chainId, swapType, params) {
    const service = this.getService(chainId);
    
    switch (swapType) {
      case 'wrap':
        return service.wrapNative(params.amount);
      case 'unwrap':
        return service.unwrapNative(params.amount);
      case 'nativeToToken':
        return service.swapNativeForToken(params.tokenOut, params.amount, params.slippage);
      case 'tokenToNative':
        return service.swapTokenForNative(params.tokenIn, params.amount, params.slippage);
      case 'tokenToToken':
        return service.swapTokenForToken(params.tokenIn, params.tokenOut, params.amount, params.slippage);
      default:
        throw new Error(`Unknown swap type: ${swapType}`);
    }
  }
}

module.exports = {
  SwapService,
  MultiChainSwapManager,
  NETWORK_CONFIGS,
  DEX_ROUTERS,
  WRAPPED_NATIVE,
  STABLECOINS,
  UNISWAP_V3_QUOTER,
  UNISWAP_V3_ROUTER_ABI,
  ERC20_ABI,
  WETH_ABI
};
