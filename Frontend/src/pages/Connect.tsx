import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/contexts/WalletContext';
import { useToast } from '@/hooks/use-toast';
import Navbar from '@/components/Navbar';


import { useEffect } from 'react';

const Connect = () => {
  const navigate = useNavigate();
  const { connectWallet, isConnected } = useWallet();
  const { toast } = useToast();

  // Only redirect after a real wallet connection
  useEffect(() => {
    if (isConnected) {
      toast({
        title: 'Wallet Connected',
        description: 'Successfully connected!',
      });
      navigate('/dashboard');
    }
  }, [isConnected, navigate, toast]);

  const handleConnect = async (provider?: 'metamask' | 'trustwallet') => {
    try {
      await connectWallet(provider as any);
    } catch (error) {
      toast({
        title: 'Connection Failed',
        description: 'Could not connect to wallet. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      
      <div className="pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center mx-auto mb-6 glow-border">
              <Wallet className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold mb-4 gradient-text">Connect Your Wallet</h1>
            <p className="text-xl text-muted-foreground">
              Choose your preferred wallet provider to get started
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="space-y-4"
          >
            <button
              onClick={() => handleConnect('metamask')}
              className="w-full glass-card-hover p-6 rounded-xl flex items-center gap-4 group"
            >
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                <Wallet className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-xl font-semibold mb-1 group-hover:text-primary transition-colors">
                  MetaMask
                </h3>
                <p className="text-sm text-muted-foreground">
                  Connect using MetaMask browser extension
                </p>
              </div>
            </button>

            <button
              onClick={() => handleConnect('trustwallet')}
              className="w-full glass-card-hover p-6 rounded-xl flex items-center gap-4 group"
            >
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <Wallet className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-xl font-semibold mb-1 group-hover:text-primary transition-colors">
                  Trust Wallet
                </h3>
                <p className="text-sm text-muted-foreground">
                  Connect using Trust Wallet mobile app
                </p>
              </div>
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-8 text-center text-sm text-muted-foreground"
          >
            <p>
              By connecting your wallet, you agree to our{' '}
              <a href="#" className="text-primary hover:underline">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="#" className="text-primary hover:underline">
                Privacy Policy
              </a>
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Connect;
