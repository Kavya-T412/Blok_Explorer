import { NavLink, useLocation } from 'react-router-dom';
import { Wallet, Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/contexts/WalletContext';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const { address, isConnected, disconnectWallet } = useWallet();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setIsOpen(false); }, [location.pathname]);

  const navItems = [
    { path: '/', label: 'Home' },
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/gas-estimator', label: 'Gas Estimator' },
    { path: '/swap', label: 'Swap' },
    { path: '/notifications', label: 'Notifications' },
    { path: '/settings', label: 'Settings' },
  ];

  return (
    <nav
      className="fixed top-0 w-full z-50 transition-all duration-500"
      style={{
        // Light pastel glass — white/lavender tones matching squid-card
        background: scrolled
          ? 'linear-gradient(135deg, rgba(255,255,255,0.72) 0%, rgba(237,233,254,0.78) 50%, rgba(224,231,255,0.72) 100%)'
          : 'linear-gradient(135deg, rgba(255,255,255,0.55) 0%, rgba(237,233,254,0.62) 50%, rgba(224,231,255,0.55) 100%)',
        backdropFilter: 'blur(20px) saturate(160%)',
        WebkitBackdropFilter: 'blur(20px) saturate(160%)',
        borderBottom: scrolled
          ? '1px solid rgba(139,92,246,0.20)'
          : '1px solid rgba(139,92,246,0.12)',
        // Soft pastel gloss — top specular highlight
        boxShadow: scrolled
          ? 'inset 0 1px 0 rgba(255,255,255,0.85), 0 4px 24px rgba(139,92,246,0.12)'
          : 'inset 0 1px 0 rgba(255,255,255,0.70), 0 2px 12px rgba(139,92,246,0.07)',
      }}
    >
      {/* Top gloss shimmer */}
      <div
        className="absolute top-0 left-0 right-0 h-px pointer-events-none"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.95) 35%, rgba(196,181,253,0.80) 60%, rgba(255,255,255,0.85) 80%, transparent 100%)',
        }}
      />

      {/* Bottom pastel glow */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px pointer-events-none"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(139,92,246,0.35) 30%, rgba(99,102,241,0.30) 60%, rgba(139,92,246,0.25) 85%, transparent 100%)',
          opacity: scrolled ? 1 : 0.6,
          transition: 'opacity 0.5s',
        }}
      />

      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">

          {/* Logo */}
          <NavLink to="/" className="flex items-center gap-2.5 group">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, hsl(262,60%,75%), hsl(220,90%,60%))',
                boxShadow: '0 2px 12px rgba(139,92,246,0.35), inset 0 1px 0 rgba(255,255,255,0.4)',
              }}
            >
              <Wallet className="w-5 h-5 text-white drop-shadow" />
            </div>
            <span
              className="text-lg font-extrabold tracking-tight"
              style={{
                background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 50%, #2563eb 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              ChainExplorer
            </span>
          </NavLink>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-0.5">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `relative px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${isActive
                    ? 'text-violet-700 dark:text-violet-300'
                    : 'text-slate-500 hover:text-violet-600'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span
                        className="absolute inset-0 rounded-lg pointer-events-none"
                        style={{
                          background: 'linear-gradient(135deg, rgba(139,92,246,0.12), rgba(99,102,241,0.10))',
                          border: '1px solid rgba(139,92,246,0.20)',
                          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.60)',
                        }}
                      />
                    )}
                    <span className="relative z-10">{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>

          {/* Wallet area */}
          <div className="hidden md:flex items-center gap-3">
            {isConnected && address ? (
              <div className="flex items-center gap-2">
                <div
                  className="px-3 py-1.5 rounded-xl text-sm font-mono text-violet-700"
                  style={{
                    background: 'rgba(139,92,246,0.08)',
                    border: '1px solid rgba(139,92,246,0.18)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.60)',
                  }}
                >
                  {address.slice(0, 6)}…{address.slice(-4)}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={disconnectWallet}
                  className="border-violet-200 text-violet-600 hover:bg-violet-50 hover:text-violet-700 hover:border-violet-300 transition-all"
                >
                  Disconnect
                </Button>
              </div>
            ) : (
              <Button
                asChild
                size="sm"
                className="rounded-xl font-semibold text-white"
                style={{
                  background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                  boxShadow: '0 2px 10px rgba(124,58,237,0.30), inset 0 1px 0 rgba(255,255,255,0.25)',
                }}
              >
                <NavLink to="/connect">Connect Wallet</NavLink>
              </Button>
            )}
          </div>

          {/* Mobile toggle */}
          <button
            className="md:hidden p-2 rounded-lg text-violet-500 hover:text-violet-700 hover:bg-violet-100/60 transition-all"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle menu"
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile drawer */}
        {isOpen && (
          <div className="md:hidden mt-3 pb-4 space-y-1 border-t border-violet-100 pt-3">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `block px-3 py-2 rounded-lg text-sm font-medium transition-all ${isActive
                    ? 'text-violet-700 bg-violet-50 border border-violet-200/60'
                    : 'text-slate-500 hover:text-violet-600 hover:bg-violet-50/60'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
            {!isConnected && (
              <NavLink to="/connect" className="block pt-2">
                <Button
                  className="w-full rounded-xl text-white font-semibold"
                  style={{
                    background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25)',
                  }}
                >
                  Connect Wallet
                </Button>
              </NavLink>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
