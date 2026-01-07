import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowDownUp, Info, Loader2, ExternalLink, Settings, TrendingUp, Droplets } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useWallet } from '@/contexts/WalletContext';
import { Slider } from '@/components/ui/slider';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ethers } from 'ethers';
import { swapService, PoolDetails, QuoteDetails } from '@/services/swapService';

const API_BASE_URL = 'http://localhost:3001';

interface ChainConfig {
  chainId: number;
  name: string;
  symbol: string;
  type: 'mainnet' | 'testnet';
  dexes: string[];
  explorer: string;
}

interface Token {
  symbol: string;
  name?: string;
  address: string;
  decimals: number;
}

// ABIs
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

const UNISWAP_V3_ROUTER_ABI = [
  'function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96) params) external payable returns (uint256 amountOut)',
  'function multicall(uint256 deadline, bytes[] data) external payable returns (bytes[] memory results)',
  'function unwrapWETH9(uint256 amountMinimum, address recipient) external payable'
];

const QUOTER_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96) params) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

// Uniswap V3 Router Addresses
const ROUTER_ADDRESSES: Record<number, string> = {
  1: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  137: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  42161: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  10: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  8453: '0x2626664c2603336E57B271c5C0b26F421741e481',
  11155111: '0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E',
  80002: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  421614: '0x101F443B4d1b059569D643917553c771E1b9663E',
  11155420: '0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4',
  84532: '0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4'
};

const QUOTER_ADDRESSES: Record<number, string> = {
  1: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
  137: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
  42161: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
  10: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
  8453: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
  11155111: '0xEd1f6473345F45b75F8179591dd5bA1888cf2FB3',
  80002: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e'
};

const WRAPPED_NATIVE: Record<number, string> = {
  1: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  137: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
  42161: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  10: '0x4200000000000000000000000000000000000006',
  8453: '0x4200000000000000000000000000000000000006',
  11155111: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14',
  80002: '0x360ad4f9a9A8EFe9A8DCB5f461c4Cc1047E1Dcf9',
  421614: '0x980B62Da83eFf3D4576C647993b0c1D7faf17c73',
  11155420: '0x4200000000000000000000000000000000000006',
  84532: '0x4200000000000000000000000000000000000006'
};

const RPC_URLS: Record<number, string> = {
  1: 'https://ethereum-rpc.publicnode.com',
  137: 'https://polygon-rpc.com',
  42161: 'https://arb1.arbitrum.io/rpc',
  10: 'https://mainnet.optimism.io',
  8453: 'https://mainnet.base.org',
  11155111: 'https://rpc.sepolia.org',
  80002: 'https://rpc-amoy.polygon.technology',
  421614: 'https://sepolia-rollup.arbitrum.io/rpc',
  11155420: 'https://sepolia.optimism.io',
  84532: 'https://sepolia.base.org'
};

const FEE_TIERS = [500, 3000, 10000];
const ADDRESS_THIS = '0x0000000000000000000000000000000000000002';

const Swap = () => {
  const { address, isConnected, chainId: walletChainId } = useWallet();
  const { toast } = useToast();
  
  const [chains, setChains] = useState<ChainConfig[]>([]);
  const [selectedChain, setSelectedChain] = useState<ChainConfig | null>(null);
  const [tokens, setTokens] = useState<Record<string, Token>>({});
  const [fromToken, setFromToken] = useState<string>('native');
  const [toToken, setToToken] = useState<string>('');
  const [amount, setAmount] = useState('');
  const [slippage, setSlippage] = useState(1);
  const [isSwapping, setIsSwapping] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [networkMode, setNetworkMode] = useState<'mainnet' | 'testnet'>('testnet');
  const [estimatedOutput, setEstimatedOutput] = useState<string>('0.0');
  const [balance, setBalance] = useState<string>('0');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  
  // New state for detailed swap information
  const [poolDetails, setPoolDetails] = useState<PoolDetails[]>([]);
  const [allQuotes, setAllQuotes] = useState<QuoteDetails[]>([]);
  const [selectedFeeTier, setSelectedFeeTier] = useState<number>(3000);
  const [gasEstimate, setGasEstimate] = useState<string>('0');
  const [showDetails, setShowDetails] = useState(false);

  // Fetch chains
  useEffect(() => {
    const fetchChains = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/swap/chains?mode=${networkMode}`);
        const data = await response.json();
        
        if (data.success) {
          setChains(data.chains);
          if (data.chains.length > 0) {
            const defaultChain = data.chains.find((c: ChainConfig) => c.chainId === walletChainId) || data.chains[0];
            setSelectedChain(defaultChain);
          }
        }
      } catch (error) {
        console.error('Failed to fetch chains:', error);
        toast({ title: 'Error', description: 'Failed to load chains', variant: 'destructive' });
      } finally {
        setIsLoading(false);
      }
    };
    fetchChains();
  }, [networkMode, walletChainId, toast]);

  // Fetch tokens
  useEffect(() => {
    const fetchTokens = async () => {
      if (!selectedChain) return;
      
      try {
        const response = await fetch(`${API_BASE_URL}/api/swap/tokens/${selectedChain.chainId}`);
        const data = await response.json();
        
        if (data.success) {
          setTokens(data.tokens);
          setFromToken('native');
          const tokenKeys = Object.keys(data.tokens);
          const defaultTo = tokenKeys.find(k => k === 'wrappedNative') || tokenKeys.find(k => k !== 'native') || '';
          setToToken(defaultTo);
          // Reset amount and quote when changing chains
          setAmount('');
          setEstimatedOutput('0.0');
          setQuoteError(null);
          setPoolDetails([]);
          setAllQuotes([]);
          setGasEstimate('0');
        }
      } catch (error) {
        console.error('Failed to fetch tokens:', error);
      }
    };
    fetchTokens();
  }, [selectedChain]);

  // Fetch balance
  useEffect(() => {
    const fetchBalance = async () => {
      if (!selectedChain || !address || !window.ethereum) return;
      
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const network = await provider.getNetwork();
        
        if (Number(network.chainId) === selectedChain.chainId) {
          const balanceWei = await provider.getBalance(address);
          setBalance(parseFloat(ethers.formatEther(balanceWei)).toFixed(6));
        } else {
          const response = await fetch(`${API_BASE_URL}/api/swap/account/${selectedChain.chainId}/${address}`);
          const data = await response.json();
          if (data.success) {
            setBalance(parseFloat(data.account.balance).toFixed(6));
          }
        }
      } catch (error) {
        console.error('Failed to fetch balance:', error);
      }
    };
    fetchBalance();
  }, [selectedChain, address]);

  // Fetch real quote from backend with detailed pool information
  useEffect(() => {
    const fetchQuote = async () => {
      if (!amount || parseFloat(amount) <= 0 || !selectedChain || !fromToken || !toToken) {
        setEstimatedOutput('0.0');
        setQuoteError(null);
        setIsLoadingQuote(false);
        setPoolDetails([]);
        setAllQuotes([]);
        setGasEstimate('0');
        return;
      }

      const fromTokenData = tokens[fromToken];
      const toTokenData = tokens[toToken];

      if (!fromTokenData || !toTokenData) {
        setEstimatedOutput('0.0');
        setIsLoadingQuote(false);
        return;
      }

      setIsLoadingQuote(true);
      setQuoteError(null);

      try {
        // For wrap/unwrap, use 1:1 ratio
        if ((fromToken === 'native' && toToken === 'wrappedNative') || 
            (fromToken === 'wrappedNative' && toToken === 'native')) {
          setEstimatedOutput(amount);
          setIsLoadingQuote(false);
          setPoolDetails([]);
          setAllQuotes([]);
          setGasEstimate('0');
          return;
        }

        // Step 1 & 2: Get detailed quote with pool information
        const detailedQuote = await swapService.getDetailedQuote(
          selectedChain.chainId,
          fromToken,
          toToken,
          amount,
          fromTokenData.decimals,
          toTokenData.decimals
        );

        if (detailedQuote.success && detailedQuote.estimatedOutput) {
          const output = parseFloat(detailedQuote.estimatedOutput);
          // Apply slippage tolerance
          const slippageMultiplier = (100 - slippage) / 100;
          const outputWithSlippage = output * slippageMultiplier;
          
          setEstimatedOutput(outputWithSlippage.toFixed(6));
          setPoolDetails(detailedQuote.pools);
          setAllQuotes(detailedQuote.allQuotes);
          setSelectedFeeTier(detailedQuote.feeTier);
          setGasEstimate(detailedQuote.gasEstimate || '0');
          setIsLoadingQuote(false);
          
          console.log('✅ Quote fetched successfully:', {
            pools: detailedQuote.pools.length,
            feeTier: detailedQuote.feeTier,
            output: detailedQuote.estimatedOutput
          });
        } else {
          setQuoteError(detailedQuote.error || 'Unable to get quote');
          setEstimatedOutput('0.0');
          setPoolDetails([]);
          setAllQuotes([]);
          setIsLoadingQuote(false);
        }
      } catch (error) {
        console.error('Failed to fetch quote:', error);
        setQuoteError('Failed to fetch quote');
        // Fallback to simple estimation
        const inputAmount = parseFloat(amount);
        const slippageMultiplier = (100 - slippage) / 100;
        setEstimatedOutput((inputAmount * slippageMultiplier * 0.98).toFixed(6));
        setPoolDetails([]);
        setAllQuotes([]);
        setIsLoadingQuote(false);
      }
    };

    // Debounce the quote fetching
    const timeoutId = setTimeout(fetchQuote, 500);
    return () => clearTimeout(timeoutId);
  }, [amount, slippage, selectedChain, fromToken, toToken, tokens]);

  const findBestFeeTier = async (
    provider: ethers.BrowserProvider,
    tokenIn: string,
    tokenOut: string,
    amountIn: bigint,
    chainId: number
  ): Promise<number> => {
    const quoterAddress = QUOTER_ADDRESSES[chainId];
    if (!quoterAddress) return 3000;

    const quoter = new ethers.Contract(quoterAddress, QUOTER_ABI, provider);

    for (const fee of FEE_TIERS) {
      try {
        const params = { tokenIn, tokenOut, amountIn, fee, sqrtPriceLimitX96: 0n };
        await quoter.quoteExactInputSingle.staticCall(params);
        return fee;
      } catch {
        continue;
      }
    }
    return 3000;
  };

  const handleSwap = async () => {
    if (!isConnected) {
      toast({ title: 'Wallet Not Connected', description: 'Please connect your wallet', variant: 'destructive' });
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast({ title: 'Invalid Amount', description: 'Please enter a valid amount', variant: 'destructive' });
      return;
    }

    if (!selectedChain || !window.ethereum) {
      toast({ title: 'Error', description: 'No chain selected or wallet not found', variant: 'destructive' });
      return;
    }

    setIsSwapping(true);
    setTxHash(null);
    
    try {
      let provider = new ethers.BrowserProvider(window.ethereum);
      let network = await provider.getNetwork();
      
      // Switch network if needed
      if (Number(network.chainId) !== selectedChain.chainId) {
        toast({ title: 'Switching Network', description: `Please switch to ${selectedChain.name}` });
        
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: `0x${selectedChain.chainId.toString(16)}` }],
          });
          await new Promise(resolve => setTimeout(resolve, 1000));
          provider = new ethers.BrowserProvider(window.ethereum);
        } catch (switchError: any) {
          if (switchError.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: `0x${selectedChain.chainId.toString(16)}`,
                chainName: selectedChain.name,
                nativeCurrency: { name: selectedChain.symbol, symbol: selectedChain.symbol, decimals: 18 },
                rpcUrls: [RPC_URLS[selectedChain.chainId]],
                blockExplorerUrls: [selectedChain.explorer]
              }],
            });
            await new Promise(resolve => setTimeout(resolve, 1000));
            provider = new ethers.BrowserProvider(window.ethereum);
          } else {
            throw switchError;
          }
        }
      }

      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();
      const fromTokenData = tokens[fromToken];
      const toTokenData = tokens[toToken];
      
      if (!fromTokenData || !toTokenData) {
        throw new Error('Invalid token selection');
      }

      const fromDecimals = fromTokenData.decimals || 18;
      const amountIn = ethers.parseUnits(amount, fromDecimals);
      const deadline = Math.floor(Date.now() / 1000) + 1200;
      const wrappedNativeAddress = WRAPPED_NATIVE[selectedChain.chainId];
      const routerAddress = ROUTER_ADDRESSES[selectedChain.chainId];

      let tx;

      // WRAP: Native -> Wrapped
      if (fromToken === 'native' && toToken === 'wrappedNative') {
        toast({ title: 'Wrapping Token', description: `Wrapping ${amount} ${selectedChain.symbol}` });
        const wrappedContract = new ethers.Contract(wrappedNativeAddress, WETH_ABI, signer);
        tx = await wrappedContract.deposit({ value: amountIn });
      }
      // UNWRAP: Wrapped -> Native
      else if (fromToken === 'wrappedNative' && toToken === 'native') {
        toast({ title: 'Unwrapping Token', description: `Unwrapping ${amount} W${selectedChain.symbol}` });
        const wrappedContract = new ethers.Contract(wrappedNativeAddress, WETH_ABI, signer);
        tx = await wrappedContract.withdraw(amountIn);
      }
      // SWAP: Native -> Token
      else if (fromToken === 'native') {
        toast({ title: 'Swapping', description: `Swapping ${amount} ${selectedChain.symbol} for ${toTokenData.symbol}` });
        
        const workingFee = await findBestFeeTier(provider, wrappedNativeAddress, toTokenData.address, amountIn, selectedChain.chainId);
        const router = new ethers.Contract(routerAddress, UNISWAP_V3_ROUTER_ABI, signer);
        
        const params = {
          tokenIn: wrappedNativeAddress,
          tokenOut: toTokenData.address,
          fee: workingFee,
          recipient: userAddress,
          amountIn: amountIn,
          amountOutMinimum: 0n,
          sqrtPriceLimitX96: 0n
        };

        const iface = new ethers.Interface(UNISWAP_V3_ROUTER_ABI);
        const swapCalldata = iface.encodeFunctionData('exactInputSingle', [
          [params.tokenIn, params.tokenOut, params.fee, params.recipient, params.amountIn, params.amountOutMinimum, params.sqrtPriceLimitX96]
        ]);

        tx = await router.multicall(deadline, [swapCalldata], { value: amountIn, gasLimit: 350000n });
      }
      // SWAP: Token -> Native
      else if (toToken === 'native') {
        toast({ title: 'Swapping', description: `Swapping ${amount} ${fromTokenData.symbol} for ${selectedChain.symbol}` });
        
        const tokenContract = new ethers.Contract(fromTokenData.address, ERC20_ABI, signer);
        const allowance = await tokenContract.allowance(userAddress, routerAddress);
        
        if (allowance < amountIn) {
          toast({ title: 'Approving Token', description: `Please approve ${fromTokenData.symbol}` });
          const approveTx = await tokenContract.approve(routerAddress, ethers.MaxUint256);
          await approveTx.wait();
        }

        const workingFee = await findBestFeeTier(provider, fromTokenData.address, wrappedNativeAddress, amountIn, selectedChain.chainId);
        const router = new ethers.Contract(routerAddress, UNISWAP_V3_ROUTER_ABI, signer);
        
        const params = {
          tokenIn: fromTokenData.address,
          tokenOut: wrappedNativeAddress,
          fee: workingFee,
          recipient: ADDRESS_THIS,
          amountIn: amountIn,
          amountOutMinimum: 0n,
          sqrtPriceLimitX96: 0n
        };

        const iface = new ethers.Interface(UNISWAP_V3_ROUTER_ABI);
        const swapCalldata = iface.encodeFunctionData('exactInputSingle', [
          [params.tokenIn, params.tokenOut, params.fee, params.recipient, params.amountIn, params.amountOutMinimum, params.sqrtPriceLimitX96]
        ]);
        const unwrapCalldata = iface.encodeFunctionData('unwrapWETH9', [0n, userAddress]);

        tx = await router.multicall(deadline, [swapCalldata, unwrapCalldata], { gasLimit: 450000n });
      }
      // SWAP: Token -> Token
      else {
        toast({ title: 'Swapping', description: `Swapping ${amount} ${fromTokenData.symbol} for ${toTokenData.symbol}` });
        
        const tokenContract = new ethers.Contract(fromTokenData.address, ERC20_ABI, signer);
        const allowance = await tokenContract.allowance(userAddress, routerAddress);
        
        if (allowance < amountIn) {
          toast({ title: 'Approving Token', description: `Please approve ${fromTokenData.symbol}` });
          const approveTx = await tokenContract.approve(routerAddress, ethers.MaxUint256);
          await approveTx.wait();
        }

        const workingFee = await findBestFeeTier(provider, fromTokenData.address, toTokenData.address, amountIn, selectedChain.chainId);
        const router = new ethers.Contract(routerAddress, UNISWAP_V3_ROUTER_ABI, signer);
        
        const params = {
          tokenIn: fromTokenData.address,
          tokenOut: toTokenData.address,
          fee: workingFee,
          recipient: userAddress,
          amountIn: amountIn,
          amountOutMinimum: 0n,
          sqrtPriceLimitX96: 0n
        };

        const iface = new ethers.Interface(UNISWAP_V3_ROUTER_ABI);
        const swapCalldata = iface.encodeFunctionData('exactInputSingle', [
          [params.tokenIn, params.tokenOut, params.fee, params.recipient, params.amountIn, params.amountOutMinimum, params.sqrtPriceLimitX96]
        ]);

        tx = await router.multicall(deadline, [swapCalldata], { gasLimit: 400000n });
      }

      toast({ title: 'Transaction Submitted', description: 'Waiting for confirmation...' });
      setTxHash(tx.hash);
      const receipt = await tx.wait();
      
      toast({ title: 'Swap Successful! 🎉', description: `Confirmed in block ${receipt.blockNumber}` });
      setAmount('');

    } catch (error: any) {
      console.error('Swap error:', error);
      
      let errorMessage = 'An error occurred during the swap';
      
      if (error.code === 'ACTION_REJECTED' || error.code === 4001) {
        errorMessage = 'Transaction was rejected by user';
      } else if (error.code === 'INSUFFICIENT_FUNDS') {
        errorMessage = 'Insufficient funds for transaction';
      } else if (error.message?.includes('execution reverted')) {
        errorMessage = 'Swap failed. The pool may not exist for this token pair.';
      } else if (error.message) {
        errorMessage = error.message.substring(0, 150);
      }

      toast({ title: 'Swap Failed', description: errorMessage, variant: 'destructive' });
    } finally {
      setIsSwapping(false);
    }
  };

  const swapTokens = () => {
    const temp = fromToken;
    setFromToken(toToken);
    setToToken(temp);
    // Reset quote when swapping tokens
    setEstimatedOutput('0.0');
    setQuoteError(null);
    setPoolDetails([]);
    setAllQuotes([]);
    setGasEstimate('0');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="pt-24 pb-20 px-4 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      
      <div className="pt-24 pb-20 px-4">
        <div className="container mx-auto max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 text-center"
          >
            <h1 className="text-4xl font-bold gradient-text mb-2">Uniswap Multi-Chain Swap</h1>
            <p className="text-muted-foreground">Swap tokens using Uniswap V3 across networks</p>
          </motion.div>

          {/* Network Mode Toggle */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="mb-4 flex justify-center gap-2"
          >
            <Button
              variant={networkMode === 'mainnet' ? 'default' : 'outline'}
              onClick={() => setNetworkMode('mainnet')}
              size="sm"
            >
              Mainnet
            </Button>
            <Button
              variant={networkMode === 'testnet' ? 'default' : 'outline'}
              onClick={() => setNetworkMode('testnet')}
              size="sm"
            >
              Testnet
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-8 rounded-xl"
          >
            {/* Chain Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Network</label>
              <Select 
                value={selectedChain?.chainId.toString() || ''} 
                onValueChange={(value) => {
                  const chain = chains.find(c => c.chainId.toString() === value);
                  setSelectedChain(chain || null);
                }}
              >
                <SelectTrigger className="glass-card">
                  <SelectValue placeholder="Select Network" />
                </SelectTrigger>
                <SelectContent className="glass-card border-white/10">
                  {chains.map(chain => (
                    <SelectItem key={chain.chainId} value={chain.chainId.toString()}>
                      <div className="flex items-center gap-2">
                        <span>{chain.name}</span>
                        <span className="text-xs text-muted-foreground">({chain.symbol})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* From Section */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">From</label>
              <div className="glass-card p-4 rounded-lg space-y-3">
                <Select value={fromToken} onValueChange={setFromToken}>
                  <SelectTrigger className="glass-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass-card border-white/10">
                    {Object.entries(tokens)
                      .filter(([key]) => key !== toToken)
                      .map(([key, token]) => (
                        <SelectItem key={key} value={key}>
                          {token.symbol}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <div className="relative">
                  <Input
                    type="number"
                    placeholder="0.0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="glass-card text-2xl font-bold border-none focus-visible:ring-primary pr-16"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs"
                    onClick={() => setAmount(balance)}
                  >
                    MAX
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Balance: {balance} {tokens[fromToken]?.symbol || selectedChain?.symbol}
                </p>
              </div>
            </div>

            {/* Swap Icon */}
            <div className="flex justify-center my-4">
              <button 
                className="glass-card-hover p-3 rounded-full transition-transform hover:rotate-180 duration-300"
                onClick={swapTokens}
              >
                <ArrowDownUp className="w-6 h-6 text-primary" />
              </button>
            </div>

            {/* To Section */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">To</label>
              <div className="glass-card p-4 rounded-lg space-y-3">
                <Select value={toToken} onValueChange={setToToken}>
                  <SelectTrigger className="glass-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass-card border-white/10">
                    {Object.entries(tokens)
                      .filter(([key]) => key !== fromToken)
                      .map(([key, token]) => (
                        <SelectItem key={key} value={key}>
                          {token.symbol}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <div className="text-2xl font-bold text-muted-foreground flex items-center gap-2">
                  {isLoadingQuote ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span className="text-sm">Fetching quote...</span>
                    </>
                  ) : (
                    estimatedOutput
                  )}
                </div>
                {quoteError ? (
                  <p className="text-sm text-red-500">{quoteError}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">Estimated receive amount</p>
                )}
              </div>
            </div>

            {/* Swap Details */}
            <div className="glass-card p-4 rounded-lg mb-6 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Network</span>
                <span className="font-medium">{selectedChain?.name || 'Not selected'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">DEX</span>
                <span className="font-medium">Uniswap V3</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Slippage Tolerance</span>
                <span className="font-medium">{slippage}%</span>
              </div>
              {selectedFeeTier > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Best Fee Tier</span>
                  <span className="font-medium text-primary">{selectedFeeTier / 10000}%</span>
                </div>
              )}
              {gasEstimate !== '0' && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Est. Gas</span>
                  <span className="font-medium">{parseInt(gasEstimate).toLocaleString()}</span>
                </div>
              )}
            </div>

            {/* Settings Dialog */}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="w-full mb-4">
                  <Settings className="w-4 h-4 mr-2" />
                  Swap Settings
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-card">
                <DialogHeader>
                  <DialogTitle>Swap Settings</DialogTitle>
                  <DialogDescription>Configure your swap preferences</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Slippage Tolerance: {slippage}%
                    </label>
                    <Slider
                      value={[slippage]}
                      onValueChange={(value) => setSlippage(value[0])}
                      max={10}
                      min={0.1}
                      step={0.1}
                    />
                    <div className="flex gap-2 mt-2">
                      {[0.5, 1, 2, 5].map((val) => (
                        <Button
                          key={val}
                          variant={slippage === val ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setSlippage(val)}
                        >
                          {val}%
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Info Banner */}
            <div className="glass-card p-4 rounded-lg mb-6 flex items-start gap-3">
              <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">
                {networkMode === 'testnet' 
                  ? 'You are on testnet. Tokens have no real value.'
                  : 'Swaps are executed on mainnet. Please verify all details.'}
              </p>
            </div>

            {/* Connection Status */}
            {!isConnected && (
              <div className="glass-card p-4 rounded-lg mb-6 flex items-center justify-center gap-2 border border-yellow-500/30">
                <Info className="w-5 h-5 text-yellow-500" />
                <p className="text-sm text-yellow-500">Connect your wallet to swap tokens</p>
              </div>
            )}

            {/* Swap Button */}
            <Button
              onClick={handleSwap}
              disabled={isSwapping || !amount || !isConnected || !selectedChain}
              className="w-full text-lg py-6 glow-border"
            >
              {isSwapping ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Swapping...
                </>
              ) : !isConnected ? (
                'Connect Wallet'
              ) : (
                'Swap Tokens'
              )}
            </Button>

            {/* Transaction Hash */}
            {txHash && selectedChain && (
              <div className="mt-4 glass-card p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Transaction Hash:</span>
                  <a
                    href={`${selectedChain.explorer}/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline inline-flex items-center gap-1 font-mono"
                  >
                    {txHash.substring(0, 10)}...{txHash.substring(txHash.length - 8)}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            )}

            {/* Explorer Link */}
            {selectedChain && (
              <div className="mt-4 text-center">
                <a
                  href={selectedChain.explorer}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1"
                >
                  View on Explorer
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </motion.div>

          {/* Supported Networks */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-8 glass-card p-6 rounded-xl"
          >
            <h3 className="text-lg font-semibold mb-4">
              Supported {networkMode === 'mainnet' ? 'Mainnet' : 'Testnet'} Networks
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {chains.map((chain) => (
                <div 
                  key={chain.chainId}
                  className={`glass-card p-3 rounded-lg text-center cursor-pointer transition-all hover:scale-105 ${
                    selectedChain?.chainId === chain.chainId ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setSelectedChain(chain)}
                >
                  <div className="font-medium text-sm">{chain.name}</div>
                  <div className="text-xs text-muted-foreground">{chain.symbol}</div>
                  <div className="text-xs text-muted-foreground mt-1">Uniswap V3</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Swap;
