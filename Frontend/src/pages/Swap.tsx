import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowDownUp, ExternalLink, Loader2, CheckCircle2, AlertCircle,
  RefreshCw, Search, ChevronDown, Zap, Clock, TrendingUp,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useWallet } from '@/contexts/WalletContext';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ethers } from 'ethers';
import { rubicSwapService, RubicChain, RubicToken, RubicRoute } from '@/services/swapService';

const NATIVE_ADDRESS = '0x0000000000000000000000000000000000000000';
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
];

// ── Chain explorer URLs ───────────────────────────────────────────────────────
const CHAIN_EXPLORERS: Record<string, string> = {
  ETH: 'https://etherscan.io',
  POLYGON: 'https://polygonscan.com',
  BSC: 'https://bscscan.com',
  ARBITRUM: 'https://arbiscan.io',
  OPTIMISM: 'https://optimistic.etherscan.io',
  BASE: 'https://basescan.org',
  AVALANCHE: 'https://snowtrace.io',
  LINEA: 'https://lineascan.build',
  ZKSYNC: 'https://explorer.zksync.io',
  SCROLL: 'https://scrollscan.com',
  MANTA: 'https://pacific-explorer.manta.network',
  METIS: 'https://andromeda-explorer.metis.io',
  BLAST: 'https://blastscan.io',
  FANTOM: 'https://ftmscan.com',
  CRONOS: 'https://cronoscan.com',
  MOONBEAM: 'https://moonscan.io',
  GNOSIS: 'https://gnosisscan.io',
  CELO: 'https://celoscan.io',
  MANTLE: 'https://explorer.mantle.xyz',
  FLARE: 'https://flare-explorer.flare.network',
  ROOTSTOCK: 'https://explorer.rsk.co',
};

function getExplorerTxUrl(blockchainName: string | undefined, txHash: string): string {
  const base = CHAIN_EXPLORERS[blockchainName?.toUpperCase() ?? ''] || 'https://etherscan.io';
  return `${base}/tx/${txHash}`;
}

function formatProvider(p: string | undefined | null): string {
  const map: Record<string, string> = {
    // Uniswap
    UNI_SWAP_V3: 'Uniswap V3',  UNISWAP_V3: 'Uniswap V3',
    UNISWAP_V2: 'Uniswap V2',   UNI_SWAP_V2: 'Uniswap V2',
    // Aggregators
    ODOS: 'Odos',
    ONE_INCH: '1inch',           ONE_INCH_V4: '1inch V4',  ONE_INCH_V5: '1inch V5',
    OPEN_OCEAN: 'OpenOcean',
    RANGO: 'Rango',
    LIFI: 'LI.FI',
    XY_DEX: 'XY Finance',
    UNIZEN: 'Unizen',
    ZRX: '0x Protocol',
    BRIDGERS: 'Bridgers',
    NATIVE_ROUTER: 'Native Router',
    SQUIDROUTER: 'Squid Router',
    // AMMs
    SUSHI_SWAP: 'SushiSwap',
    PANCAKE_SWAP_PROVIDER: 'PancakeSwap',  PANCAKE_SWAP: 'PancakeSwap',
    CURVE: 'Curve',
    BALANCER: 'Balancer',
    DODO: 'DODO',
    VERSE: 'Verse',
    WRAPPED: 'Wrapped',
    // Bridges
    STARGATE: 'Stargate', STARGATE_V2: 'Stargate V2',
    ACROSS: 'Across',
    SYMBIOSIS: 'Symbiosis',
    CELER: 'Celer', CELER_BRIDGE: 'Celer Bridge',
    MULTICHAIN: 'Multichain',
    WORMHOLE: 'Wormhole',
    ORBITER_BRIDGE: 'Orbiter', ORBITER_BRIDGE_V2: 'Orbiter V2',
    RELAY: 'Relay',
    MESON: 'Meson',
    DLN: 'DLN',
    ROUTER: 'Router Protocol',
  };
  if (!p) return 'Unknown';
  return map[p] ?? p.split('_').map(w => w[0] + w.slice(1).toLowerCase()).join(' ');
}

function fmtAmt(v: string | number | undefined, dp = 6): string {
  const n = parseFloat(String(v ?? '0'));
  return isNaN(n) ? '0' : n.toFixed(dp);
}

// ── Token Picker Dialog ───────────────────────────────────────────────────────
interface TokenPickerProps {
  blockchain: string;
  selected: RubicToken | null;
  onSelect: (t: RubicToken) => void;
  label: string;
}
function TokenPicker({ blockchain, selected, onSelect, label }: TokenPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [tokens, setTokens] = useState<RubicToken[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadTokens = useCallback(async (q: string) => {
    if (!blockchain) return;
    setLoading(true);
    try {
      const res = await rubicSwapService.getTokens(blockchain, q, 1, 50);
      setTokens(res);
    } catch {
      setTokens([]);
    } finally {
      setLoading(false);
    }
  }, [blockchain]);

  useEffect(() => {
    if (open) loadTokens('');
  }, [open, blockchain, loadTokens]);

  const handleSearch = (v: string) => {
    setSearch(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => loadTokens(v), 400);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl px-3 py-2 text-sm font-medium transition-all min-w-[120px]">
          {selected ? (
            <>
              {selected.image && <img src={selected.image} alt="" className="w-5 h-5 rounded-full" onError={e => ((e.target as HTMLImageElement).style.display='none')} />}
              <span>{selected.symbol}</span>
            </>
          ) : (
            <span className="text-gray-400">{label}</span>
          )}
          <ChevronDown className="w-3 h-3 ml-auto text-gray-400" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-sm bg-gray-900 border-white/10 text-white">
        <DialogHeader>
          <DialogTitle>Select Token{blockchain ? ` on ${blockchain}` : ''}</DialogTitle>
        </DialogHeader>
        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by symbol..."
            className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-gray-500"
            value={search}
            onChange={e => handleSearch(e.target.value)}
            autoFocus
          />
        </div>
        <div className="mt-2 max-h-72 overflow-y-auto space-y-1 pr-1">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
            </div>
          ) : tokens.length === 0 ? (
            <p className="text-center text-gray-500 py-8 text-sm">No tokens found</p>
          ) : tokens.map(t => (
            <button
              key={t.address + t.symbol}
              onClick={() => { onSelect(t); setOpen(false); setSearch(''); }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors text-left ${selected?.address === t.address ? 'bg-blue-500/20 border border-blue-500/40' : ''}`}
            >
              {t.image && <img src={t.image} alt="" className="w-7 h-7 rounded-full flex-shrink-0" onError={e => ((e.target as HTMLImageElement).style.display='none')} />}
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{t.symbol}</p>
                <p className="text-xs text-gray-400 truncate">{t.name}</p>
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Chain Selector ────────────────────────────────────────────────────────────
interface ChainSelectorProps {
  chains: RubicChain[];
  selected: RubicChain | null;
  onSelect: (c: RubicChain) => void;
  label: string;
}
function ChainSelector({ chains, selected, onSelect, label }: ChainSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = search
    ? chains.filter(c => c.blockchainName.toLowerCase().includes(search.toLowerCase()))
    : chains;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl px-3 py-2 text-sm font-medium transition-all min-w-[140px]">
          <span>{selected ? selected.blockchainName : <span className="text-gray-400">{label}</span>}</span>
          <ChevronDown className="w-3 h-3 ml-auto text-gray-400" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-sm bg-gray-900 border-white/10 text-white">
        <DialogHeader><DialogTitle>Select Chain</DialogTitle></DialogHeader>
        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search chain..."
            className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-gray-500"
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />
        </div>
        <div className="mt-2 max-h-72 overflow-y-auto space-y-1 pr-1">
          {filtered.map(c => (
            <button
              key={c.blockchainName}
              onClick={() => { onSelect(c); setOpen(false); setSearch(''); }}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors text-left ${selected?.blockchainName === c.blockchainName ? 'bg-blue-500/20 border border-blue-500/40' : ''}`}
            >
              <span className="font-medium text-sm">{c.blockchainName}</span>
              <Badge variant="outline" className="ml-auto text-xs border-white/20 text-gray-400">{c.type}</Badge>
            </button>
          ))}
          {filtered.length === 0 && <p className="text-center text-gray-500 py-6 text-sm">No chains found</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Route Card ────────────────────────────────────────────────────────────────
interface RouteCardProps {
  route: RubicRoute;
  dstSymbol: string;
  selected: boolean;
  onSelect: () => void;
  isBest: boolean;
}
function RouteCard({ route, dstSymbol, selected, onSelect, isBest }: RouteCardProps) {
  const tags = route.tags ?? [];
  const fees = (route.fees ?? []).filter(f => f.percent > 0);
  const time = route.estimatedTime as number | undefined;
  const usd  = route.toAmountUsd as number | undefined;
  const impact = route.priceImpact as number | null | undefined;
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left p-4 rounded-xl border transition-all ${
        selected
          ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/20'
          : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm">{formatProvider(route.provider)}</span>
          {isBest && <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs py-0">Best</Badge>}
          {(tags as string[]).map(t => (
            <Badge key={t} variant="outline" className="text-xs border-white/20 text-gray-400 py-0">{t}</Badge>
          ))}
        </div>
        <div className="text-right">
          <div className="text-blue-400 font-bold text-base">{fmtAmt(route.toAmount)} {dstSymbol}</div>
          {usd != null && usd > 0 && <div className="text-xs text-gray-400">≈ ${usd.toFixed(2)}</div>}
        </div>
      </div>
      <div className="flex items-center gap-4 text-xs text-gray-400">
        {route.toAmountMin && (
          <span className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />Min: {fmtAmt(route.toAmountMin)} {dstSymbol}
          </span>
        )}
        {time != null && (
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />{time < 60 ? `${time}s` : `${Math.round(time / 60)}m`}
          </span>
        )}
        {impact != null && (
          <span className={impact < 0 ? 'text-red-400' : 'text-green-400'}>
            {impact > 0 ? '+' : ''}{impact.toFixed(2)}% impact
          </span>
        )}
        {fees.length > 0 && (
          <span className="flex items-center gap-1">
            Fee: {fees.map(f => `${f.percent}% ${f.tokenSymbol}`).join(' + ')}
          </span>
        )}
        <Badge variant="outline" className="text-xs border-white/20 text-gray-400 py-0 ml-auto">
          {route.type === 'cross-chain' ? 'Cross-Chain' : 'On-Chain'}
        </Badge>
      </div>
    </button>
  );
}

// ── Main Swap Component ───────────────────────────────────────────────────────
export default function Swap() {
  const { toast } = useToast();
  const { address: walletAddress } = useWallet();

  const [showTestnets, setShowTestnets] = useState(false);
  const [chains, setChains] = useState<RubicChain[]>([]);
  const [chainsLoading, setChainsLoading] = useState(true);
  const [srcChain, setSrcChain] = useState<RubicChain | null>(null);
  const [dstChain, setDstChain] = useState<RubicChain | null>(null);
  const [srcToken, setSrcToken] = useState<RubicToken | null>(null);
  const [dstToken, setDstToken] = useState<RubicToken | null>(null);

  const [srcAmount, setSrcAmount] = useState('');
  const [routes, setRoutes] = useState<RubicRoute[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<RubicRoute | null>(null);
  const [quotesLoading, setQuotesLoading] = useState(false);
  const [quotesError, setQuotesError] = useState('');

  const [swapLoading, setSwapLoading] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [txStatus, setTxStatus] = useState('');

  // Load chains
  useEffect(() => {
    let cancelled = false;
    setChainsLoading(true);
    rubicSwapService.getChains(showTestnets)
      .then(list => {
        if (!cancelled) {
          const evm = list.filter(c => c.type === 'EVM' || !c.type);
          setChains(evm);
          setSrcChain(null); setDstChain(null);
          setSrcToken(null); setDstToken(null);
        }
      })
      .catch(err => {
        if (!cancelled)
          toast({ title: 'Failed to load chains', description: err.message, variant: 'destructive' });
      })
      .finally(() => { if (!cancelled) setChainsLoading(false); });
    return () => { cancelled = true; };
  }, [showTestnets]);

  useEffect(() => { setSrcToken(null); }, [srcChain]);
  useEffect(() => { setDstToken(null); }, [dstChain]);
  useEffect(() => {
    setRoutes([]); setSelectedRoute(null); setQuotesError('');
  }, [srcChain, dstChain, srcToken, dstToken, srcAmount]);

  // Fetch routes
  const fetchRoutes = useCallback(async () => {
    if (!srcChain || !dstChain || !srcToken || !dstToken || !srcAmount) {
      toast({ title: 'Please fill all fields', variant: 'destructive' });
      return;
    }
    const amt = parseFloat(srcAmount);
    if (isNaN(amt) || amt <= 0) {
      toast({ title: 'Invalid amount', variant: 'destructive' });
      return;
    }
    setQuotesLoading(true);
    setQuotesError('');
    setRoutes([]);
    setSelectedRoute(null);
    try {
      const allRoutes = await rubicSwapService.getQuoteAll({
        srcTokenAddress: srcToken.address,
        srcTokenBlockchain: srcChain.blockchainName,
        dstTokenAddress: dstToken.address,
        dstTokenBlockchain: dstChain.blockchainName,
        srcTokenAmount: srcAmount,
      });
      if (allRoutes.length === 0) {
        setQuotesError('No routes found for this token pair. Try a different amount or pair.');
      } else {
        setRoutes(allRoutes);
        setSelectedRoute(allRoutes[0]);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch routes';
      setQuotesError(msg);
    } finally {
      setQuotesLoading(false);
    }
  }, [srcChain, dstChain, srcToken, dstToken, srcAmount, toast]);

  // Execute swap
  const executeSwap = useCallback(async () => {
    if (!selectedRoute || !srcChain || !dstChain || !srcToken || !dstToken || !walletAddress) {
      toast({ title: 'Connect wallet and select a route first', variant: 'destructive' });
      return;
    }
    const win = window as Window & typeof globalThis & { ethereum?: unknown };
    if (!win.ethereum) {
      toast({ title: 'No wallet found', description: 'Please install MetaMask or a compatible wallet.', variant: 'destructive' });
      return;
    }
    setSwapLoading(true);
    setTxHash('');
    setTxStatus('');
    try {
      const provider = new ethers.BrowserProvider(win.ethereum as ethers.Eip1193Provider);
      const signer = await provider.getSigner();

      const swapData = await rubicSwapService.getSwapData({
        srcTokenAddress: srcToken.address,
        srcTokenBlockchain: srcChain.blockchainName,
        dstTokenAddress: dstToken.address,
        dstTokenBlockchain: dstChain.blockchainName,
        srcTokenAmount: srcAmount,
        id: selectedRoute.id,
        fromAddress: walletAddress,
        receiverAddress: walletAddress,
      });
      const tx = swapData.transaction;

      // ERC-20 approval if needed
      if (srcToken.address !== NATIVE_ADDRESS && tx.to) {
        const tokenContract = new ethers.Contract(srcToken.address, ERC20_ABI, signer);
        const srcAmtBig = ethers.parseUnits(srcAmount, srcToken.decimals);
        const allowance: bigint = await tokenContract.allowance(walletAddress, tx.to) as bigint;
        if (allowance < srcAmtBig) {
          toast({ title: 'Approving token...', description: 'Please confirm in wallet' });
          const approveTx = await tokenContract.approve(tx.to, srcAmtBig);
          await (approveTx as { wait: () => Promise<unknown> }).wait();
          toast({ title: 'Approval confirmed', description: 'Proceeding to swap...' });
        }
      }

      toast({ title: 'Confirm swap in your wallet' });
      const txResponse = await signer.sendTransaction({
        to: tx.to,
        data: tx.data,
        value: tx.value ? BigInt(tx.value) : 0n,
      });
      setTxHash(txResponse.hash);
      toast({ title: 'Swap submitted!', description: `Tx: ${txResponse.hash.slice(0, 10)}...` });
      await txResponse.wait(1);
      setTxStatus('confirmed');
      toast({ title: 'Swap confirmed!', description: 'Transaction mined successfully.' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Swap failed';
      toast({ title: 'Swap failed', description: msg, variant: 'destructive' });
    } finally {
      setSwapLoading(false);
    }
  }, [selectedRoute, srcChain, dstChain, srcToken, dstToken, srcAmount, walletAddress, toast]);

  const swapDirection = () => {
    const tmpChain = srcChain; const tmpToken = srcToken;
    setSrcChain(dstChain); setSrcToken(dstToken);
    setDstChain(tmpChain); setDstToken(tmpToken);
    setSrcAmount(''); setRoutes([]); setSelectedRoute(null);
  };

  const canGetRoutes = !!(srcChain && dstChain && srcToken && dstToken && srcAmount && parseFloat(srcAmount) > 0);
  const canSwap = !!(selectedRoute && walletAddress && !swapLoading);

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto max-w-2xl px-4 py-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>

          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Token Swap
              </h1>
              <p className="text-gray-400 text-sm mt-1">Swap tokens across any chain via Rubic</p>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="testnet-toggle" className="text-gray-400 text-xs cursor-pointer">Testnets</Label>
              <Switch id="testnet-toggle" checked={showTestnets} onCheckedChange={setShowTestnets} />
            </div>
          </div>

          {/* Swap Card */}
          <div className="bg-gray-900 rounded-2xl border border-white/10 p-6 shadow-xl">
            {chainsLoading ? (
              <div className="flex flex-col items-center gap-3 py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
                <p className="text-gray-400 text-sm">Loading supported chains...</p>
              </div>
            ) : (
              <>
                {/* From */}
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">From</span>
                    <ChainSelector chains={chains} selected={srcChain} onSelect={setSrcChain} label="Select Chain" />
                  </div>
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      min="0"
                      placeholder="0.0"
                      value={srcAmount}
                      onChange={e => setSrcAmount(e.target.value)}
                      className="flex-1 bg-transparent border-none text-2xl font-bold focus-visible:ring-0 p-0 h-auto placeholder:text-gray-600"
                    />
                    {srcChain ? (
                      <TokenPicker blockchain={srcChain.blockchainName} selected={srcToken} onSelect={setSrcToken} label="Token" />
                    ) : (
                      <span className="text-sm text-gray-600 italic">Select chain first</span>
                    )}
                  </div>
                </div>

                {/* Swap direction */}
                <div className="flex justify-center -my-1 relative z-10">
                  <button
                    onClick={swapDirection}
                    className="bg-gray-800 border border-white/10 hover:bg-gray-700 rounded-full p-2 transition-colors"
                  >
                    <ArrowDownUp className="w-4 h-4 text-gray-400" />
                  </button>
                </div>

                {/* To */}
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">To</span>
                    <ChainSelector chains={chains} selected={dstChain} onSelect={setDstChain} label="Select Chain" />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 text-2xl font-bold text-gray-500">
                      {selectedRoute ? fmtAmt(selectedRoute.toAmount) : '\u2014'}
                    </div>
                    {dstChain ? (
                      <TokenPicker blockchain={dstChain.blockchainName} selected={dstToken} onSelect={setDstToken} label="Token" />
                    ) : (
                      <span className="text-sm text-gray-600 italic">Select chain first</span>
                    )}
                  </div>
                </div>

                {/* Get Routes */}
                <Button
                  onClick={fetchRoutes}
                  disabled={!canGetRoutes || quotesLoading}
                  className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl disabled:opacity-40"
                >
                  {quotesLoading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Fetching Routes...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4" /> Get Routes
                    </span>
                  )}
                </Button>

                {quotesError && (
                  <div className="mt-3 flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-sm text-red-400">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{quotesError}</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Routes */}
          {routes.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold">Available Routes</h2>
                <Badge variant="outline" className="border-white/20 text-gray-400">
                  {routes.length} route{routes.length !== 1 ? 's' : ''}
                </Badge>
              </div>
              <div className="space-y-3">
                {routes.map((r, i) => (
                  <RouteCard
                    key={r.id}
                    route={r}
                    dstSymbol={dstToken?.symbol ?? ''}
                    selected={selectedRoute?.id === r.id}
                    onSelect={() => setSelectedRoute(r)}
                    isBest={i === 0}
                  />
                ))}
              </div>

              {/* Selected route summary */}
              {selectedRoute && (
                <div className="mt-4 bg-gray-900 rounded-xl border border-white/10 p-4 text-sm space-y-2">
                  <div className="font-medium text-gray-300 mb-1 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-400" /> Swap Summary
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Provider</span>
                    <span className="text-white">{formatProvider(selectedRoute.provider)}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>You Send</span>
                    <span className="text-white">{srcAmount} {srcToken?.symbol}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>You Receive (est.)</span>
                    <span className="text-green-400 font-semibold">{fmtAmt(selectedRoute.toAmount)} {dstToken?.symbol}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Minimum Received</span>
                    <span className="text-white">{fmtAmt(selectedRoute.toAmountMin)} {dstToken?.symbol}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Route Type</span>
                    <Badge variant="outline" className="text-xs border-white/20 text-gray-300">
                      {selectedRoute.type === 'cross-chain' ? 'Cross-Chain' : 'On-Chain'}
                    </Badge>
                  </div>
                </div>
              )}

              {/* Swap button */}
              <Button
                onClick={executeSwap}
                disabled={!canSwap}
                className="w-full mt-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-4 text-base rounded-xl disabled:opacity-40"
              >
                {swapLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" /> Processing Swap...
                  </span>
                ) : !walletAddress ? (
                  'Connect Wallet to Swap'
                ) : (
                  `Swap via ${selectedRoute ? formatProvider(selectedRoute.provider) : '\u2014'}`
                )}
              </Button>

              {/* Tx result */}
              {txHash && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`mt-4 flex items-start gap-3 rounded-xl p-4 border text-sm ${
                    txStatus === 'confirmed'
                      ? 'bg-green-500/10 border-green-500/30 text-green-400'
                      : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                  }`}
                >
                  {txStatus === 'confirmed'
                    ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                    : <Loader2 className="w-5 h-5 animate-spin flex-shrink-0" />
                  }
                  <div>
                    <p className="font-semibold">
                      {txStatus === 'confirmed' ? 'Swap Confirmed!' : 'Transaction Pending...'}
                    </p>
                    <a
                      href={getExplorerTxUrl(srcChain?.blockchainName, txHash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline flex items-center gap-1 mt-1 opacity-80 hover:opacity-100 text-xs"
                    >
                      {txHash.slice(0, 12)}...{txHash.slice(-8)} <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {!walletAddress && (
            <p className="text-center text-gray-500 text-sm mt-6">
              Connect your wallet to execute swaps. Quotes are available without a wallet.
            </p>
          )}
        </motion.div>
      </main>
      <Footer />
    </div>
  );
}
