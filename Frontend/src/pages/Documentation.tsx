import React from 'react';
import { Book, Code, Layers, Zap, Terminal, Shield, Globe, Cpu } from 'lucide-react';
import { Link } from 'react-router-dom';

const Documentation = () => {
  return (
    <div className="min-h-screen pt-24 pb-12 px-4 font-iosevka">
      <div className="max-w-5xl mx-auto">
        <div className="mb-12 text-center">
          <h1 className="text-4xl md:text-6xl font-bold gradient-text mb-4">Documentation</h1>
          <p className="text-xl text-muted-foreground">Comprehensive guide to ExBlok features, architecture, and API.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1 border-r border-white/10 pr-6 hidden lg:block">
            <nav className="space-y-4 sticky top-24">
              <a href="#overview" className="block text-primary hover:translate-x-1 transition-transform">Overview</a>
              <a href="#features" className="block text-muted-foreground hover:text-primary transition-colors">Key Features</a>
              <a href="#api" className="block text-muted-foreground hover:text-primary transition-colors">API Reference</a>
              <a href="#tech-stack" className="block text-muted-foreground hover:text-primary transition-colors">Tech Stack</a>
              <Link to="/getting-started" className="block text-muted-foreground hover:text-primary transition-colors">Getting Started Guide</Link>
            </nav>
          </div>

          {/* Content Area */}
          <div className="lg:col-span-3 space-y-16">
            
            {/* Overview */}
            <section id="overview" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <Book className="text-primary w-8 h-8" />
                <h2 className="text-3xl font-bold">Project Overview</h2>
              </div>
              <div className="glass-card p-8 leading-relaxed space-y-4 text-muted-foreground">
                <p>
                  ExBlok is a powerful, multi-chain utility platform built for the modern Web3 ecosystem. 
                  It serves as an all-in-one explorer and toolset for users to navigate the complexities of decentralized finance (DeFi).
                </p>
                <p>
                  By aggregating liquidity and gas data from multiple sources, ExBlok provides a seamless experience for token swapping, 
                  cross-chain bridging, and network analysis.
                </p>
              </div>
            </section>

            {/* Key Features */}
            <section id="features" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <Zap className="text-primary w-8 h-8" />
                <h2 className="text-3xl font-bold">Key Features</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FeatureCard 
                  icon={<Layers className="w-6 h-6" />}
                  title="Multi-Chain Swap"
                  description="Optimize your swaps on a single chain or bridge assets across Ethereum, BSC, Polygon, and more using Rubic & Uniswap."
                />
                <FeatureCard 
                  icon={<Cpu className="w-6 h-6" />}
                  title="Gas Estimator"
                  description="Live gas price tracking across all major EVM networks to help you choose the most cost-effective time to transact."
                />
                <FeatureCard 
                  icon={<Globe className="w-6 h-6" />}
                  title="Portfolio Dashboard"
                  description="A unified view of your assets and transaction history across multiple blockchains, supporting both Mainnet and Testnet."
                />
                <FeatureCard 
                  icon={<Shield className="w-6 h-6" />}
                  title="Secure Webhooks"
                  description="Receive real-time notifications for transaction statuses and price alerts directly to your Discord or custom webhook endpoints."
                />
              </div>
            </section>

            {/* API Reference */}
            <section id="api" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <Terminal className="text-primary w-8 h-8" />
                <h2 className="text-3xl font-bold">API Reference</h2>
              </div>
              <div className="space-y-6">
                <ApiEndpoint 
                  method="GET"
                  path="/api/gas-prices"
                  description="Fetches real-time gas prices for all supported networks."
                />
                <ApiEndpoint 
                  method="GET"
                  path="/api/transactions/:address"
                  description="Returns a filtered transaction history for the specified wallet address."
                />
                <ApiEndpoint 
                  method="POST"
                  path="/api/rubic/quote-all"
                  description="Calculates available swap and bridge routes based on token input/output."
                />
                <ApiEndpoint 
                  method="POST"
                  path="/api/rubic/swap-data"
                  description="Generates the call data required to execute a swap on-chain."
                />
              </div>
            </section>

            {/* Tech Stack */}
            <section id="tech-stack" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <Code className="text-primary w-8 h-8" />
                <h2 className="text-3xl font-bold">Tech Stack</h2>
              </div>
              <div className="glass-card p-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                  <div><p className="font-bold text-primary">React 18</p><p className="text-xs text-muted-foreground italic">Frontend</p></div>
                  <div><p className="font-bold text-primary">Express</p><p className="text-xs text-muted-foreground italic">Backend</p></div>
                  <div><p className="font-bold text-primary">Socket.io</p><p className="text-xs text-muted-foreground italic">Real-time</p></div>
                  <div><p className="font-bold text-primary">Ethers.js</p><p className="text-xs text-muted-foreground italic">Blockchain</p></div>
                  <div><p className="font-bold text-primary">TypeScript</p><p className="text-xs text-muted-foreground italic">Logic</p></div>
                  <div><p className="font-bold text-primary">Tailwind</p><p className="text-xs text-muted-foreground italic">Styles</p></div>
                  <div><p className="font-bold text-primary">Wagmi</p><p className="text-xs text-muted-foreground italic">Web3</p></div>
                  <div><p className="font-bold text-primary">Vite</p><p className="text-xs text-muted-foreground italic">Build tool</p></div>
                </div>
              </div>
            </section>

          </div>
        </div>
      </div>
    </div>
  );
};

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
  <div className="glass-card p-6 h-full flex flex-col gap-4 hover:border-primary/50 transition-colors">
    <div className="p-3 bg-primary/10 rounded-xl w-fit text-primary">{icon}</div>
    <h3 className="text-xl font-bold">{title}</h3>
    <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
  </div>
);

const ApiEndpoint = ({ method, path, description }: { method: string, path: string, description: string }) => (
  <div className="glass-card p-4 flex flex-col md:flex-row md:items-center gap-4 border-l-4 border-l-primary">
    <div className="flex items-center gap-2 min-w-[200px]">
      <span className={`px-2 py-1 rounded text-xs font-bold ${method === 'GET' ? 'bg-green-500/20 text-green-500' : 'bg-blue-500/20 text-blue-500'}`}>
        {method}
      </span>
      <code className="text-sm font-bold text-foreground">{path}</code>
    </div>
    <p className="text-sm text-muted-foreground">{description}</p>
  </div>
);

export default Documentation;
