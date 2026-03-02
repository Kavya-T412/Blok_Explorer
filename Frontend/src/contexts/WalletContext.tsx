import { createContext, useContext, useState, ReactNode, useEffect, useRef } from 'react';
import { useAccount, useDisconnect, useChainId } from 'wagmi';
import { openConnectModal } from '@/lib/reownAppKit';
import { notificationService } from '@/services/notificationService';

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
  const prevChainId = useRef<number | undefined>(undefined);

  // Sync wagmi account state with our context
  useEffect(() => {
    if (wagmiIsConnected && wagmiAddress) {
      setAddress(wagmiAddress);
      setIsConnected(true);
      setChainId(wagmiChainId);

      // Notify on initial connect or network switch
      if (wagmiChainId !== prevChainId.current) {
        const isTestnet = [5, 11155111, 421614, 80002, 97, 43113].includes(wagmiChainId);
        notificationService.sendNotification({
          type: "NETWORK_DETECTED",
          chainId: wagmiChainId.toString(),
          message: isTestnet
            ? "⚠️ You are using TESTNET (no real funds)"
            : "🌐 Mainnet connection established"
        });
        prevChainId.current = wagmiChainId;
      }
    } else {
      setAddress(null);
      setIsConnected(false);
      setChainId(undefined);
      prevChainId.current = undefined;
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
