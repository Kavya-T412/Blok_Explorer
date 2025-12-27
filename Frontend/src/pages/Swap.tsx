import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowDownUp, Info, Loader2, ExternalLink, Settings, RefreshCw } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useWallet } from '@/contexts/WalletContext';
import { NetworkModeIndicator } from '@/components/NetworkModeToggle';
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

// Backend API URL
const API_BASE_URL = 'http://localhost:3001';

// Chain configuration matching the dashboard
interface ChainConfig {
  chainId: number;
  name: string;
  symbol: string;
  type: 'mainnet' | 'testnet';
  dexes: string[];
  explorer: string;
  wrappedNative: string;
  stablecoins: Record<string, string>;
}

interface Token {
  symbol: string;
  name?: string;
  address: string;
  decimals: number;
}

// ABI definitions for swap contracts
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

// SwapRouter02 ABI (Sepolia, Mainnet SwapRouter02, Base) - NO deadline in struct
const UNISWAP_V3_SWAPROUTER02_ABI = [
  'function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96) params) external payable returns (uint256 amountOut)',
  'function multicall(uint256 deadline, bytes[] data) external payable returns (bytes[] memory results)',
  'function unwrapWETH9(uint256 amountMinimum, address recipient) external payable'
];

// Legacy SwapRouter ABI (old deployments) - HAS deadline in struct
const UNISWAP_V3_LEGACY_ROUTER_ABI = [
  'function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96) params) external payable returns (uint256 amountOut)'
];

// Quoter V2 ABI for getting quotes and checking pool availability
const UNISWAP_V3_QUOTER_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96) params) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

// Quoter V2 addresses by chain
const QUOTER_ADDRESSES: Record<number, string> = {
  1: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',      // Mainnet
  137: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',    // Polygon
  42161: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',  // Arbitrum
  10: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',     // Optimism
  8453: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',   // Base
  11155111: '0xEd1f6473345F45b75F8179591dd5bA1888cf2FB3' // Sepolia
};

// Available fee tiers to try (0.05%, 0.3%, 1%)
const FEE_TIERS = [500, 3000, 10000];

// Determine which routers use SwapRouter02 (no deadline in struct)
const SWAPROUTER02_ADDRESSES = [
  '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45', // Mainnet, Polygon, Arbitrum, Optimism SwapRouter02
  '0x2626664c2603336E57B271c5C0b26F421741e481', // Base SwapRouter02
  '0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E', // Sepolia SwapRouter02
].map(a => a.toLowerCase());

// DEX Router addresses by chain
const DEX_ROUTERS: Record<number, Record<string, string>> = {
  // Mainnet
  1: { uniswapV3: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45' },
  137: { quickswap: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff', uniswapV3: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45' },
  56: { pancakeswap: '0x10ED43C718714eb63d5aA57B78B54704E256024E' },
  42161: { uniswapV3: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45' },
  10: { uniswapV3: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45' },
  8453: { uniswapV3: '0x2626664c2603336E57B271c5C0b26F421741e481' },
  43114: { traderjoe: '0x60aE616a2155Ee3d9A68541Ba4544862310933d4' },
  // Testnet
  11155111: { uniswapV3: '0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E' },
  80002: { quickswap: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff' },
  97: { pancakeswap: '0xD99D1c33F9fC3444f8101754aBC46c52416550D1' },
  421614: { uniswapV3: '0x101F443B4d1b059569D643917553c771E1b9663E' },
  11155420: { uniswapV3: '0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4' },
  84532: { uniswapV3: '0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4' },
  43113: { traderjoe: '0x5db0735cf88F85E78ed742215090c465979B5006' }
};

// RPC URLs for networks (used when adding networks to wallet)
const RPC_URLS: Record<number, string> = {
  // Mainnet
  1: 'https://ethereum-rpc.publicnode.com',
  137: 'https://polygon-rpc.com',
  56: 'https://bsc-dataseed.binance.org',
  42161: 'https://arb1.arbitrum.io/rpc',
  10: 'https://mainnet.optimism.io',
  8453: 'https://mainnet.base.org',
  43114: 'https://api.avax.network/ext/bc/C/rpc',
  // Testnet
  11155111: 'https://rpc.sepolia.org',
  17000: 'https://ethereum-holesky-rpc.publicnode.com',
  80002: 'https://rpc-amoy.polygon.technology',
  97: 'https://bsc-testnet-rpc.publicnode.com',
  421614: 'https://sepolia-rollup.arbitrum.io/rpc',
  11155420: 'https://sepolia.optimism.io',
  84532: 'https://sepolia.base.org',
  43113: 'https://api.avax-test.network/ext/bc/C/rpc'
};

// Wrapped Native Token addresses by chain
const WRAPPED_NATIVE_ADDRESSES: Record<number, string> = {
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

// Helper function to get RPC URL
const getRpcUrl = (chainId: number): string => {
  return RPC_URLS[chainId] || 'https://ethereum-rpc.publicnode.com';
};

// Helper function to get wrapped native address for a chain
const getWrappedNativeAddress = (chainId: number): string => {
  const address = WRAPPED_NATIVE_ADDRESSES[chainId];
  if (!address) {
    throw new Error(`No wrapped native token configured for chain ${chainId}`);
  }
  return address;
};

const Swap = () => {
  const { address, isConnected, chainId: walletChainId } = useWallet();
  const { toast } = useToast();
  
  // State
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
  const [selectedDex, setSelectedDex] = useState<string>('');
  const [estimatedOutput, setEstimatedOutput] = useState<string>('0.0');
  const [balance, setBalance] = useState<string>('0');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [actualWalletChainId, setActualWalletChainId] = useState<number | null>(null);

  // Track the actual wallet chain ID
  useEffect(() => {
    const updateWalletChainId = async () => {
      if (window.ethereum && isConnected) {
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const network = await provider.getNetwork();
          setActualWalletChainId(Number(network.chainId));
        } catch (e) {
          console.error('Failed to get wallet chain ID:', e);
        }
      }
    };

    updateWalletChainId();

    // Listen for chain changes
    if (window.ethereum) {
      const handleChainChanged = (chainIdHex: string) => {
        setActualWalletChainId(parseInt(chainIdHex, 16));
      };
      window.ethereum.on('chainChanged', handleChainChanged);
      return () => {
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, [isConnected]);

  // Fetch supported chains
  useEffect(() => {
    const fetchChains = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/swap/chains?mode=${networkMode}`);
        const data = await response.json();
        
        if (data.success) {
          setChains(data.chains);
          // Set default chain based on wallet or first available
          if (data.chains.length > 0) {
            const defaultChain = data.chains.find((c: ChainConfig) => c.chainId === walletChainId) || data.chains[0];
            setSelectedChain(defaultChain);
          }
        }
      } catch (error) {
        console.error('Failed to fetch chains:', error);
        toast({
          title: 'Error',
          description: 'Failed to load supported chains',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchChains();
  }, [networkMode, walletChainId, toast]);

  // Fetch tokens when chain changes
  useEffect(() => {
    const fetchTokens = async () => {
      if (!selectedChain) return;
      
      try {
        const response = await fetch(`${API_BASE_URL}/api/swap/tokens/${selectedChain.chainId}`);
        const data = await response.json();
        
        if (data.success) {
          setTokens(data.tokens);
          setFromToken('native');
          // Set default to token to wrapped native or first stablecoin
          const tokenKeys = Object.keys(data.tokens);
          const defaultTo = tokenKeys.find(k => k === 'wrappedNative') || tokenKeys.find(k => k !== 'native') || '';
          setToToken(defaultTo);
          setSelectedDex(selectedChain.dexes[0] || '');
        }
      } catch (error) {
        console.error('Failed to fetch tokens:', error);
      }
    };

    fetchTokens();
  }, [selectedChain]);

  // Fetch balance from the actual wallet's current network
  useEffect(() => {
    const fetchBalance = async () => {
      if (!selectedChain || !address || !window.ethereum) return;
      
      try {
        // First try to get balance from user's connected wallet
        const provider = new ethers.BrowserProvider(window.ethereum);
        const network = await provider.getNetwork();
        const walletNetworkId = Number(network.chainId);
        
        // If wallet is on the selected chain, get balance directly
        if (walletNetworkId === selectedChain.chainId) {
          const balanceWei = await provider.getBalance(address);
          setBalance(parseFloat(ethers.formatEther(balanceWei)).toFixed(6));
        } else {
          // Fallback to API for the selected chain's balance
          const response = await fetch(`${API_BASE_URL}/api/swap/account/${selectedChain.chainId}/${address}`);
          const data = await response.json();
          
          if (data.success) {
            setBalance(parseFloat(data.account.balance).toFixed(6));
          }
        }
      } catch (error) {
        console.error('Failed to fetch balance:', error);
        // Fallback to API
        try {
          const response = await fetch(`${API_BASE_URL}/api/swap/account/${selectedChain.chainId}/${address}`);
          const data = await response.json();
          if (data.success) {
            setBalance(parseFloat(data.account.balance).toFixed(6));
          }
        } catch (apiError) {
          console.error('Failed to fetch balance from API:', apiError);
        }
      }
    };

    fetchBalance();
    
    // Also listen for account and chain changes
    if (window.ethereum) {
      const handleAccountsChanged = () => fetchBalance();
      const handleChainChanged = () => fetchBalance();
      
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
      
      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, [selectedChain, address]);

  // Calculate estimated output (simplified)
  useEffect(() => {
    if (amount && parseFloat(amount) > 0) {
      // Simplified estimation - in production, query DEX for actual quote
      const inputAmount = parseFloat(amount);
      const slippageMultiplier = (100 - slippage) / 100;
      setEstimatedOutput((inputAmount * slippageMultiplier * 0.98).toFixed(6));
    } else {
      setEstimatedOutput('0.0');
    }
  }, [amount, slippage]);

  const handleSwap = async () => {
    if (!isConnected) {
      toast({
        title: 'Wallet Not Connected',
        description: 'Please connect your wallet to swap tokens',
        variant: 'destructive',
      });
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid amount to swap',
        variant: 'destructive',
      });
      return;
    }

    if (!selectedChain) {
      toast({
        title: 'No Chain Selected',
        description: 'Please select a blockchain network',
        variant: 'destructive',
      });
      return;
    }

    if (!window.ethereum) {
      toast({
        title: 'No Wallet Found',
        description: 'Please install MetaMask or another Web3 wallet',
        variant: 'destructive',
      });
      return;
    }

    setIsSwapping(true);
    setTxHash(null);
    
    try {
      // Get provider and signer from wallet
      let provider = new ethers.BrowserProvider(window.ethereum);
      
      // Check if we need to switch networks
      let network = await provider.getNetwork();
      const currentChainId = Number(network.chainId);
      
      if (currentChainId !== selectedChain.chainId) {
        toast({
          title: 'Switching Network',
          description: `Please switch to ${selectedChain.name} in your wallet`,
        });
        
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: `0x${selectedChain.chainId.toString(16)}` }],
          });
          
          // Wait for the network switch to complete and refresh provider
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Re-create provider after network switch
          provider = new ethers.BrowserProvider(window.ethereum);
          
          // Verify the network switch was successful
          network = await provider.getNetwork();
          if (Number(network.chainId) !== selectedChain.chainId) {
            throw new Error(`Network switch failed. Expected chain ${selectedChain.chainId}, got ${Number(network.chainId)}`);
          }
        } catch (switchError: any) {
          if (switchError.code === 4902) {
            // Network not added to wallet, try to add it
            toast({
              title: 'Adding Network',
              description: `Adding ${selectedChain.name} to your wallet`,
            });
            
            try {
              await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [{
                  chainId: `0x${selectedChain.chainId.toString(16)}`,
                  chainName: selectedChain.name,
                  nativeCurrency: {
                    name: selectedChain.symbol,
                    symbol: selectedChain.symbol,
                    decimals: 18
                  },
                  rpcUrls: [getRpcUrl(selectedChain.chainId)],
                  blockExplorerUrls: [selectedChain.explorer]
                }],
              });
              
              // Wait and refresh provider after adding network
              await new Promise(resolve => setTimeout(resolve, 1000));
              provider = new ethers.BrowserProvider(window.ethereum);
            } catch (addError) {
              toast({
                title: 'Network Not Found',
                description: `Please manually add ${selectedChain.name} to your wallet`,
                variant: 'destructive',
              });
              throw addError;
            }
          } else {
            throw switchError;
          }
        }
      }

      // Get fresh signer after potential network switch
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();

      // Double-check we're on the correct network
      const finalNetwork = await provider.getNetwork();
      const finalChainId = Number(finalNetwork.chainId);
      if (finalChainId !== selectedChain.chainId) {
        throw new Error(`Wrong network detected. Your wallet is on chain ${finalChainId}, but selected chain is ${selectedChain.chainId} (${selectedChain.name}). Please manually switch networks in your wallet.`);
      }

      // Check user's native balance first
      const userBalance = await provider.getBalance(userAddress);
      console.log('User balance:', ethers.formatEther(userBalance), selectedChain.symbol);
      console.log('Chain ID:', finalChainId);
      console.log('User address:', userAddress);

      // Determine swap type and execute
      const fromTokenData = tokens[fromToken];
      const toTokenData = tokens[toToken];
      
      if (!fromTokenData || !toTokenData) {
        throw new Error('Invalid token selection');
      }

      // Parse amount based on token decimals
      const fromDecimals = fromTokenData.decimals || 18;
      const amountIn = ethers.parseUnits(amount, fromDecimals);
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes

      // Get the correct wrapped native address for this chain
      // Use local mapping as primary source (more reliable than API)
      const wrappedNativeAddress = getWrappedNativeAddress(selectedChain.chainId);
      
      console.log('Wrapped native address:', wrappedNativeAddress);
      console.log('Selected chain:', selectedChain.chainId, selectedChain.name);
      console.log('Amount to swap:', amount, 'parsed:', amountIn.toString());
      
      // Verify the contract exists by checking code
      const contractCode = await provider.getCode(wrappedNativeAddress);
      if (contractCode === '0x' || contractCode === '0x0') {
        throw new Error(`Wrapped native token contract not found at ${wrappedNativeAddress} on chain ${selectedChain.chainId}. Please check that you're on the correct network.`);
      }

      let tx;
      
      // WRAP: Native -> Wrapped Native (ETH -> WETH)
      if (fromToken === 'native' && toToken === 'wrappedNative') {
        // Check if user has enough balance (amount + estimated gas)
        const estimatedGasCost = ethers.parseEther('0.01'); // Rough estimate for gas
        const totalRequired = amountIn + estimatedGasCost;
        
        if (userBalance < totalRequired) {
          throw new Error(`Insufficient ${selectedChain.symbol} balance. You have ${ethers.formatEther(userBalance)} ${selectedChain.symbol}, but need approximately ${ethers.formatEther(totalRequired)} ${selectedChain.symbol} (${amount} + gas fees).`);
        }
        
        toast({
          title: 'Wrapping Token',
          description: `Wrapping ${amount} ${selectedChain.symbol} to W${selectedChain.symbol}`,
        });

        const wrappedContract = new ethers.Contract(
          wrappedNativeAddress,
          WETH_ABI,
          signer
        );

        // Estimate gas first to catch errors early
        let gasEstimate;
        try {
          gasEstimate = await wrappedContract.deposit.estimateGas({ value: amountIn });
          console.log('Gas estimate for wrap:', gasEstimate.toString());
        } catch (estimateError: any) {
          console.error('Gas estimation failed:', estimateError);
          // Try to get more details about the error
          const errorMsg = estimateError.reason || estimateError.message || 'Unknown error';
          throw new Error(`Transaction would fail: ${errorMsg}. Make sure you're on the correct network (${selectedChain.name}) and have sufficient balance.`);
        }

        // Add 20% buffer to gas estimate
        const gasLimit = (gasEstimate * BigInt(120)) / BigInt(100);
        
        try {
          tx = await wrappedContract.deposit({ 
            value: amountIn,
            gasLimit: gasLimit
          });
        } catch (txError: any) {
          console.error('Transaction failed:', txError);
          // Check if this is the specific JSON-RPC error
          if (txError.code === -32603 || txError.message?.includes('Internal JSON-RPC')) {
            throw new Error(`Transaction rejected by the network. This usually means: 1) Wrong network selected in wallet, 2) Insufficient balance for gas, or 3) Contract issue. Please verify you're on ${selectedChain.name} (Chain ID: ${selectedChain.chainId}).`);
          }
          throw txError;
        }
      }
      // UNWRAP: Wrapped Native -> Native (WETH -> ETH)
      else if (fromToken === 'wrappedNative' && toToken === 'native') {
        toast({
          title: 'Unwrapping Token',
          description: `Unwrapping ${amount} W${selectedChain.symbol} to ${selectedChain.symbol}`,
        });

        const wrappedContract = new ethers.Contract(
          wrappedNativeAddress,
          WETH_ABI,
          signer
        );

        // Check wrapped token balance first
        const wrappedBalance = await wrappedContract.balanceOf(userAddress);
        if (wrappedBalance < amountIn) {
          throw new Error(`Insufficient W${selectedChain.symbol} balance. You have ${ethers.formatUnits(wrappedBalance, 18)} but trying to unwrap ${amount}`);
        }

        tx = await wrappedContract.withdraw(amountIn);
      }
      // SWAP: Native -> Token
      else if (fromToken === 'native') {
        toast({
          title: 'Swapping Tokens',
          description: `Swapping ${amount} ${selectedChain.symbol} for ${toTokenData.symbol}`,
        });

        const routerAddress = getRouterAddress(selectedChain.chainId, selectedDex);
        const isV3 = selectedDex.includes('V3') || selectedDex === 'uniswapV3';

        if (isV3) {
          const isSwapRouter02 = SWAPROUTER02_ADDRESSES.includes(routerAddress.toLowerCase());
          
          // Try to find a working fee tier by checking quote (best effort, don't block if fails)
          let workingFee = 3000; // Default 0.3%
          let poolCheckPassed = false;
          const quoterAddress = QUOTER_ADDRESSES[selectedChain.chainId];
          
          if (quoterAddress) {
            const quoter = new ethers.Contract(quoterAddress, UNISWAP_V3_QUOTER_ABI, provider);
            
            for (const fee of FEE_TIERS) {
              try {
                const quoteParams = {
                  tokenIn: wrappedNativeAddress,
                  tokenOut: toTokenData.address,
                  amountIn: amountIn,
                  fee: fee,
                  sqrtPriceLimitX96: 0n
                };
                // Use staticCall to simulate the quote
                await quoter.quoteExactInputSingle.staticCall(quoteParams);
                workingFee = fee;
                poolCheckPassed = true;
                console.log(`Found pool with fee tier ${fee / 10000}%`);
                break;
              } catch (e) {
                console.log(`No pool found for fee tier ${fee / 10000}%`);
              }
            }
            
            if (!poolCheckPassed) {
              // Warn user but still try the swap - the contract will give actual error
              console.warn(`Pool check failed for ${selectedChain.symbol} -> ${toTokenData.symbol}, attempting swap anyway...`);
              toast({
                title: 'Pool Check Warning',
                description: `Could not verify pool exists. Attempting swap with 0.3% fee tier...`,
              });
            }
          }
          
          if (isSwapRouter02) {
            // SwapRouter02: Use multicall with deadline, exactInputSingle has NO deadline in params
            const router = new ethers.Contract(routerAddress, UNISWAP_V3_SWAPROUTER02_ABI, signer);
            
            const params = {
              tokenIn: wrappedNativeAddress,
              tokenOut: toTokenData.address,
              fee: workingFee,
              recipient: userAddress,
              amountIn: amountIn,
              amountOutMinimum: 0n,
              sqrtPriceLimitX96: 0n
            };

            // Encode exactInputSingle call
            const iface = new ethers.Interface(UNISWAP_V3_SWAPROUTER02_ABI);
            const swapCalldata = iface.encodeFunctionData('exactInputSingle', [
              [params.tokenIn, params.tokenOut, params.fee, params.recipient, params.amountIn, params.amountOutMinimum, params.sqrtPriceLimitX96]
            ]);

            // Call via multicall with deadline
            tx = await router.multicall(deadline, [swapCalldata], {
              value: amountIn,
              gasLimit: 350000n
            });
          } else {
            // Legacy SwapRouter: deadline in params struct
            const router = new ethers.Contract(routerAddress, UNISWAP_V3_LEGACY_ROUTER_ABI, signer);
            
            const params = {
              tokenIn: wrappedNativeAddress,
              tokenOut: toTokenData.address,
              fee: workingFee,
              recipient: userAddress,
              deadline: deadline,
              amountIn: amountIn,
              amountOutMinimum: 0n,
              sqrtPriceLimitX96: 0n
            };

            tx = await router.exactInputSingle(params, {
              value: amountIn,
              gasLimit: 300000n
            });
          }
        }
      }
      // SWAP: Token -> Native
      else if (toToken === 'native') {
        toast({
          title: 'Swapping Tokens',
          description: `Swapping ${amount} ${fromTokenData.symbol} for ${selectedChain.symbol}`,
        });

        // First approve the router
        const tokenContract = new ethers.Contract(fromTokenData.address, ERC20_ABI, signer);
        const routerAddress = getRouterAddress(selectedChain.chainId, selectedDex);
        
        const allowance = await tokenContract.allowance(userAddress, routerAddress);
        if (allowance < amountIn) {
          toast({
            title: 'Approving Token',
            description: `Please approve ${fromTokenData.symbol} for swap`,
          });
          const approveTx = await tokenContract.approve(routerAddress, ethers.MaxUint256);
          await approveTx.wait();
        }

        const isV3 = selectedDex.includes('V3') || selectedDex === 'uniswapV3';
        
        if (isV3) {
          const isSwapRouter02 = SWAPROUTER02_ADDRESSES.includes(routerAddress.toLowerCase());
          
          // Try to find a working fee tier (best effort, don't block if fails)
          let workingFee = 3000;
          let poolCheckPassed = false;
          const quoterAddress = QUOTER_ADDRESSES[selectedChain.chainId];
          
          if (quoterAddress) {
            const quoter = new ethers.Contract(quoterAddress, UNISWAP_V3_QUOTER_ABI, provider);
            
            for (const fee of FEE_TIERS) {
              try {
                const quoteParams = {
                  tokenIn: fromTokenData.address,
                  tokenOut: wrappedNativeAddress,
                  amountIn: amountIn,
                  fee: fee,
                  sqrtPriceLimitX96: 0n
                };
                await quoter.quoteExactInputSingle.staticCall(quoteParams);
                workingFee = fee;
                poolCheckPassed = true;
                console.log(`Found pool with fee tier ${fee / 10000}%`);
                break;
              } catch (e) {
                console.log(`No pool found for fee tier ${fee / 10000}%`);
              }
            }
            
            if (!poolCheckPassed) {
              console.warn(`Pool check failed for ${fromTokenData.symbol} -> ${selectedChain.symbol}, attempting swap anyway...`);
              toast({
                title: 'Pool Check Warning',
                description: `Could not verify pool exists. Attempting swap with 0.3% fee tier...`,
              });
            }
          }
          
          if (isSwapRouter02) {
            // SwapRouter02: Use multicall with deadline
            const router = new ethers.Contract(routerAddress, UNISWAP_V3_SWAPROUTER02_ABI, signer);
            
            const params = {
              tokenIn: fromTokenData.address,
              tokenOut: wrappedNativeAddress,
              fee: workingFee,
              recipient: userAddress,
              amountIn: amountIn,
              amountOutMinimum: 0n,
              sqrtPriceLimitX96: 0n
            };

            // Encode exactInputSingle call
            const iface = new ethers.Interface(UNISWAP_V3_SWAPROUTER02_ABI);
            const swapCalldata = iface.encodeFunctionData('exactInputSingle', [
              [params.tokenIn, params.tokenOut, params.fee, params.recipient, params.amountIn, params.amountOutMinimum, params.sqrtPriceLimitX96]
            ]);

            // Call via multicall with deadline
            tx = await router.multicall(deadline, [swapCalldata], { gasLimit: 400000n });
          } else {
            // Legacy SwapRouter
            const router = new ethers.Contract(routerAddress, UNISWAP_V3_LEGACY_ROUTER_ABI, signer);
            
            const params = {
              tokenIn: fromTokenData.address,
              tokenOut: wrappedNativeAddress,
              fee: workingFee,
              recipient: userAddress,
              deadline: deadline,
              amountIn: amountIn,
              amountOutMinimum: 0n,
              sqrtPriceLimitX96: 0n
            };

            tx = await router.exactInputSingle(params, { gasLimit: 350000n });
          }
        }
      }
      // SWAP: Token -> Token
      else {
        toast({
          title: 'Swapping Tokens',
          description: `Swapping ${amount} ${fromTokenData.symbol} for ${toTokenData.symbol}`,
        });

        // First approve the router
        const tokenContract = new ethers.Contract(fromTokenData.address, ERC20_ABI, signer);
        const routerAddress = getRouterAddress(selectedChain.chainId, selectedDex);
        
        const allowance = await tokenContract.allowance(userAddress, routerAddress);
        if (allowance < amountIn) {
          toast({
            title: 'Approving Token',
            description: `Please approve ${fromTokenData.symbol} for swap`,
          });
          const approveTx = await tokenContract.approve(routerAddress, ethers.MaxUint256);
          await approveTx.wait();
        }

        const isV3 = selectedDex.includes('V3') || selectedDex === 'uniswapV3';
        
        if (isV3) {
          const isSwapRouter02 = SWAPROUTER02_ADDRESSES.includes(routerAddress.toLowerCase());
          
          // Try to find a working fee tier (best effort, don't block if fails)
          let workingFee = 3000;
          let poolCheckPassed = false;
          const quoterAddress = QUOTER_ADDRESSES[selectedChain.chainId];
          
          if (quoterAddress) {
            const quoter = new ethers.Contract(quoterAddress, UNISWAP_V3_QUOTER_ABI, provider);
            
            for (const fee of FEE_TIERS) {
              try {
                const quoteParams = {
                  tokenIn: fromTokenData.address,
                  tokenOut: toTokenData.address,
                  amountIn: amountIn,
                  fee: fee,
                  sqrtPriceLimitX96: 0n
                };
                await quoter.quoteExactInputSingle.staticCall(quoteParams);
                workingFee = fee;
                poolCheckPassed = true;
                console.log(`Found pool with fee tier ${fee / 10000}%`);
                break;
              } catch (e) {
                console.log(`No pool found for fee tier ${fee / 10000}%`);
              }
            }
            
            if (!poolCheckPassed) {
              console.warn(`Pool check failed for ${fromTokenData.symbol} -> ${toTokenData.symbol}, attempting swap anyway...`);
              toast({
                title: 'Pool Check Warning',
                description: `Could not verify pool exists. Attempting swap with 0.3% fee tier...`,
              });
            }
          }
          
          if (isSwapRouter02) {
            // SwapRouter02: Use multicall with deadline
            const router = new ethers.Contract(routerAddress, UNISWAP_V3_SWAPROUTER02_ABI, signer);
            
            const params = {
              tokenIn: fromTokenData.address,
              tokenOut: toTokenData.address,
              fee: workingFee,
              recipient: userAddress,
              amountIn: amountIn,
              amountOutMinimum: 0n,
              sqrtPriceLimitX96: 0n
            };

            // Encode exactInputSingle call
            const iface = new ethers.Interface(UNISWAP_V3_SWAPROUTER02_ABI);
            const swapCalldata = iface.encodeFunctionData('exactInputSingle', [
              [params.tokenIn, params.tokenOut, params.fee, params.recipient, params.amountIn, params.amountOutMinimum, params.sqrtPriceLimitX96]
            ]);

            // Call via multicall with deadline
            tx = await router.multicall(deadline, [swapCalldata], { gasLimit: 400000n });
          } else {
            // Legacy SwapRouter
            const router = new ethers.Contract(routerAddress, UNISWAP_V3_LEGACY_ROUTER_ABI, signer);
            
            const params = {
              tokenIn: fromTokenData.address,
              tokenOut: toTokenData.address,
              fee: workingFee,
              recipient: userAddress,
              deadline: deadline,
              amountIn: amountIn,
              amountOutMinimum: 0n,
              sqrtPriceLimitX96: 0n
            };

            tx = await router.exactInputSingle(params, { gasLimit: 350000n });
          }
        }
      }

      // Wait for transaction confirmation
      toast({
        title: 'Transaction Submitted',
        description: 'Waiting for confirmation...',
      });

      setTxHash(tx.hash);
      const receipt = await tx.wait();

      toast({
        title: 'Swap Successful! 🎉',
        description: `Transaction confirmed in block ${receipt.blockNumber}`,
      });
      
      setAmount('');
      
      // Refresh balance
      if (address && selectedChain) {
        try {
          const response = await fetch(`${API_BASE_URL}/api/swap/account/${selectedChain.chainId}/${address}`);
          const data = await response.json();
          if (data.success) {
            setBalance(parseFloat(data.account.balance).toFixed(6));
          }
        } catch (e) {
          console.error('Failed to refresh balance:', e);
        }
      }

    } catch (error: any) {
      console.error('Swap error:', error);
      
      let errorMessage = 'An error occurred during the swap';
      
      if (error.code === 'ACTION_REJECTED' || error.code === 4001) {
        errorMessage = 'Transaction was rejected by user';
      } else if (error.code === 'INSUFFICIENT_FUNDS') {
        errorMessage = 'Insufficient funds for transaction';
      } else if (error.code === -32603 || (error.data && error.data.code === -32603)) {
        // Internal JSON-RPC error - usually means contract call failed
        errorMessage = 'Transaction failed. This could be due to: no liquidity pool, wrong network, insufficient balance, or slippage. Please try a different token pair or network.';
      } else if (error.code === 'CALL_EXCEPTION') {
        // Parse the error reason if available
        const reason = error.reason || error.data?.message || '';
        if (reason.includes('STF') || reason.includes('Too little received')) {
          errorMessage = 'Swap failed: Insufficient liquidity or slippage too high. Try a smaller amount or increase slippage.';
        } else if (reason.includes('SPL') || reason.includes('Price slippage')) {
          errorMessage = 'Swap failed: Price moved too much. Try increasing slippage tolerance.';
        } else if (reason.includes('TF') || reason.includes('Transfer failed')) {
          errorMessage = 'Swap failed: Token transfer failed. Make sure you have approved the token.';
        } else {
          errorMessage = `Contract call failed: ${reason || 'The pool may not exist or has no liquidity for this token pair on this network.'}`;
        }
      } else if (error.code === 'NETWORK_ERROR') {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error.reason) {
        errorMessage = error.reason;
      } else if (error.message) {
        // Clean up the error message
        const msg = error.message;
        if (msg.includes('Internal JSON-RPC error')) {
          errorMessage = 'Transaction failed. The pool may not exist for this token pair. Try ETH <-> WETH or use mainnet.';
        } else if (msg.includes('user rejected')) {
          errorMessage = 'Transaction was rejected by user';
        } else if (msg.includes('execution reverted')) {
          errorMessage = 'Swap reverted. No liquidity pool exists for this token pair on this network.';
        } else {
          errorMessage = msg.substring(0, 150);
        }
      }

      toast({
        title: 'Swap Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSwapping(false);
    }
  };

  // Helper function to get router address
  const getRouterAddress = (chainId: number, dex: string): string => {
    const routers = DEX_ROUTERS[chainId];
    if (!routers) {
      throw new Error(`No DEX routers configured for chain ${chainId}`);
    }
    const router = routers[dex] || Object.values(routers)[0];
    if (!router) {
      throw new Error(`No router found for DEX ${dex}`);
    }
    return router;
  };

  const swapTokens = () => {
    const temp = fromToken;
    setFromToken(toToken);
    setToToken(temp);
  };

  const handleMaxClick = () => {
    setAmount(balance);
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
            <h1 className="text-4xl font-bold gradient-text mb-2">Multi-Chain Swap</h1>
            <p className="text-muted-foreground">Swap tokens across different blockchain networks</p>
            <div className="mt-4 flex justify-center gap-2">
              <NetworkModeIndicator />
            </div>
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
                    onClick={handleMaxClick}
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
                <div className="text-2xl font-bold text-muted-foreground">
                  {estimatedOutput}
                </div>
                <p className="text-sm text-muted-foreground">Estimated receive amount</p>
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
                <span className="font-medium capitalize">{selectedDex || 'Auto'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Slippage Tolerance</span>
                <span className="font-medium">{slippage}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Estimated Gas</span>
                <span className="font-medium">~$2.50</span>
              </div>
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
                  <DialogDescription>
                    Configure your swap preferences
                  </DialogDescription>
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
                  {selectedChain && selectedChain.dexes.length > 0 && (
                    <div>
                      <label className="text-sm font-medium mb-2 block">Preferred DEX</label>
                      <Select value={selectedDex} onValueChange={setSelectedDex}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select DEX" />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedChain.dexes.map((dex) => (
                            <SelectItem key={dex} value={dex}>
                              {dex.charAt(0).toUpperCase() + dex.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            {/* Info Banner */}
            <div className="glass-card p-4 rounded-lg mb-6 flex items-start gap-3">
              <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">
                {networkMode === 'testnet' 
                  ? 'You are on testnet. Tokens have no real value. Get test tokens from faucets.'
                  : 'Swaps are executed on mainnet. Please verify all details before confirming.'}
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

            {/* Transaction Hash Display */}
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

          {/* Supported Networks Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-8 glass-card p-6 rounded-xl"
          >
            <h3 className="text-lg font-semibold mb-4">Supported {networkMode === 'mainnet' ? 'Mainnet' : 'Testnet'} Networks</h3>
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
                  <div className="text-xs text-muted-foreground mt-1">
                    {chain.dexes.length} DEX{chain.dexes.length !== 1 ? 'es' : ''}
                  </div>
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
