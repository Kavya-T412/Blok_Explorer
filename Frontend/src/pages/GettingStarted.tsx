import React from 'react';
import { motion } from 'framer-motion';
import { Wallet, ArrowRightLeft, Gauge, Bell, CheckCircle2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NavLink } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const GettingStarted = () => {
  const steps = [
    {
      title: "Connect Your Wallet",
      description: "Click the 'Connect Wallet' button at the top right. We support MetaMask, Coinbase Wallet, and hundreds of others via Reown AppKit. Ensure you're on a supported EVM network.",
      icon: <Wallet className="w-8 h-8 text-primary" />,
      action: "Connect Now",
      link: "/connect"
    },
    {
      title: "Swap or Bridge Tokens",
      description: "Navigate to the Swap page. Select your source and destination tokens. Our aggregator finds the best routes across multiple DEXs and bridges to ensure minimal slippage.",
      icon: <ArrowRightLeft className="w-8 h-8 text-primary" />,
      action: "Try Swapping",
      link: "/swap"
    },
    {
      title: "Monitor Gas Prices",
      description: "Use our real-time Gas Estimator to find the cheapest time to transact. We provide accurate fee predictions for Ethereum, Polygon, BSC, and more.",
      icon: <Gauge className="w-8 h-8 text-primary" />,
      action: "Check Gas",
      link: "/gas-estimator"
    },
    {
      title: "Set Up Notifications",
      description: "Don't miss a beat. Configure Discord or custom webhooks to get instant alerts for transaction confirmations or specific price movements.",
      icon: <Bell className="w-8 h-8 text-primary" />,
      action: "Configure Alerts",
      link: "/notifications"
    }
  ];

  return (
    <div className="min-h-screen">
      <Navbar />
      
      <div className="pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-16">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-6xl font-bold gradient-text mb-6"
            >
              Getting Started
            </motion.h1>
            <p className="text-xl text-muted-foreground">
              Follow these simple steps to master the Blok_Explorer platform.
            </p>
          </div>

          <div className="space-y-12">
            {steps.map((step, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="glass-card p-8 flex flex-col md:flex-row gap-8 items-center border-l-4 border-l-primary"
              >
                <div className="flex-shrink-0 p-4 bg-primary/10 rounded-2xl">
                  {step.icon}
                </div>
                <div className="flex-grow space-y-4 text-center md:text-left">
                  <div className="flex items-center justify-center md:justify-start gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white text-xs font-bold">
                      {index + 1}
                    </span>
                    <h2 className="text-2xl font-bold">{step.title}</h2>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                  <Button asChild variant="outline" className="group">
                    <NavLink to={step.link}>
                      {step.action} 
                      <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </NavLink>
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="mt-20 p-12 glass-card text-center bg-primary/5 border-primary/20"
          >
            <CheckCircle2 className="w-16 h-16 text-primary mx-auto mb-6" />
            <h2 className="text-3xl font-bold mb-4">You're All Set!</h2>
            <p className="text-lg text-muted-foreground mb-8">
              Dive into the dashboard and start managing your multi-chain assets with ease.
            </p>
            <Button asChild size="lg" className="px-12 rounded-full shadow-lg shadow-primary/20">
              <NavLink to="/dashboard">Go to Dashboard</NavLink>
            </Button>
          </motion.div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default GettingStarted;
