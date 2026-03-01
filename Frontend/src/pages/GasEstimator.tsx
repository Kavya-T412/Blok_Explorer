import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Fuel, TrendingUp, Clock, RefreshCw, AlertCircle, WifiOff } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import {
  Select, SelectContent, SelectGroup, SelectItem,
  SelectLabel, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface GasPrice {
  chainId: number | string;
  chainName: string;
  symbol?: string;
  type?: string;
  slow: number;
  standard: number;
  fast: number;
  suggestBaseFee: number;
  timestamp: number;
  history?: GasHistoryPoint[];
  error?: string;
  supported?: boolean;
  status?: string;
}

interface GasHistoryPoint {
  timestamp: number;
  slow: number;
  standard: number;
  fast: number;
  suggestBaseFee: number;
}

interface GasPricesResponse {
  [key: string]: GasPrice;
}

const BACKEND_URL = 'http://localhost:3001';
const REFRESH_INTERVAL = 30000; // 30 seconds

// Native token prices in USD (approximate; covers all supported chains)
const TOKEN_PRICES: { [key: string]: number } = {
  // By chain key (snake_case name from backend)
  ethereum_mainnet: 3200,
  polygon: 0.45,
  bsc: 580,
  arbitrum_one: 3200,
  optimism: 3200,
  base: 3200,
  avalanche: 35,
  // Testnets (negligible real value, but keep for USD calc display)
  sepolia: 3200,
  polygon_amoy: 0.45,
  bsc_testnet: 580,
  arbitrum_sepolia: 3200,
  optimism_sepolia: 3200,
  base_sepolia: 3200,
  avalanche_fuji: 35,
};

// Resolve token price by chain key or symbol
function resolveTokenPrice(chainKey: string, symbol?: string): number {
  if (TOKEN_PRICES[chainKey]) return TOKEN_PRICES[chainKey];
  // Fall back to symbol-based lookup
  const symbolPrices: { [k: string]: number } = {
    ETH: 3200, MATIC: 0.45, BNB: 580, AVAX: 35,
  };
  return symbolPrices[symbol || ''] || 2000;
}

const GasEstimator = () => {
  const [selectedChain, setSelectedChain] = useState('');
  const [gasPrices, setGasPrices] = useState<GasPricesResponse>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchGasPrices = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const response = await fetch(`${BACKEND_URL}/api/gas-prices`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        setGasPrices(data.data);
        setLastUpdate(new Date());

        // Auto-select first supported EVM chain if nothing selected yet
        if (!selectedChain) {
          const firstEvm = Object.keys(data.data).find(
            key => data.data[key].supported !== false
          );
          if (firstEvm) setSelectedChain(firstEvm);
        }
      } else {
        throw new Error(data.error || 'Failed to fetch gas prices');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch gas prices';
      setError(errorMessage);
      console.error('Error fetching gas prices:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchGasPrices();
    const interval = setInterval(() => fetchGasPrices(), REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  // Separate EVM & non-EVM chains from response
  const evmChainKeys = Object.keys(gasPrices).filter(
    k => gasPrices[k].supported !== false
  );
  const nonEvmChainKeys = Object.keys(gasPrices).filter(
    k => gasPrices[k].supported === false
  );

  // Split EVM chain keys into mainnet vs testnet
  const mainnetKeys = evmChainKeys.filter(k => gasPrices[k].type === 'mainnet');
  const testnetKeys = evmChainKeys.filter(k => gasPrices[k].type === 'testnet');

  const currentRate: GasPrice = gasPrices[selectedChain] || {
    chainId: 0,
    chainName: '',
    slow: 0,
    standard: 0,
    fast: 0,
    suggestBaseFee: 0,
    timestamp: 0,
    history: [],
    supported: true,
  };

  const isNotSupported = currentRate.supported === false || currentRate.status === 'not-supported';
  const hasError = (!isNotSupported && (currentRate as GasPrice).error) || error;

  // Format history for recharts
  const formatHistoryForChart = () => {
    if (!currentRate.history || currentRate.history.length === 0) return [];
    return currentRate.history.map((point: GasHistoryPoint) => {
      const date = new Date(point.timestamp);
      const timeLabel = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
      return {
        time: timeLabel,
        slow: point.slow,
        standard: point.standard,
        fast: point.fast,
      };
    });
  };

  const chartData = formatHistoryForChart();

  // Calculate estimated transfer cost in USD
  const calculateCost = (gweiAmount: number): string => {
    if (!gweiAmount || gweiAmount === 0) return '0.00';
    const tokenPrice = resolveTokenPrice(selectedChain, currentRate.symbol);
    const gasLimit = 21000;
    const tokenAmount = gweiAmount * gasLimit * 1e-9;
    const usdCost = tokenAmount * tokenPrice;
    if (usdCost < 0.001) return '<0.001';
    if (usdCost < 0.01) return usdCost.toFixed(3);
    return usdCost.toFixed(2);
  };

  // Display name for selector
  const chainLabel = (key: string) =>
    gasPrices[key]?.chainName || key;

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="pt-24 pb-20 px-4">
        <div className="container mx-auto max-w-6xl">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold gradient-text mb-2">Gas Fee Estimator</h1>
                <p className="text-muted-foreground">
                  Real-time gas prices across all supported chains via Alchemy
                </p>
              </div>
              <button
                onClick={() => fetchGasPrices(true)}
                disabled={refreshing || loading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg glass-card-hover transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span className="text-sm">Refresh</span>
              </button>
            </div>
            {lastUpdate && (
              <p className="text-xs text-muted-foreground mt-2">
                Last updated: {lastUpdate.toLocaleTimeString()}
              </p>
            )}
          </motion.div>

          {/* Error Alert */}
          {hasError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <Alert variant="destructive" className="glass-card border-red-500/50">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {error || (currentRate as GasPrice).error || 'Unable to fetch gas prices. Please try again.'}
                </AlertDescription>
              </Alert>
            </motion.div>
          )}

          {/* Chain Selector */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-6 rounded-xl mb-6"
          >
            <label className="block text-sm font-medium mb-2">Select Network</label>
            <Select value={selectedChain} onValueChange={setSelectedChain}>
              <SelectTrigger className="w-full md:w-72 border border-white/20 bg-white/10 dark:bg-black/30 backdrop-blur-md text-foreground">
                <SelectValue placeholder={loading ? 'Loading chains...' : 'Select a network'} />
              </SelectTrigger>
              <SelectContent
                className="z-[200] max-h-80 overflow-y-auto rounded-xl border border-white/20 bg-[#1a1a2e] text-white shadow-2xl"
                style={{ backdropFilter: 'none' }}
              >
                {/* Mainnet EVM chains */}
                {mainnetKeys.length > 0 && (
                  <SelectGroup>
                    <SelectLabel className="px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-purple-400">
                      ── Mainnet
                    </SelectLabel>
                    {mainnetKeys.map(key => (
                      <SelectItem
                        key={key}
                        value={key}
                        className="cursor-pointer rounded-lg py-2 text-sm text-white hover:bg-white/10 focus:bg-white/10 focus:text-white data-[state=checked]:text-purple-300"
                      >
                        {chainLabel(key)}
                        {gasPrices[key].symbol ? (
                          <span className="ml-1.5 text-xs text-white/50">({gasPrices[key].symbol})</span>
                        ) : null}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}

                {/* Testnet EVM chains */}
                {testnetKeys.length > 0 && (
                  <SelectGroup>
                    <SelectLabel className="px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-cyan-400 mt-1">
                      ── Testnet
                    </SelectLabel>
                    {testnetKeys.map(key => (
                      <SelectItem
                        key={key}
                        value={key}
                        className="cursor-pointer rounded-lg py-2 text-sm text-white hover:bg-white/10 focus:bg-white/10 focus:text-white data-[state=checked]:text-cyan-300"
                      >
                        {chainLabel(key)}
                        {gasPrices[key].symbol ? (
                          <span className="ml-1.5 text-xs text-white/50">({gasPrices[key].symbol})</span>
                        ) : null}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}

                {/* Non-EVM */}
                {nonEvmChainKeys.length > 0 && (
                  <SelectGroup>
                    <SelectLabel className="px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-yellow-500 mt-1">
                      ── Non-EVM (Not Supported)
                    </SelectLabel>
                    {nonEvmChainKeys.map(key => (
                      <SelectItem
                        key={key}
                        value={key}
                        className="cursor-pointer rounded-lg py-2 text-sm text-white/40 hover:bg-white/5 focus:bg-white/5 focus:text-white/50"
                      >
                        {chainLabel(key)} — Not Supported
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
              </SelectContent>
            </Select>
          </motion.div>

          {/* Not-Supported Banner */}
          {isNotSupported && selectedChain && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-8"
            >
              <div className="glass-card p-10 rounded-xl flex flex-col items-center justify-center gap-4 text-center border border-yellow-500/30">
                <WifiOff className="w-12 h-12 text-yellow-400" />
                <div>
                  <h3 className="text-xl font-bold text-yellow-400 mb-1">Gas Estimation Not Supported</h3>
                  <p className="text-muted-foreground text-sm">
                    <strong>{currentRate.chainName}</strong> is a non-EVM chain. Gas fee estimation via Alchemy RPC
                    is currently not supported. EVM chains are fully supported.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Gas Price Cards (only for supported EVM chains) */}
          {!isNotSupported && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {[
                  { label: 'Slow', speed: '~5 min', gwei: currentRate.slow, color: 'from-blue-500 to-cyan-500', icon: '🐢' },
                  { label: 'Standard', speed: '~2 min', gwei: currentRate.standard, color: 'from-purple-500 to-pink-500', icon: '⚡' },
                  { label: 'Fast', speed: '~30 sec', gwei: currentRate.fast, color: 'from-orange-500 to-red-500', icon: '🚀' },
                ].map((tier, index) => {
                  const baseFee = currentRate.suggestBaseFee || 0;
                  const priorityFee = tier.gwei > baseFee ? +(tier.gwei - baseFee).toFixed(6) : 0;

                  return (
                    <motion.div
                      key={tier.label}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 + index * 0.1 }}
                    >
                      <Card className="glass-card-hover p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${tier.color} flex items-center justify-center`}>
                            <Fuel className="w-6 h-6 text-white" />
                          </div>
                          <div className="text-2xl">{tier.icon}</div>
                        </div>
                        <h3 className="text-lg font-semibold mb-1">{tier.label}</h3>
                        <p className="text-3xl font-bold mb-2">
                          {loading ? (
                            <span className="text-muted-foreground animate-pulse">--</span>
                          ) : (
                            <>
                              {tier.gwei.toFixed(4)}{' '}
                              <span className="text-lg text-muted-foreground">Gwei</span>
                            </>
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mb-3">
                          <Clock className="w-3 h-3" />
                          {tier.speed}
                        </p>

                        {/* Base Fee + Priority Fee Breakdown */}
                        {!loading && baseFee > 0 && (
                          <div className="mb-4 p-3 bg-white/5 rounded-lg border border-white/10">
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-muted-foreground">Base Fee:</span>
                                <span className="text-sm font-medium">{baseFee.toFixed(4)} Gwei</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-muted-foreground">Priority Fee:</span>
                                <span className="text-sm font-medium">{priorityFee.toFixed(4)} Gwei</span>
                              </div>
                              <div className="pt-2 border-t border-white/10">
                                <div className="flex justify-between items-center">
                                  <span className="text-xs font-semibold">Total:</span>
                                  <span className="text-sm font-bold">{tier.gwei.toFixed(4)} Gwei</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="mt-4 pt-4 border-t border-white/10">
                          <p className="text-sm text-muted-foreground">Estimated cost (21k gas)</p>
                          <p className="text-lg font-semibold">
                            {loading ? (
                              <span className="text-muted-foreground animate-pulse">--</span>
                            ) : (
                              `$${calculateCost(tier.gwei)}`
                            )}
                          </p>
                        </div>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>

              {/* Gas Price Chart */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="glass-card p-6 rounded-xl"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold">Gas Price Trends (24h)</h2>
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>

                <div className="h-80">
                  {loading ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
                    </div>
                  ) : chartData.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-muted-foreground">No historical data available</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(156,163,175,0.3)" />
                        <XAxis
                          dataKey="time"
                          stroke="#9ca3af"
                          tick={{ fill: '#9ca3af', fontSize: 11 }}
                          interval="preserveStartEnd"
                          tickFormatter={(value, index) => {
                            if (chartData.length > 24 && index % 6 !== 0) return '';
                            return value;
                          }}
                        />
                        <YAxis
                          stroke="#9ca3af"
                          tick={{ fill: '#9ca3af', fontSize: 12 }}
                          label={{ value: 'Gwei', angle: -90, position: 'insideLeft', fill: '#9ca3af', fontSize: 12 }}
                          width={55}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1e1e2e',
                            border: '1px solid rgba(99,102,241,0.4)',
                            borderRadius: '8px',
                            color: '#f3f4f6',
                          }}
                          labelStyle={{ color: '#e5e7eb', fontWeight: 600 }}
                          itemStyle={{ color: '#d1d5db' }}
                          formatter={(value: number) => [`${value.toFixed(4)} Gwei`, '']}
                        />
                        <Legend
                          wrapperStyle={{ fontSize: '14px', color: '#9ca3af', paddingTop: '12px' }}
                          iconType="line"
                        />
                        <Line type="monotone" dataKey="slow" stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 5 }} name="Slow" />
                        <Line type="monotone" dataKey="standard" stroke="#a855f7" strokeWidth={2} dot={false} activeDot={{ r: 5 }} name="Standard" />
                        <Line type="monotone" dataKey="fast" stroke="#f97316" strokeWidth={2} dot={false} activeDot={{ r: 5 }} name="Fast" />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default GasEstimator;
