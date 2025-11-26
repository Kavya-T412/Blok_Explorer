import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { WalletProvider } from "./contexts/WalletContext";
import Landing from "./pages/Landing";
import Connect from "./pages/Connect";
import Dashboard from "./pages/Dashboard";
import GasEstimator from "./pages/GasEstimator";
import Swap from "./pages/Swap";
import Notifications from "./pages/Notifications";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import { WagmiProvider } from 'wagmi';
import { wagmiAdapter } from './lib/reownAppKit';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <WalletProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/connect" element={<Connect />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/gas-estimator" element={<GasEstimator />} />
              <Route path="/swap" element={<Swap />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/settings" element={<Settings />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </WalletProvider>
    </WagmiProvider>
  </QueryClientProvider>
);

export default App;
