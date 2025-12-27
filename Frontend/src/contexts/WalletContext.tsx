import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useAccount, useDisconnect, useChainId } from 'wagmi';
import { openConnectModal } from '@/lib/reownAppKit';

interface WalletContextType {
  address: string | null;
  isConnected: boolean;
  chainId: number | undefined;
  connectWallet: (provider?: 'metamask' | 'trustwallet') => Promise<void>;
  disconnectWallet: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const { address: wagmiAddress, isConnected: wagmiIsConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const wagmiChainId = useChainId();
  
  const [address, setAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [chainId, setChainId] = useState<number | undefined>(undefined);

  // Sync wagmi account state with our context
  useEffect(() => {
    if (wagmiIsConnected && wagmiAddress) {
      setAddress(wagmiAddress);
      setIsConnected(true);
      setChainId(wagmiChainId);
    } else {
      setAddress(null);
      setIsConnected(false);
      setChainId(undefined);
    }
  }, [wagmiAddress, wagmiIsConnected, wagmiChainId]);

  const connectWallet = async (provider?: 'metamask' | 'trustwallet') => {
    // Open Reown AppKit modal for wallet connection
    openConnectModal();
  };

  const disconnectWallet = () => {
    disconnect();
    setAddress(null);
    setIsConnected(false);
    setChainId(undefined);
  };

  return (
    <WalletContext.Provider value={{ address, isConnected, chainId, connectWallet, disconnectWallet }}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};
