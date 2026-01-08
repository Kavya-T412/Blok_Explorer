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

// Uniswap V3 Factory ABI
const FACTORY_ABI = [
  'function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)'
];

// Uniswap V3 Pool ABI
const POOL_ABI = [
  'function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)',
  'function liquidity() external view returns (uint128)',
  'function token0() external view returns (address)',
  'function token1() external view returns (address)',
  'function fee() external view returns (uint24)'
];

const ADDRESS_THIS = '0x0000000000000000000000000000000000000002';
const FEE_TIERS = [500, 3000, 10000];

// Uniswap V3 Factory Addresses
const UNISWAP_V3_FACTORY = {
  // Mainnet
  1: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
  137: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
  42161: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
  10: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
  8453: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD',
  56: '0xdB1d10011AD0Ff90774D0C6Bb92e5C5c8b4461F7', // PancakeSwap V3 Factory
  43114: '0x740b1c1de25031C31FF4fC9A62f554A55cdC1baD', // Trader Joe V2.1 Factory
  // Testnet
  11155111: '0x0227628f3F023bb0B980b67D528571c95c6DaC1c',
  80002: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
  97: '0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865', // PancakeSwap Testnet Factory
  421614: '0x248AB79Bbb9bC29bB72f7Cd42F17e054Fc40188e',
  11155420: '0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24',
  84532: '0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24',
  43113: '0xF5c7d9733e5f53abCC1695820c4818C59B457C2C' // Trader Joe Testnet Factory
};

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
    
    // Balance validation with detailed error message
    const balance = await this.provider.getBalance(this.account);
    if (balance < amountWei) {
      const balanceFormatted = ethers.formatEther(balance);
      const requiredFormatted = ethers.formatEther(amountWei);
      throw new Error(
        `Insufficient ${this.networkConfig.symbol} balance for wrapping. ` +
        `Required: ${requiredFormatted} ${this.networkConfig.symbol}, ` +
        `Available: ${balanceFormatted} ${this.networkConfig.symbol}`
      );
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
    
    // Balance validation with detailed error message
    if (wrappedBalance === 0n) {
      throw new Error(`No W${this.networkConfig.symbol} balance available to unwrap`);
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

  // Step 1: Gather Pool Details
  async getPoolDetails(tokenIn, tokenOut) {
    console.log('\n--- Step 1: Gathering Pool Details ---');
    
    const factoryAddress = UNISWAP_V3_FACTORY[this.chainId];
    if (!factoryAddress) {
      console.warn(`⚠️  No Uniswap V3 Factory configured for chain ${this.chainId}`);
      // Return simulated pool data for unsupported chains
      return [{
        address: ethers.ZeroAddress,
        fee: 3000,
        sqrtPriceX96: '0',
        tick: 0,
        liquidity: '0',
        token0: tokenIn,
        token1: tokenOut,
        exists: false,
        simulated: true
      }];
    }
    
    const factory = new ethers.Contract(factoryAddress, FACTORY_ABI, this.provider);
    const poolsInfo = [];
    
    for (const fee of FEE_TIERS) {
      try {
        const poolAddress = await factory.getPool(tokenIn, tokenOut, fee);
        
        if (poolAddress !== ethers.ZeroAddress) {
          const pool = new ethers.Contract(poolAddress, POOL_ABI, this.provider);
          const [slot0, liquidity, token0, token1, poolFee] = await Promise.all([
            pool.slot0(),
            pool.liquidity(),
            pool.token0(),
            pool.token1(),
            pool.fee()
          ]);
          
          poolsInfo.push({
            address: poolAddress,
            fee: Number(poolFee),
            sqrtPriceX96: slot0.sqrtPriceX96.toString(),
            tick: Number(slot0.tick),
            liquidity: liquidity.toString(),
            token0,
            token1,
            exists: true
          });
          
          console.log(`✓ Pool found at fee tier ${fee / 10000}% with liquidity: ${ethers.formatUnits(liquidity, 0)}`);
        }
      } catch (error) {
        console.log(`✗ No pool at fee tier ${fee / 10000}%`);
      }
    }
    
    if (poolsInfo.length === 0) {
      console.warn('⚠️  No liquidity pools found, returning simulated data');
      // Return simulated pool data instead of throwing error
      return [{
        address: ethers.ZeroAddress,
        fee: 3000,
        sqrtPriceX96: '0',
        tick: 0,
        liquidity: '0',
        token0: tokenIn,
        token1: tokenOut,
        exists: false,
        simulated: true
      }];
    }
    
    return poolsInfo;
  }

  // Step 2: Fetch Quote from all available pools
  async fetchQuote(tokenIn, tokenOut, amountIn) {
    console.log('\n--- Step 2: Fetching Quotes ---');
    
    const quoterAddress = UNISWAP_V3_QUOTER[this.chainId];
    if (!quoterAddress) {
      console.warn(`⚠️  No Quoter configured for chain ${this.chainId}, using price estimation`);
      // Return estimated quote based on 1:1 ratio with 0.3% fee
      const estimatedOutput = (amountIn * 997n) / 1000n; // 0.3% fee
      return { 
        fee: 3000, 
        quote: estimatedOutput,
        gasEstimate: 150000n,
        allQuotes: [{
          fee: 3000,
          amountOut: estimatedOutput.toString(),
          gasEstimate: '150000',
          estimated: true
        }],
        estimated: true
      };
    }
    
    const quoter = new ethers.Contract(quoterAddress, QUOTER_ABI, this.provider);
    let bestQuote = null;
    let bestFee = 3000;
    let bestGasEstimate = 0n;
    const quotes = [];
    
    for (const fee of FEE_TIERS) {
      try {
        const params = { tokenIn, tokenOut, amountIn, fee, sqrtPriceLimitX96: 0 };
        const result = await quoter.quoteExactInputSingle.staticCall(params);
        const quote = result.amountOut || result[0];
        const gasEstimate = result.gasEstimate || result[3] || 0n;
        
        quotes.push({
          fee,
          amountOut: quote.toString(),
          gasEstimate: gasEstimate.toString()
        });
        
        if (!bestQuote || quote > bestQuote) {
          bestQuote = quote;
          bestFee = fee;
          bestGasEstimate = gasEstimate;
        }
        
        console.log(`✓ Fee tier ${fee / 10000}%: Output = ${ethers.formatEther(quote)}, Gas = ${gasEstimate.toString()}`);
      } catch (error) {
        console.log(`✗ Fee tier ${fee / 10000}%: No quote available`);
      }
    }
    
    // If no quotes found, return estimated quote
    if (!bestQuote) {
      console.warn('⚠️  No quotes available, using price estimation');
      const estimatedOutput = (amountIn * 997n) / 1000n; // 0.3% fee
      return { 
        fee: 3000, 
        quote: estimatedOutput,
        gasEstimate: 150000n,
        allQuotes: [{
          fee: 3000,
          amountOut: estimatedOutput.toString(),
          gasEstimate: '150000',
          estimated: true
        }],
        estimated: true
      };
    }
    
    return { 
      fee: bestFee, 
      quote: bestQuote,
      gasEstimate: bestGasEstimate,
      allQuotes: quotes
    };
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

  // Step 3: Create Swap Payload
  async createSwapPayload(tokenIn, tokenOut, amountIn, slippagePercent = 5) {
    console.log('\n--- Step 3: Creating Swap Payload ---');
    
    await this.getProvider();
    
    // Step 1: Get pool details
    const poolDetails = await this.getPoolDetails(tokenIn, tokenOut);
    
    // Step 2: Get best quote
    const { fee, quote, gasEstimate, allQuotes } = await this.fetchQuote(tokenIn, tokenOut, amountIn);
    
    if (!quote) {
      throw new Error('Unable to get quote for swap');
    }
    
    const amountOutMin = quote * BigInt(100 - slippagePercent) / BigInt(100);
    const deadline = Math.floor(Date.now() / 1000) + 1200; // 20 minutes
    
    const swapParams = {
      tokenIn,
      tokenOut,
      fee,
      recipient: this.account,
      amountIn,
      amountOutMinimum: amountOutMin,
      sqrtPriceLimitX96: 0
    };
    
    const swapCalldata = this.encodeExactInputSingle(swapParams);
    
    console.log(`✓ Swap payload created:`);
    console.log(`  - Fee tier: ${fee / 10000}%`);
    console.log(`  - Expected output: ${ethers.formatEther(quote)}`);
    console.log(`  - Min output (${slippagePercent}% slippage): ${ethers.formatEther(amountOutMin)}`);
    console.log(`  - Estimated gas: ${gasEstimate.toString()}`);
    
    return {
      poolDetails,
      quote: {
        amountOut: quote.toString(),
        amountOutMin: amountOutMin.toString(),
        fee,
        gasEstimate: gasEstimate.toString(),
        allQuotes
      },
      swapParams,
      swapCalldata,
      deadline,
      routerAddress: this.routerAddress
    };
  }

  async swapNativeForToken(tokenOut, amountIn, slippagePercent = 5) {
    console.log(`\n--- Swapping ${this.networkConfig.symbol} for Token ---`);
    await this.getProvider();
    
    const amountInWei = ethers.parseEther(amountIn.toString());
    const wrappedNative = WRAPPED_NATIVE[this.chainId];
    
    // Balance validation with detailed error message
    const balance = await this.provider.getBalance(this.account);
    if (balance < amountInWei) {
      const balanceFormatted = ethers.formatEther(balance);
      const requiredFormatted = ethers.formatEther(amountInWei);
      throw new Error(
        `Insufficient ${this.networkConfig.symbol} balance. ` +
        `Required: ${requiredFormatted} ${this.networkConfig.symbol}, ` +
        `Available: ${balanceFormatted} ${this.networkConfig.symbol}`
      );
    }
    
    const { fee, quote } = await this.fetchQuote(wrappedNative, tokenOut, amountInWei);
    const amountOutMin = quote ? quote * BigInt(100 - slippagePercent) / BigInt(100) : 0n;
    const deadline = Math.floor(Date.now() / 1000) + 1200;
    
    const router = new ethers.Contract(this.routerAddress, UNISWAP_V3_ROUTER_ABI, this.signer);
    const swapCalldata = this.encodeExactInputSingle({
      tokenIn: wrappedNative,
      tokenOut,
      fee,
      recipient: this.account,
      amountIn: amountInWei,
      amountOutMinimum: amountOutMin,
      sqrtPriceLimitX96: 0
    });
    
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
    const symbol = await token.symbol();
    const amountInWei = ethers.parseUnits(amountIn.toString(), decimals);
    const wrappedNative = WRAPPED_NATIVE[this.chainId];
    
    // Balance validation with detailed error message
    const tokenBalance = await token.balanceOf(this.account);
    if (tokenBalance < amountInWei) {
      const balanceFormatted = ethers.formatUnits(tokenBalance, decimals);
      const requiredFormatted = ethers.formatUnits(amountInWei, decimals);
      throw new Error(
        `Insufficient ${symbol} balance. ` +
        `Required: ${requiredFormatted} ${symbol}, ` +
        `Available: ${balanceFormatted} ${symbol}`
      );
    }
    
    await this.approveToken(tokenIn, this.routerAddress, amountInWei);
    
    const { fee, quote } = await this.fetchQuote(tokenIn, wrappedNative, amountInWei);
    const amountOutMin = quote ? quote * BigInt(100 - slippagePercent) / BigInt(100) : 0n;
    const deadline = Math.floor(Date.now() / 1000) + 1200;
    
    const router = new ethers.Contract(this.routerAddress, UNISWAP_V3_ROUTER_ABI, this.signer);
    const swapCalldata = this.encodeExactInputSingle({
      tokenIn,
      tokenOut: wrappedNative,
      fee,
      recipient: ADDRESS_THIS,
      amountIn: amountInWei,
      amountOutMinimum: amountOutMin,
      sqrtPriceLimitX96: 0
    });
    
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
    const decimalsIn = await tokenInContract.decimals();
    const symbolIn = await tokenInContract.symbol();
    const amountInWei = ethers.parseUnits(amountIn.toString(), decimalsIn);
    
    // Balance validation with detailed error message
    const tokenBalance = await tokenInContract.balanceOf(this.account);
    if (tokenBalance < amountInWei) {
      const balanceFormatted = ethers.formatUnits(tokenBalance, decimalsIn);
      const requiredFormatted = ethers.formatUnits(amountInWei, decimalsIn);
      throw new Error(
        `Insufficient ${symbolIn} balance. ` +
        `Required: ${requiredFormatted} ${symbolIn}, ` +
        `Available: ${balanceFormatted} ${symbolIn}`
      );
    }
    
    await this.approveToken(tokenIn, this.routerAddress, amountInWei);
    
    const { fee, quote } = await this.fetchQuote(tokenIn, tokenOut, amountInWei);
    const amountOutMin = quote ? quote * BigInt(100 - slippagePercent) / BigInt(100) : 0n;
    const deadline = Math.floor(Date.now() / 1000) + 1200;
    
    const router = new ethers.Contract(this.routerAddress, UNISWAP_V3_ROUTER_ABI, this.signer);
    const swapCalldata = this.encodeExactInputSingle({
      tokenIn,
      tokenOut,
      fee,
      recipient: this.account,
      amountIn: amountInWei,
      amountOutMinimum: amountOutMin,
      sqrtPriceLimitX96: 0
    });
    
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
  UNISWAP_V3_FACTORY,
  ERC20_ABI,
  WETH_ABI,
  FACTORY_ABI,
  POOL_ABI
};
