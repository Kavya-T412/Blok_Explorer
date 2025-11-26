import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Network } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const NetworkModeToggle = () => {
  const [isTestnet, setIsTestnet] = useState(() => {
    // Check localStorage first, then env variable, default to false (mainnet)
    const stored = localStorage.getItem('useTestnet');
    if (stored !== null) {
      return stored === 'true';
    }
    const envTestnet = import.meta.env.VITE_USE_TESTNET === 'true';
    // Set initial value in localStorage
    localStorage.setItem('useTestnet', envTestnet.toString());
    return envTestnet;
  });

  const handleToggle = (checked: boolean) => {
    setIsTestnet(checked);
    localStorage.setItem('useTestnet', checked.toString());
    
    // Show reload prompt
    if (window.confirm(
      `Switch to ${checked ? 'Testnet' : 'Mainnet'} mode?\n\nThe page will reload to apply changes.`
    )) {
      window.location.reload();
    }
  };

  useEffect(() => {
    // Ensure localStorage is set on mount
    const stored = localStorage.getItem('useTestnet');
    if (stored === null) {
      localStorage.setItem('useTestnet', isTestnet.toString());
    }
  }, []);

  return (
    <div className="flex items-center gap-4 p-4 glass-card rounded-lg">
      <Network className="w-5 h-5 text-primary" />
      <div className="flex-1">
        <Label htmlFor="network-mode" className="text-sm font-medium">
          Network Mode
        </Label>
        <p className="text-xs text-muted-foreground">
          {isTestnet ? 'Using Testnet (Sepolia, Amoy, BSC Testnet)' : 'Using Mainnet (Ethereum, Polygon, BSC)'}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={isTestnet ? 'secondary' : 'default'}>
          {isTestnet ? 'Testnet' : 'Mainnet'}
        </Badge>
        <Switch
          id="network-mode"
          checked={isTestnet}
          onCheckedChange={handleToggle}
        />
      </div>
    </div>
  );
};

export const NetworkModeIndicator = () => {
  const [isTestnet] = useState(() => {
    return localStorage.getItem('useTestnet') === 'true' || import.meta.env.VITE_USE_TESTNET === 'true';
  });

  if (!isTestnet) return null;

  return (
    <Alert variant="default" className="border-yellow-500/50 bg-yellow-500/10">
      <AlertCircle className="h-4 w-4 text-yellow-500" />
      <AlertDescription className="text-yellow-500">
        <strong>Testnet Mode Active:</strong> You are connected to test networks. 
        No real funds are involved.
      </AlertDescription>
    </Alert>
  );
};
