import { useState } from 'react';
import { motion } from 'framer-motion';
import { Fuel, TrendingUp, Clock } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { mockGasData } from '@/data/mockData';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';

const GasEstimator = () => {
  const [selectedChain, setSelectedChain] = useState('ethereum');

  const gasRates = {
    ethereum: { slow: 25, standard: 35, fast: 50 },
    polygon: { slow: 30, standard: 45, fast: 65 },
    bsc: { slow: 5, standard: 7, fast: 10 },
  };

  const currentRate = gasRates[selectedChain as keyof typeof gasRates];

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
            <h1 className="text-4xl font-bold gradient-text mb-2">Gas Fee Estimator</h1>
            <p className="text-muted-foreground">Real-time gas prices across multiple chains</p>
          </motion.div>

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
              </SelectContent>
            </Select>
          </motion.div>

          {/* Gas Price Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[
              { label: 'Slow', speed: '~5 min', gwei: currentRate.slow, color: 'from-blue-500 to-cyan-500' },
              { label: 'Standard', speed: '~2 min', gwei: currentRate.standard, color: 'from-purple-500 to-pink-500' },
              { label: 'Fast', speed: '~30 sec', gwei: currentRate.fast, color: 'from-orange-500 to-red-500' },
            ].map((tier, index) => (
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
                    <Clock className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-1">{tier.label}</h3>
                  <p className="text-3xl font-bold mb-2">{tier.gwei} <span className="text-lg text-muted-foreground">Gwei</span></p>
                  <p className="text-sm text-muted-foreground">{tier.speed}</p>
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <p className="text-sm text-muted-foreground">Estimated cost</p>
                    <p className="text-lg font-semibold">${(tier.gwei * 0.05).toFixed(2)}</p>
                  </div>
                </Card>
              </motion.div>
            ))}
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
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mockGasData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis 
                    dataKey="time" 
                    stroke="rgba(255,255,255,0.5)"
                    style={{ fontSize: '12px' }}
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
                    name="Slow"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="standard" 
                    stroke="#a855f7" 
                    strokeWidth={2}
                    dot={false}
                    name="Standard"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="fast" 
                    stroke="#f97316" 
                    strokeWidth={2}
                    dot={false}
                    name="Fast"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default GasEstimator;
