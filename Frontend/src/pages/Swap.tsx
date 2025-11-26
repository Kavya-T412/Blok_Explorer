import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowDownUp, Info } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

const Swap = () => {
  const [fromChain, setFromChain] = useState('ethereum');
  const [toChain, setToChain] = useState('polygon');
  const [amount, setAmount] = useState('');
  const [isSwapping, setIsSwapping] = useState(false);
  const { toast } = useToast();

  const handleSwap = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid amount to swap',
        variant: 'destructive',
      });
      return;
    }

    setIsSwapping(true);
    
    // Simulate swap process
    setTimeout(() => {
      setIsSwapping(false);
      toast({
        title: 'Swap Successful!',
        description: `Successfully swapped ${amount} tokens from ${fromChain} to ${toChain}`,
      });
      setAmount('');
    }, 2000);
  };

  const chains = [
    { value: 'ethereum', label: 'Ethereum (ETH)' },
    { value: 'polygon', label: 'Polygon (MATIC)' },
    { value: 'bsc', label: 'Binance Smart Chain (BNB)' },
  ];

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
            <h1 className="text-4xl font-bold gradient-text mb-2">Cross-Chain Swap</h1>
            <p className="text-muted-foreground">Swap tokens across different blockchain networks</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-8 rounded-xl"
          >
            {/* From Section */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">From</label>
              <div className="glass-card p-4 rounded-lg space-y-3">
                <Select value={fromChain} onValueChange={setFromChain}>
                  <SelectTrigger className="glass-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass-card border-white/10">
                    {chains.filter(c => c.value !== toChain).map(chain => (
                      <SelectItem key={chain.value} value={chain.value}>
                        {chain.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  placeholder="0.0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="glass-card text-2xl font-bold border-none focus-visible:ring-primary"
                />
                <p className="text-sm text-muted-foreground">Balance: 2.456 ETH</p>
              </div>
            </div>

            {/* Swap Icon */}
            <div className="flex justify-center my-4">
              <button className="glass-card-hover p-3 rounded-full">
                <ArrowDownUp className="w-6 h-6 text-primary" />
              </button>
            </div>

            {/* To Section */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">To</label>
              <div className="glass-card p-4 rounded-lg space-y-3">
                <Select value={toChain} onValueChange={setToChain}>
                  <SelectTrigger className="glass-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass-card border-white/10">
                    {chains.filter(c => c.value !== fromChain).map(chain => (
                      <SelectItem key={chain.value} value={chain.value}>
                        {chain.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="text-2xl font-bold text-muted-foreground">
                  {amount ? (parseFloat(amount) * 0.98).toFixed(4) : '0.0'}
                </div>
                <p className="text-sm text-muted-foreground">Estimated receive amount</p>
              </div>
            </div>

            {/* Swap Details */}
            <div className="glass-card p-4 rounded-lg mb-6 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Exchange Rate</span>
                <span className="font-medium">1 ETH = 0.98 MATIC</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Network Fee</span>
                <span className="font-medium">~$2.50</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Estimated Time</span>
                <span className="font-medium">2-5 minutes</span>
              </div>
            </div>

            {/* Info Banner */}
            <div className="glass-card p-4 rounded-lg mb-6 flex items-start gap-3">
              <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">
                Cross-chain swaps may take a few minutes to complete. You'll receive a notification once the swap is successful.
              </p>
            </div>

            {/* Swap Button */}
            <Button
              onClick={handleSwap}
              disabled={isSwapping || !amount}
              className="w-full text-lg py-6 glow-border"
            >
              {isSwapping ? 'Swapping...' : 'Swap Tokens'}
            </Button>
          </motion.div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Swap;
