import { Button } from '@/components/ui/button';
import { useWallet } from '@/contexts/WalletContext';

interface ConnectButtonProps {
  className?: string;
}

const ConnectButton = ({ className }: ConnectButtonProps) => {
  const { connectWallet, disconnectWallet, isConnected, address } = useWallet();

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-3">
        <div className="glass-card px-4 py-2 rounded-lg text-sm font-mono">
          {address.slice(0, 6)}...{address.slice(-4)}
        </div>
        <Button variant="outline" size="sm" onClick={disconnectWallet} className={className}>
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <Button onClick={() => connectWallet()} className={className}>
      Connect Wallet
    </Button>
  );
};

export default ConnectButton;
