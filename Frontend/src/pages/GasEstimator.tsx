import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Fuel, TrendingUp, Clock, RefreshCw, AlertCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface GasPrice {
  chainId: number;
  chainName: string;
  slow: number;
  standard: number;
  fast: number;
  suggestBaseFee: number;
  timestamp: number;
  history?: GasHistoryPoint[];
  error?: string;
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

// Approximate token prices in USD (update these periodically for accuracy)
const TOKEN_PRICES: { [key: string]: number } = {
  ethereum: 2000,   // ETH price
  polygon: 0.50,    // MATIC price
  bsc: 300,         // BNB price
  arbitrum: 2000,   // ETH on Arbitrum
  optimism: 2000,   // ETH on Optimism
  base: 2000        // ETH on Base
};

const GasEstimator = () => {
  const [selectedChain, setSelectedChain] = useState('ethereum');
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
    
    // Set up auto-refresh
    const interval = setInterval(() => {
      fetchGasPrices();
    }, REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  const currentRate = gasPrices[selectedChain] || { 
    chainId: 0,
    chainName: '',
    slow: 0, 
    standard: 0, 
    fast: 0, 
    suggestBaseFee: 0,
    timestamp: 0,
    history: [],
    error: undefined 
  };
  const hasError = (currentRate as GasPrice).error || error;

  // Format history data for chart
  const formatHistoryForChart = () => {
    if (!currentRate.history || currentRate.history.length === 0) {
      return [];
    }

    return currentRate.history.map((point: GasHistoryPoint) => {
      const date = new Date(point.timestamp);
      const hours = date.getHours();
      const minutes = date.getMinutes();
      const timeLabel = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      
      return {
        time: timeLabel,
        slow: point.slow,
        standard: point.standard,
        fast: point.fast,
      };
    });
  };

  const chartData = formatHistoryForChart();

  // Calculate estimated cost in USD
  const calculateCost = (gweiAmount: number): string => {
    if (!gweiAmount || gweiAmount === 0) return '0.00';
    
    const tokenPrice = TOKEN_PRICES[selectedChain] || 2000;
    const gasLimit = 21000; // Standard transfer gas limit
    
    // Convert Gwei to token amount
    // 1 Gwei = 10^-9 of the native token (ETH, MATIC, BNB, etc.)
    const tokenAmount = gweiAmount * gasLimit * 0.000000001;
    
    // Calculate USD cost
    const usdCost = tokenAmount * tokenPrice;
    
    // Handle very small values
    if (usdCost < 0.01) {
      // Show more precision for small values
      if (usdCost < 0.001) {
        return '<0.001';
      }
      return usdCost.toFixed(3);
    }
    
    return usdCost.toFixed(2);
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      
      <div className="pt-24 pb-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold gradient-text mb-2">Gas Fee Estimator</h1>
                <p className="text-muted-foreground">Real-time gas prices across multiple chains</p>
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
                  {error || (currentRate as GasPrice).error || 'Unable to fetch gas prices. Please try again later.'}
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
            <label className="block text-sm font-medium mb-2">Select Chain</label>
            <Select value={selectedChain} onValueChange={setSelectedChain}>
              <SelectTrigger className="w-full md:w-64 glass-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="glass-card border-white/10">
                <SelectItem value="ethereum">Ethereum</SelectItem>
                <SelectItem value="polygon">Polygon</SelectItem>
                <SelectItem value="bsc">Binance Smart Chain</SelectItem>
                <SelectItem value="arbitrum">Arbitrum</SelectItem>
                <SelectItem value="optimism">Optimism</SelectItem>
                <SelectItem value="base">Base</SelectItem>
              </SelectContent>
            </Select>
          </motion.div>

          {/* Gas Price Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[
              { label: 'Slow', speed: '~5 min', gwei: currentRate.slow, color: 'from-blue-500 to-cyan-500', icon: '🐢' },
              { label: 'Standard', speed: '~2 min', gwei: currentRate.standard, color: 'from-purple-500 to-pink-500', icon: '⚡' },
              { label: 'Fast', speed: '~30 sec', gwei: currentRate.fast, color: 'from-orange-500 to-red-500', icon: '🚀' },
            ].map((tier, index) => {
              const baseFee = currentRate.suggestBaseFee || 0;
              const priorityFee = tier.gwei > baseFee ? tier.gwei - baseFee : 0;
              
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
                          {tier.gwei.toFixed(3)} <span className="text-lg text-muted-foreground">Gwei</span>
                        </>
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mb-3">
                      <Clock className="w-3 h-3" />
                      {tier.speed}
                    </p>
                    
                    {/* Base Fee and Priority Fee Breakdown */}
                    {!loading && baseFee > 0 && (
                      <div className="mb-4 p-3 bg-white/5 rounded-lg border border-white/10">
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-muted-foreground">Base Fee:</span>
                            <span className="text-sm font-medium">{baseFee.toFixed(3)} Gwei</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-muted-foreground">Priority Fee:</span>
                            <span className="text-sm font-medium">{priorityFee.toFixed(3)} Gwei</span>
                          </div>
                          <div className="pt-2 border-t border-white/10">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-semibold">Total:</span>
                              <span className="text-sm font-bold">{tier.gwei.toFixed(3)} Gwei</span>
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
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
              ) : chartData.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground">No historical data available</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis 
                      dataKey="time" 
                      stroke="rgba(255,255,255,0.5)"
                      style={{ fontSize: '10px' }}
                      interval="preserveStartEnd"
                      tickFormatter={(value, index) => {
                        // Show fewer labels on small screens
                        if (chartData.length > 24 && index % 6 !== 0) return '';
                        return value;
                      }}
                    />
                    <YAxis 
                      stroke="rgba(255,255,255,0.5)"
                      style={{ fontSize: '12px' }}
                      label={{ value: 'Gwei', angle: -90, position: 'insideLeft', fill: 'rgba(255,255,255,0.5)' }}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'rgba(15, 15, 30, 0.9)',
                        border: '1px solid rgba(0, 212, 255, 0.2)',
                        borderRadius: '8px',
                        backdropFilter: 'blur(12px)',
                      }}
                      labelStyle={{ color: '#fff' }}
                      formatter={(value: number) => [`${value.toFixed(3)} Gwei`, '']}
                    />
                    <Legend 
                      wrapperStyle={{ fontSize: '14px' }}
                      iconType="line"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="slow" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 5 }}
                      name="Slow"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="standard" 
                      stroke="#a855f7" 
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 5 }}
                      name="Standard"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="fast" 
                      stroke="#f97316" 
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 5 }}
                      name="Fast"
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default GasEstimator;
