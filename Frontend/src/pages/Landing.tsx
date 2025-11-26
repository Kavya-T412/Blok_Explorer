import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Activity, Zap, RefreshCw, Bell, Shield, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const Landing = () => {
  const features = [
    {
      icon: Activity,
      title: 'Multi-Chain View',
      description: 'Monitor transactions across Ethereum, Polygon, BSC, and more in one unified dashboard.',
    },
    {
      icon: Zap,
      title: 'Gas Fee Estimator',
      description: 'Real-time gas fee predictions with historical data to optimize your transactions.',
    },
    {
      icon: RefreshCw,
      title: 'Cross-Chain Swap',
      description: 'Seamlessly swap tokens across different blockchain networks with best rates.',
    },
    {
      icon: Bell,
      title: 'Smart Notifications',
      description: 'Get instant alerts for transactions, gas spikes, and important blockchain events.',
    },
    {
      icon: Shield,
      title: 'Secure & Private',
      description: 'Your keys, your crypto. We never store your private keys or sensitive data.',
    },
    {
      icon: TrendingUp,
      title: 'Analytics Dashboard',
      description: 'Deep insights into blockchain metrics, trends, and network performance.',
    },
  ];

  return (
    <div className="min-h-screen">
      <Navbar />
      
      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-5xl md:text-7xl font-bold mb-6 gradient-text"
          >
            Unified Multi-Chain
            <br />
            Blockchain Explorer
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto"
          >
            Explore, monitor, and manage your crypto assets across multiple blockchain networks
            with a single, powerful interface.
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Button asChild size="lg" className="text-lg px-8 glow-border animate-glow-pulse">
              <NavLink to="/connect">Connect Wallet</NavLink>
            </Button>
            <Button asChild variant="outline" size="lg" className="text-lg px-8">
              <NavLink to="/dashboard">View Demo</NavLink>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold mb-4 gradient-text">Powerful Features</h2>
            <p className="text-xl text-muted-foreground">
              Everything you need to navigate the blockchain ecosystem
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <div className="glass-card-hover p-6 rounded-xl h-full">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-4 glow-border">
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="glass-card p-12 rounded-2xl text-center glow-border"
          >
            <h2 className="text-4xl font-bold mb-4 gradient-text">
              Ready to Get Started?
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Connect your wallet and start exploring the blockchain
            </p>
            <Button asChild size="lg" className="text-lg px-8">
              <NavLink to="/connect">Connect Wallet Now</NavLink>
            </Button>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Landing;
