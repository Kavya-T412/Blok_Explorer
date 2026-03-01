import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowDown, ExternalLink, Loader2, CheckCircle2, AlertCircle,
  RefreshCw, Search, ChevronDown, Zap, Clock, TrendingUp,
  Settings, History, Info, ChevronRight
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

// ── Slippage presets (as decimal fractions) ───────────────────────────────────
const SLIPPAGE_PRESETS = [
  { label: '0.1%', value: 0.001 },
  { label: '0.5%', value: 0.005 },  // default – best for most pairs
  { label: '1%', value: 0.01 },
  { label: '3%', value: 0.03 },
];
const DEFAULT_SLIPPAGE = 0.005;

// ── Slippage Settings Dialog ──────────────────────────────────────────────────
interface SlippageDialogProps {
  slippage: number;
  onChange: (v: number) => void;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}
function SlippageDialog({ slippage, onChange, open, onOpenChange }: SlippageDialogProps) {
  const [customInput, setCustomInput] = useState('');
  const [customActive, setCustomActive] = useState(false);

  const selectPreset = (v: number) => {
    onChange(v);
    setCustomActive(false);
    setCustomInput('');
  };

  const handleCustomChange = (raw: string) => {
    setCustomInput(raw);
    setCustomActive(true);
    const num = parseFloat(raw);
    if (!isNaN(num) && num > 0 && num <= 50) {
      onChange(num / 100);
    }
  };

  const isPresetActive = (v: number) => !customActive && Math.abs(slippage - v) < 0.000001;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm squid-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Slippage Tolerance
          </DialogTitle>
        </DialogHeader>

        <p className="text-xs text-gray-400 mt-1">
          Your transaction will revert if the price moves unfavorably by more than this amount.
        </p>

        {/* Preset chips */}
        <div className="flex gap-2 mt-4 flex-wrap">
          {SLIPPAGE_PRESETS.map(p => (
            <button
              key={p.value}
              onClick={() => selectPreset(p.value)}
              className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all ${isPresetActive(p.value)
                  ? 'border-squid-primary bg-squid-primary text-white'
                  : 'border-squid-border bg-white/20 dark:bg-white/5 hover:border-squid-primary/60 text-gray-600 dark:text-gray-300'
                }`}
            >
              {p.label}
              {p.value === DEFAULT_SLIPPAGE && (
                <span className="ml-1 text-[9px] uppercase font-bold opacity-70">best</span>
              )}
            </button>
          ))}
        </div>

        {/* Custom input */}
        <div className="mt-4">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Custom</label>
          <div className="relative flex items-center">
            <Input
              type="number"
              min="0.01"
              max="50"
              step="0.01"
              placeholder="e.g. 2.5"
              value={customInput}
              onChange={e => handleCustomChange(e.target.value)}
              className={`pr-8 rounded-2xl bg-black/5 dark:bg-white/5 border transition-all focus-visible:ring-1 focus-visible:ring-squid-primary ${customActive ? 'border-squid-primary' : 'border-squid-border'
                }`}
            />
            <span className="absolute right-3 text-sm text-gray-400 pointer-events-none">%</span>
          </div>
          {customActive && parseFloat(customInput) > 5 && (
            <p className="text-xs text-yellow-500 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> High slippage – you may get a worse rate.
            </p>
          )}
        </div>

        {/* Summary */}
        <div className="mt-4 p-3 rounded-2xl bg-squid-primary/5 border border-squid-primary/20 flex justify-between items-center">
          <span className="text-xs font-bold text-gray-400 uppercase">Current Tolerance</span>
          <span className="text-sm font-bold text-squid-primary">{(slippage * 100).toFixed(2)}%</span>
        </div>

        <Button
          className="w-full mt-2 rounded-2xl"
          onClick={() => onOpenChange(false)}
        >
          Save
        </Button>
      </DialogContent>
    </Dialog>
  );
}

const NATIVE_ADDRESS = '0x0000000000000000000000000000000000000000';
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
];

// Comprehensive chain icon map (Rubic blockchainName → icon URL)
// ── Chain display names (Rubic blockchainName → human-readable label) ────────
const CHAIN_DISPLAY_NAMES: Record<string, string> = {
  ETH: 'Ethereum', OPTIMISM: 'Optimism', BSC: 'BNB Chain',
  POLYGON: 'Polygon', ARBITRUM: 'Arbitrum', AVALANCHE: 'Avalanche',
  BASE: 'Base', FANTOM: 'Fantom', CELO: 'Celo', GNOSIS: 'Gnosis',
  MOONBEAM: 'Moonbeam', MOONRIVER: 'Moonriver', CRONOS: 'Cronos',
  AURORA: 'Aurora', KLAYTN: 'Klaytn', HARMONY: 'Harmony',
  FUSE: 'Fuse', BOBA: 'Boba', METIS: 'Metis', OKX: 'OKX Chain',
  ZK_SYNC: 'zkSync Era', ZK_FAIR: 'ZKFair', ZK_LINK: 'zkLink Nova',
  LINEA: 'Linea', SCROLL: 'Scroll', MANTLE: 'Mantle',
  BLAST: 'Blast', TAIKO: 'Taiko', MANTA_PACIFIC: 'Manta Pacific',
  MODE: 'Mode', POLYGON_ZKEVM: 'Polygon zkEVM', KAVA: 'Kava',
  ZETACHAIN: 'ZetaChain', ASTAR_EVM: 'Astar', VELAS: 'Velas',
  FLARE: 'Flare', CORE: 'CORE', TELOS: 'Telos',
  ROOTSTOCK: 'Rootstock', FILECOIN: 'Filecoin', THETA: 'Theta',
  IOTEX: 'IoTeX', FRAXTAL: 'Fraxtal', MERLIN: 'Merlin Chain',
  BITLAYER: 'BitLayer', HORIZEN_EON: 'Horizen EON', HEMI: 'Hemi',
  BERACHAIN: 'Berachain', GRAVITY: 'Gravity', SONEIUM: 'Soneium',
  PULSECHAIN: 'PulseChain', UNICHAIN: 'Unichain', BAHAMUT: 'Bahamut',
  XDC: 'XDC', SEI: 'Sei', XLAYER: 'X Layer', SYSCOIN: 'Syscoin',
  ONTOLOGY: 'Ontology', EOS: 'EOS', BOBA_BSC: 'Boba BNB',
  HYPER_EVM: 'HyperEVM', MEGAETH: 'MegaETH', MORPH: 'Morph',
  PLASMA: 'Plasma Blaze', MONAD: 'Monad',
  SOLANA: 'Solana', TRON: 'TRON', NEAR: 'NEAR', TON: 'TON',
  APTOS: 'Aptos', SUI: 'Sui', COSMOS: 'Cosmos', POLKADOT: 'Polkadot',
  KUSAMA: 'Kusama', OSMOSIS: 'Osmosis', ALGORAND: 'Algorand',
  STELLAR: 'Stellar', RIPPLE: 'XRP', CARDANO: 'Cardano',
  LITECOIN: 'Litecoin', DOGECOIN: 'Dogecoin', ZCASH: 'Zcash',
  BITCOIN: 'Bitcoin', MONERO: 'Monero', DASH: 'Dash', WAVES: 'Waves',
  NEO: 'NEO', TEZOS: 'Tezos', HEDERA: 'Hedera', FLOW: 'Flow',
  ZILLIQA: 'Zilliqa', WAX: 'WAX', SECRET: 'Secret', STARKNET: 'StarkNet',
  KADENA: 'Kadena', ICP: 'Internet Computer', MINA_PROTOCOL: 'Mina',
  CASPER: 'Casper', KAVA_COSMOS: 'Kava', SIA: 'Siacoin',
};

// Maps Rubic blockchainName → DeFiLlama icon slug (only where the name differs
// from the simple lowercase+underscore-to-space rule)
const CHAIN_SLUG_OVERRIDES: Record<string, string> = {
  ETH: 'ethereum', BSC: 'bsc', OKX: 'okexchain',
  ZK_SYNC: 'zksync era', ZK_FAIR: 'zkfair', ZK_LINK: 'zklink nova',
  ROOTSTOCK: 'rsk', RIPPLE: 'xrp', ICP: 'internet computer',
  ASTAR_EVM: 'astar', KAVA_COSMOS: 'kava', BOBA_BSC: 'boba bsc',
  GRAVITY: 'gravity alpha', HYPER_EVM: 'hyperliquid',
  BITCOIN: 'bitcoin', HEDERA: 'hedera', KLAYTN: 'kaia',
  HARMONY: 'harmony', DOGECOIN: 'dogechain', SIA: 'siacoin',
  HORIZEN_EON: 'horizen eon', BERACHAIN: 'berachain bex',
  MANTA_PACIFIC: 'manta pacific',
};

// Build a DeFiLlama icon URL from a slug
const dlIcon = (slug: string) =>
  `https://icons.llamao.fi/icons/chains/rsz_${encodeURIComponent(slug)}.jpg`;

// Always returns a URL string. onError on the <img> tag handles 404s gracefully.
const getChainIcon = (blockchainName: string, apiImage?: string | null): string => {
  if (apiImage) return apiImage;
  const key = blockchainName.toUpperCase();
  const slug = CHAIN_SLUG_OVERRIDES[key] ?? key.toLowerCase().replace(/_/g, ' ');
  return dlIcon(slug);
};

// Human-readable chain display name
const formatChainName = (chain: { blockchainName: string; displayName?: string }): string => {
  const key = chain.blockchainName.toUpperCase();
  if (CHAIN_DISPLAY_NAMES[key]) return CHAIN_DISPLAY_NAMES[key];
  // Smart-case fallback: "POLYGON_ZKEVM" → "Polygon Zkevm"
  return chain.blockchainName
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
};

function formatProvider(p: string | undefined | null): string {
  if (!p) return 'Unknown';
  return p.split('_').map(w => w[0] + w.slice(1).toLowerCase()).join(' ');
}

/**
 * Smart amount formatter:
 * - Strips trailing zeros
 * - Adapts precision to the magnitude of the number
 *   ≥ 1000  → 2 decimal places   (e.g. 12345.67)
 *   ≥ 1     → 4 decimal places   (e.g. 1.2345)
 *   ≥ 0.001 → 6 decimal places   (e.g. 0.001234)
 *   < 0.001 → 8 decimal places   (e.g. 0.00000123)
 */
function fmtAmt(v: string | number | undefined, dp?: number): string {
  const n = parseFloat(String(v ?? '0'));
  if (isNaN(n) || n === 0) return '0';
  let decimals: number;
  if (dp !== undefined) {
    decimals = dp;
  } else if (n >= 1000) {
    decimals = 2;
  } else if (n >= 1) {
    decimals = 4;
  } else if (n >= 0.001) {
    decimals = 6;
  } else {
    decimals = 8;
  }
  // toFixed then strip trailing zeros after decimal point
  const fixed = n.toFixed(decimals);
  return fixed.includes('.') ? fixed.replace(/\.?0+$/, '') : fixed;
}

// ── Peanut Selector Component ────────────────────────────────────────────────
interface PeanutSelectorProps {
  chain: RubicChain | null;
  token: RubicToken | null;
  chains: RubicChain[];
  onChainSelect: (c: RubicChain) => void;
  onTokenSelect: (t: RubicToken) => void;
  isDestination?: boolean;
}

function PeanutSelector({ chain, token, chains, onChainSelect, onTokenSelect, isDestination }: PeanutSelectorProps) {
  const [chainOpen, setChainOpen] = useState(false);
  const [tokenOpen, setTokenOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredChains = search
    ? chains.filter(c => c.blockchainName.toLowerCase().includes(search.toLowerCase()))
    : chains;

  return (
    <div className="flex items-center gap-1 group">
      {/* Chain Selector (The left part of the peanut) */}
      <Dialog open={chainOpen} onOpenChange={setChainOpen}>
        <DialogTrigger asChild>
          <button className="h-10 px-3 rounded-l-full border border-r-0 border-squid-border bg-white/50 dark:bg-black/20 hover:bg-squid-primary/10 transition-colors flex items-center gap-2 max-w-[160px]">
            {chain ? (
              <>
                <div className="w-5 h-5 rounded-full bg-white/10 flex-shrink-0 flex items-center justify-center overflow-hidden">
                  <img
                    src={getChainIcon(chain.blockchainName, chain.image)}
                    alt={formatChainName(chain)}
                    className="w-5 h-5 rounded-full object-cover"
                    onError={e => {
                      const el = e.currentTarget;
                      el.style.display = 'none';
                      const p = el.parentElement;
                      if (p && !p.querySelector('span')) {
                        const s = document.createElement('span');
                        s.className = 'text-[10px] font-bold text-gray-500';
                        s.textContent = chain.blockchainName.slice(0, 2);
                        p.appendChild(s);
                      }
                    }}
                  />
                </div>
                <span className="text-xs font-semibold truncate">{formatChainName(chain)}</span>
              </>
            ) : (
              <span className="text-xs text-gray-400">Network</span>
            )}
            <ChevronDown className="w-3 h-3 text-gray-400 flex-shrink-0" />
          </button>
        </DialogTrigger>
        <DialogContent className="max-w-md squid-card">
          <DialogHeader><DialogTitle>Select Network</DialogTitle></DialogHeader>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search chain..."
              className="pl-9 h-12 rounded-2xl bg-black/5 dark:bg-white/5 border-none focus-visible:ring-1 focus-visible:ring-squid-primary"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 max-h-[400px] overflow-y-auto pr-2">
            {filteredChains.map(c => (
              <button
                key={c.blockchainName}
                onClick={() => { onChainSelect(c); setChainOpen(false); setSearch(''); }}
                className={`flex items-center gap-3 p-3 rounded-2xl hover:bg-squid-primary/10 transition-all text-left ${chain?.blockchainName === c.blockchainName ? 'bg-squid-primary/20 ring-1 ring-squid-primary' : ''}`}
              >
                <div className="w-8 h-8 rounded-full bg-white/10 flex-shrink-0 flex items-center justify-center overflow-hidden">
                  <img
                    src={getChainIcon(c.blockchainName, c.image)}
                    alt={formatChainName(c)}
                    className="w-8 h-8 rounded-full object-cover"
                    onError={e => {
                      const el = e.currentTarget;
                      el.style.display = 'none';
                      const p = el.parentElement;
                      if (p && !p.querySelector('span')) {
                        const s = document.createElement('span');
                        s.className = 'text-[10px] font-bold text-gray-500';
                        s.textContent = c.blockchainName.slice(0, 2);
                        p.appendChild(s);
                      }
                    }}
                  />
                </div>
                <span className="font-medium text-sm truncate">{formatChainName(c)}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Token Selector (The right part of the peanut) */}
      <TokenPickerInner
        chain={chain}
        selected={token}
        onSelect={onTokenSelect}
        open={tokenOpen}
        setOpen={setTokenOpen}
      />
    </div>
  );
}

function TokenPickerInner({ chain, selected, onSelect, open, setOpen }: { chain: RubicChain | null, selected: RubicToken | null, onSelect: (t: RubicToken) => void, open: boolean, setOpen: (b: boolean) => void }) {
  const [search, setSearch] = useState('');
  const [tokens, setTokens] = useState<RubicToken[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadTokens = useCallback(async (q: string) => {
    if (!chain) return;
    setLoading(true);
    try {
      const res = await rubicSwapService.getTokens(chain.blockchainName, q, 1, 50);
      setTokens(res);
    } catch {
      setTokens([]);
    } finally {
      setLoading(false);
    }
  }, [chain]);

  useEffect(() => {
    if (open) loadTokens('');
  }, [open, chain, loadTokens]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="h-10 pl-2 pr-4 rounded-r-full border border-squid-border bg-white/50 dark:bg-black/20 hover:bg-squid-primary/10 transition-colors flex items-center gap-2 min-w-[100px]">
          {selected ? (
            <>
              {selected.image && <img src={selected.image} alt="" className="w-6 h-6 rounded-full" />}
              <span className="font-bold text-sm tracking-tight">{selected.symbol}</span>
            </>
          ) : (
            <span className="text-gray-400 text-sm">Token</span>
          )}
          <ChevronDown className="w-3 h-3 text-gray-400 ml-auto" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md squid-card">
        <DialogHeader>
          <DialogTitle>Select Token {chain ? `on ${chain.blockchainName}` : ''}</DialogTitle>
        </DialogHeader>
        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by name or address..."
            className="pl-9 h-12 rounded-2xl bg-black/5 dark:bg-white/5 border-none focus-visible:ring-1 focus-visible:ring-squid-primary"
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              if (debounceRef.current) clearTimeout(debounceRef.current);
              debounceRef.current = setTimeout(() => loadTokens(e.target.value), 400);
            }}
          />
        </div>
        <div className="mt-4 space-y-1 max-h-[400px] overflow-y-auto pr-2">
          {loading ? (
            <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-squid-primary" /></div>
          ) : tokens.map(t => (
            <button
              key={t.address + t.symbol}
              onClick={() => { onSelect(t); setOpen(false); }}
              className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-squid-primary/10 transition-all text-left"
            >
              {t.image ? <img src={t.image} alt="" className="w-10 h-10 rounded-full" /> : <div className="w-10 h-10 rounded-full bg-gray-200" />}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm">{t.symbol}</p>
                <p className="text-xs text-gray-400 truncate">{t.name}</p>
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Route Card ────────────────────────────────────────────────────────────────
function RouteCard({ route, dstSymbol, selected, onSelect, isBest }: { route: RubicRoute, dstSymbol: string, selected: boolean, onSelect: () => void, isBest: boolean }) {
  return (
    <button
      onClick={onSelect}
      className={`w-full group relative p-4 rounded-3xl border transition-all duration-300 ${selected
        ? 'border-squid-primary bg-squid-primary/5 ring-1 ring-squid-primary'
        : 'border-squid-border bg-white/30 dark:bg-black/10 hover:border-squid-primary/40'
        }`}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-white/50 dark:bg-white/10">
            <Zap className={`w-4 h-4 ${isBest ? 'text-yellow-500' : 'text-gray-400'}`} />
          </div>
          <div>
            <p className="font-bold text-sm tracking-tight">{formatProvider(route.provider)}</p>
            <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-gray-400">
              {isBest && <span className="text-green-500">Best Return</span>}
              <span>•</span>
              <span>{route.type === 'cross-chain' ? 'Cross-Chain' : 'On-Chain'}</span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="font-bold text-lg text-squid-primary">{fmtAmt(route.toAmount)} {dstSymbol}</p>
          <p className="text-xs text-gray-400">≈ ${(route.toAmountUsd || 0).toFixed(2)}</p>
        </div>
      </div>
      <div className="flex items-center gap-4 text-[11px] font-medium text-gray-400">
        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> ~{Math.round((route.estimatedTime || 0) / 60)}m</span>
        <span className="flex items-center gap-1"><Info className="w-3 h-3" /> Gas included</span>
      </div>
    </button>
  );
}

// ── Main Layout ───────────────────────────────────────────────────────────────
export default function Swap() {
  const { toast } = useToast();
  const { address: walletAddress } = useWallet();

  const [chains, setChains] = useState<RubicChain[]>([]);
  const [srcChain, setSrcChain] = useState<RubicChain | null>(null);
  const [dstChain, setDstChain] = useState<RubicChain | null>(null);
  const [srcToken, setSrcToken] = useState<RubicToken | null>(null);
  const [dstToken, setDstToken] = useState<RubicToken | null>(null);
  const [srcAmount, setSrcAmount] = useState('');
  const [routes, setRoutes] = useState<RubicRoute[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<RubicRoute | null>(null);
  const [loading, setLoading] = useState(false);
  const [showRoutes, setShowRoutes] = useState(false);
  const [slippage, setSlippage] = useState(DEFAULT_SLIPPAGE);
  const [slippageOpen, setSlippageOpen] = useState(false);
  const [previewAmount, setPreviewAmount] = useState<string>('');
  const [previewUsd, setPreviewUsd] = useState<number>(0);
  const [previewLoading, setPreviewLoading] = useState(false);
  const previewDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load Initial Data
  useEffect(() => {
    rubicSwapService.getChains(false).then(list => {
      const evm = list.filter(c => c.type === 'EVM' || !c.type);
      setChains(evm);
      if (evm.length > 0) {
        setSrcChain(evm[0]);
        setDstChain(evm[1] || evm[0]);
      }
    });
  }, []);

  // Debounced preview: fetch the best quote as the user types (600 ms delay)
  useEffect(() => {
    if (showRoutes) return; // don't run while the route list is visible
    if (previewDebounceRef.current) clearTimeout(previewDebounceRef.current);
    const amount = parseFloat(srcAmount);
    if (!srcToken || !dstToken || !srcChain || !dstChain || !srcAmount || isNaN(amount) || amount <= 0) {
      setPreviewAmount('');
      setPreviewUsd(0);
      return;
    }
    previewDebounceRef.current = setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const res = await rubicSwapService.getQuoteAll({
          srcTokenAddress: srcToken.address,
          srcTokenBlockchain: srcChain.blockchainName,
          dstTokenAddress: dstToken.address,
          dstTokenBlockchain: dstChain.blockchainName,
          srcTokenAmount: srcAmount,
        });
        if (res.length > 0) {
          setPreviewAmount(res[0].toAmount);
          setPreviewUsd(res[0].toAmountUsd || 0);
        } else {
          setPreviewAmount('');
          setPreviewUsd(0);
        }
      } catch {
        setPreviewAmount('');
        setPreviewUsd(0);
      } finally {
        setPreviewLoading(false);
      }
    }, 600);
  }, [srcAmount, srcToken, dstToken, srcChain, dstChain, showRoutes]);

  const fetchRoutes = async () => {
    if (!srcToken || !dstToken || !srcAmount) return;
    setLoading(true);
    try {
      const res = await rubicSwapService.getQuoteAll({
        srcTokenAddress: srcToken.address,
        srcTokenBlockchain: srcChain!.blockchainName,
        dstTokenAddress: dstToken.address,
        dstTokenBlockchain: dstChain!.blockchainName,
        srcTokenAmount: srcAmount,
      });
      setRoutes(res);
      setSelectedRoute(res[0]);
      setShowRoutes(true);
    } catch (err: any) {
      toast({ title: 'Quote Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const executeSwap = async () => {
    if (!selectedRoute || !srcChain || !dstChain || !srcToken || !dstToken || !walletAddress) {
      toast({ title: 'Connect wallet and select a route first', variant: 'destructive' });
      return;
    }
    const win = window as Window & typeof globalThis & { ethereum?: unknown };
    if (!win.ethereum) {
      toast({ title: 'No wallet found', description: 'Please install MetaMask or a compatible wallet.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const provider = new ethers.BrowserProvider(win.ethereum as ethers.Eip1193Provider);
      const signer = await provider.getSigner();

      toast({ title: 'Refreshing quote...', description: 'Getting latest price' });
      let freshRouteId = selectedRoute.id;
      try {
        const freshRoutes = await rubicSwapService.getQuoteAll({
          srcTokenAddress: srcToken.address,
          srcTokenBlockchain: srcChain.blockchainName,
          dstTokenAddress: dstToken.address,
          dstTokenBlockchain: dstChain.blockchainName,
          srcTokenAmount: srcAmount,
        });
        const match = freshRoutes.find(r => r.provider === selectedRoute.provider) ?? freshRoutes[0];
        if (match?.id) freshRouteId = match.id;
      } catch { /* fall through */ }

      const swapData = await rubicSwapService.getSwapData({
        srcTokenAddress: srcToken.address,
        srcTokenBlockchain: srcChain.blockchainName,
        dstTokenAddress: dstToken.address,
        dstTokenBlockchain: dstChain.blockchainName,
        srcTokenAmount: srcAmount,
        id: freshRouteId,
        fromAddress: walletAddress,
        receiverAddress: walletAddress,
        slippage,
      });
      const tx = swapData.transaction;
      const spenderAddress = tx.approvalAddress || tx.to;

      if (srcToken.address !== NATIVE_ADDRESS && spenderAddress) {
        const tokenContract = new ethers.Contract(srcToken.address, ERC20_ABI, signer);
        const srcAmtBig = ethers.parseUnits(srcAmount, srcToken.decimals);
        const allowance: bigint = await tokenContract.allowance(walletAddress, spenderAddress) as bigint;
        if (allowance < srcAmtBig) {
          toast({ title: 'Approving token...', description: 'Please confirm in wallet' });
          const approveTx = await tokenContract.approve(spenderAddress, srcAmtBig);
          await (approveTx as { wait: () => Promise<unknown> }).wait();
        }
      }

      toast({ title: 'Confirm swap in your wallet' });
      const txResponse = await signer.sendTransaction({
        to: tx.to,
        data: tx.data,
        value: tx.value ? BigInt(tx.value) : 0n,
      });
      toast({ title: 'Swap submitted!', description: `Tx: ${txResponse.hash.slice(0, 10)}...` });
      await txResponse.wait(1);
      toast({ title: 'Swap confirmed!', description: 'Transaction mined successfully.' });
      setShowRoutes(false);
      setSrcAmount('');
    } catch (err: any) {
      toast({ title: 'Swap failed', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const flip = () => {
    const [sc, dc, st, dt] = [srcChain, dstChain, srcToken, dstToken];
    setSrcChain(dc); setDstChain(sc); setSrcToken(dt); setDstToken(st);
  };

  return (
    <div className="relative min-h-screen font-sans selection:bg-squid-primary/30">

      <Navbar />

      <main className="container mx-auto max-w-[480px] px-4 pt-20 pb-40">
        {/* Page Header Tabs */}
        <div className="flex items-center justify-between mb-6 px-2">
          <div className="flex items-center gap-6">
            <button className="text-xl font-bold border-b-2 border-squid-primary pb-1">Swap</button>
          </div>
          <div className="flex items-center gap-3 bg-white/40 dark:bg-black/20 p-1 rounded-full border border-squid-border">
            <button className="p-2 hover:bg-white/60 dark:hover:bg-white/10 rounded-full transition-colors"><History className="w-5 h-5 text-gray-500" /></button>
            <button
              onClick={() => setSlippageOpen(true)}
              className="p-2 hover:bg-white/60 dark:hover:bg-white/10 rounded-full transition-colors relative"
              title={`Slippage: ${(slippage * 100).toFixed(2)}%`}
            >
              <Settings className="w-5 h-5 text-gray-500" />
              <span className="absolute -top-1 -right-1 text-[9px] font-bold bg-squid-primary text-white rounded-full px-1 leading-4">
                {(slippage * 100).toFixed(1)}%
              </span>
            </button>
          </div>
          <SlippageDialog
            slippage={slippage}
            onChange={setSlippage}
            open={slippageOpen}
            onOpenChange={setSlippageOpen}
          />
        </div>

        <motion.div
          layout
          className="squid-card p-2 relative overflow-hidden"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          {/* Main Form Overlay - Sliding Routes */}
          <AnimatePresence mode="wait">
            {!showRoutes ? (
              <motion.div
                key="form"
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                className="p-4 space-y-1"
              >
                {/* Pay Section */}
                <div className="squid-input-area group">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pay</span>
                    <span className="text-xs font-medium text-gray-400">Balance: 0.00</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <Input
                      type="number"
                      placeholder="0"
                      value={srcAmount}
                      onChange={e => setSrcAmount(e.target.value)}
                      className="bg-transparent border-none p-0 text-4xl font-bold h-auto focus-visible:ring-0 placeholder:text-gray-300 w-full"
                    />
                    <PeanutSelector
                      chain={srcChain}
                      token={srcToken}
                      chains={chains}
                      onChainSelect={setSrcChain}
                      onTokenSelect={setSrcToken}
                    />
                  </div>
                </div>

                {/* Flip Button */}
                <div className="flex justify-center -my-3 relative z-10">
                  <button
                    onClick={flip}
                    className="w-10 h-10 rounded-full bg-white dark:bg-zinc-800 border border-squid-border shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
                  >
                    <ArrowDown className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                {/* Receive Section */}
                <div className="squid-input-area group">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Receive</span>
                    <span className="text-xs font-medium text-gray-400">
                      {previewUsd > 0 ? `≈ $${previewUsd.toFixed(2)}` : '≈ $0.00'}
                    </span>
                  </div>

                  {/* Amount — full width so long numbers never get clipped */}
                  <div className="w-full mb-3 min-h-[2.75rem] flex items-center">
                    {previewLoading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-5 h-5 flex-shrink-0 animate-spin text-squid-primary" />
                        <span className="text-lg text-gray-400 animate-pulse">Calculating…</span>
                      </span>
                    ) : previewAmount ? (
                      <span
                        className="font-bold text-squid-primary break-all leading-tight"
                        style={{
                          fontSize: previewAmount.length > 14
                            ? '1.5rem'
                            : previewAmount.length > 10
                              ? '2rem'
                              : '2.25rem',
                        }}
                      >
                        {fmtAmt(previewAmount)}
                      </span>
                    ) : (
                      <span className="text-4xl font-bold text-gray-300">0</span>
                    )}
                  </div>

                  {/* Token / chain selector on its own row */}
                  <div className="flex justify-end">
                    <PeanutSelector
                      chain={dstChain}
                      token={dstToken}
                      chains={chains}
                      onChainSelect={setDstChain}
                      onTokenSelect={setDstToken}
                      isDestination
                    />
                  </div>
                </div>

                {/* Call to Action */}
                <button
                  onClick={fetchRoutes}
                  disabled={loading || !srcAmount}
                  className="squid-btn-primary mt-6"
                >
                  {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (walletAddress ? 'Review Swap' : 'Connect Wallet')}
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="routes"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 20, opacity: 0 }}
                className="p-4"
              >
                <div className="flex items-center gap-2 mb-6">
                  <button onClick={() => setShowRoutes(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full"><ChevronDown className="w-5 h-5 rotate-90" /></button>
                  <h3 className="font-bold text-lg">Select Route</h3>
                </div>

                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {routes.map((r, i) => (
                    <RouteCard
                      key={r.id}
                      route={r}
                      dstSymbol={dstToken?.symbol || ''}
                      selected={selectedRoute?.id === r.id}
                      onSelect={() => setSelectedRoute(r)}
                      isBest={i === 0}
                    />
                  ))}
                </div>

                <div className="mt-6 space-y-3">
                  <div className="p-4 rounded-3xl bg-squid-primary/5 border border-squid-primary/20 space-y-2">
                    <div className="flex justify-between text-xs font-bold text-gray-400 uppercase">
                      <span>Expected Output</span>
                      <span className="text-squid-text-primary">{fmtAmt(selectedRoute?.toAmount)} {dstToken?.symbol}</span>
                    </div>
                    <div className="flex justify-between text-xs font-bold text-gray-400 uppercase pt-1 border-t border-squid-primary/10">
                      <span>Slippage Tolerance</span>
                      <button
                        onClick={() => setSlippageOpen(true)}
                        className="flex items-center gap-1 text-squid-primary hover:underline"
                      >
                        {(slippage * 100).toFixed(2)}%
                        <Settings className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <button onClick={executeSwap} className="squid-btn-primary">
                    Confirm & Swap
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Footer Info */}
        {!showRoutes && (
          <div className="mt-8 px-4 py-4 rounded-3xl bg-white/20 dark:bg-black/10 backdrop-blur-sm border border-squid-border flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-squid-primary/20 flex items-center justify-center">
              <Zap className="w-4 h-4 text-squid-primary" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-squid-text-primary">Best Path Foundation</p>
              <p className="text-[10px] text-gray-500 font-medium">Squid aggregates the best routes across 100+ chains.</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

