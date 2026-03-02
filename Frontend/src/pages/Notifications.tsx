import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bell, CheckCircle, AlertTriangle, Info, Trash2, Check, Clock, ShieldAlert, Settings, BellRing } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { notificationService, Notification } from '@/services/notificationService';
import { toast } from 'sonner';

const DiscordIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 11.751 11.751 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
  </svg>
);

import { useWallet } from '@/contexts/WalletContext';

const Notifications = () => {
  const { address, isConnected } = useWallet();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [discordWebhook, setDiscordWebhook] = useState(notificationService.getDiscordWebhook() || '');
  const [showSettings, setShowSettings] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Subscribe to real-time notification updates
    const unsubscribe = notificationService.subscribe((newNotifications) => {
      setNotifications(newNotifications);
    });

    return () => unsubscribe();
  }, []);

  const markAsRead = (id: string) => {
    notificationService.markAsRead(id);
  };

  const clearAll = () => {
    notificationService.clearAll();
  };

  const saveWebhook = async () => {
    if (!address) {
      toast.error('Wallet Not Connected', { description: 'Please connect your wallet to save a custom webhook.' });
      return;
    }

    if (!discordWebhook.startsWith('https://discord.com/api/webhooks/')) {
      toast.error('Invalid URL', { description: 'Please enter a valid Discord Webhook URL.' });
      return;
    }

    setIsSaving(true);
    try {
      await notificationService.registerWebhookWithWallet(address, discordWebhook);
      toast.success('Settings Saved', { description: 'Your mobile alerts are now linked to your wallet!' });
      setShowSettings(false);
    } catch (error: any) {
      toast.error('Failed to Save', { description: error.message || 'Something went wrong.' });
    } finally {
      setIsSaving(false);
    }
  };

  const testWebhook = () => {
    if (!discordWebhook) return toast.error('Enter a webhook URL first');
    notificationService.sendNotification({
      type: 'info',
      title: 'Discord Test',
      message: 'This is a test notification for your phone! 📱',
      walletAddress: address
    });
    toast.info('Test sent to Discord');
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
      case 'CONFIRMATION':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning':
      case 'PRICE_ALERT':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'error':
      case 'FAILED':
        return <ShieldAlert className="w-5 h-5 text-red-500" />;
      case 'PENDING':
        return <Clock className="w-5 h-5 text-blue-500 animate-pulse" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getTimeLabel = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="pt-24 pb-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold gradient-text mb-2">Notifications</h1>
                <p className="text-muted-foreground italic">
                  Manage your real-time alerts and mobile push settings
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSettings(!showSettings)}
                  className="rounded-xl border-squid-border"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAll}
                  disabled={notifications.length === 0}
                  className="rounded-xl border-squid-border"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear All
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Discord Settings Panel */}
          <AnimatePresence>
            {showSettings && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mb-8"
              >
                <div className="glass-card p-6 rounded-2xl border-squid-border bg-squid-primary/5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-[#5865F2]/10 flex items-center justify-center">
                      <DiscordIcon className="w-6 h-6 text-[#5865F2]" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">Personal Mobile Alerts</h3>
                      <p className="text-xs text-muted-foreground">Receive push notifications on your phone via Discord</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Discord Webhook URL</label>
                      <input
                        type="text"
                        value={discordWebhook}
                        onChange={(e) => setDiscordWebhook(e.target.value)}
                        placeholder="https://discord.com/api/webhooks/..."
                        className="w-full bg-background/50 border border-squid-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-squid-primary transition-all font-mono"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        className="bg-squid-primary hover:bg-squid-primary/90 text-white flex-1 rounded-xl"
                        onClick={saveWebhook}
                      >
                        Save Webhook
                      </Button>
                      <Button
                        variant="outline"
                        onClick={testWebhook}
                        className="rounded-xl border-squid-border"
                      >
                        Test
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-4">
            {notifications.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-12 rounded-2xl text-center border-squid-border"
              >
                <Bell className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-20" />
                <h3 className="text-xl font-semibold mb-2">No notifications</h3>
                <p className="text-muted-foreground">Real-time alerts will appear here as they happen.</p>
              </motion.div>
            ) : (
              notifications.map((notification, index) => (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`glass-card-hover p-6 rounded-2xl flex items-start gap-4 border transition-all ${!notification.read ? 'border-l-4 border-squid-primary' : 'border-squid-border'
                    }`}
                >
                  <div className="flex-shrink-0 mt-1">
                    {getIcon(notification.type)}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="font-bold text-lg">{notification.title}</h3>
                      {!notification.read && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="p-2 rounded-xl hover:bg-squid-primary/10 hover:text-squid-primary transition-colors border border-transparent hover:border-squid-primary/20"
                          title="Mark as read"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                      {notification.message}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-gray-100 dark:bg-white/5 px-2 py-1 rounded-md">
                        {getTimeLabel(notification.timestamp)}
                      </span>
                      {notification.blocks && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500 bg-blue-500/10 px-2 py-1 rounded-md">
                          {notification.blocks} Blocks Confirmed
                        </span>
                      )}
                      {notification.isTestnet && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded-md">
                          Testnet
                        </span>
                      )}
                      {notification.txHash && (
                        <span className="text-[10px] font-mono text-squid-primary truncate max-w-[150px] opacity-60">
                          {notification.txHash.slice(0, 20)}...
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Notifications;
