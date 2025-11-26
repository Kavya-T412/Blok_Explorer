import { NavLink } from 'react-router-dom';
import { Wallet, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/contexts/WalletContext';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { address, isConnected, disconnectWallet } = useWallet();

  const navItems = [
    { path: '/', label: 'Home' },
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/gas-estimator', label: 'Gas Estimator' },
    { path: '/swap', label: 'Swap' },
    { path: '/notifications', label: 'Notifications' },
    { path: '/settings', label: 'Settings' },
  ];

  return (
    <nav className="fixed top-0 w-full z-50 glass-card border-b border-white/10">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <NavLink to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center glow-border">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold gradient-text">ChainExplorer</span>
          </NavLink>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `text-sm font-medium transition-colors hover:text-primary ${
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-4">
            {isConnected && address ? (
              <div className="flex items-center gap-3">
                <div className="glass-card px-4 py-2 rounded-lg text-sm font-mono">
                  {address.slice(0, 6)}...{address.slice(-4)}
                </div>
                <Button variant="outline" size="sm" onClick={disconnectWallet}>
                  Disconnect
                </Button>
              </div>
            ) : (
              <Button asChild>
                <NavLink to="/connect">Connect Wallet</NavLink>
              </Button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-foreground"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X /> : <Menu />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden mt-4 pb-4 space-y-3 animate-fade-in">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={({ isActive }) =>
                  `block py-2 text-sm font-medium transition-colors ${
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
            {!isConnected && (
              <NavLink to="/connect" onClick={() => setIsOpen(false)}>
                <Button className="w-full">Connect Wallet</Button>
              </NavLink>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
