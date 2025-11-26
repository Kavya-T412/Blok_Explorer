import { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings as SettingsIcon, Moon, Sun, Globe, Bell } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { NetworkModeToggle } from '@/components/NetworkModeToggle';

const Settings = () => {
  const [darkMode, setDarkMode] = useState(true);
  const [language, setLanguage] = useState('english');
  const [notifications, setNotifications] = useState(true);
  const { toast } = useToast();

  const handleSave = () => {
    toast({
      title: 'Settings Saved',
      description: 'Your preferences have been updated successfully',
    });
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      
      <div className="pt-24 pb-20 px-4">
        <div className="container mx-auto max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-4xl font-bold gradient-text mb-2">Settings</h1>
            <p className="text-muted-foreground">Customize your experience</p>
          </motion.div>

          <div className="space-y-6">
            {/* Network Mode */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="glass-card p-6 rounded-xl"
            >
              <h2 className="text-xl font-semibold mb-4">Network Configuration</h2>
              <NetworkModeToggle />
              <p className="text-xs text-muted-foreground mt-3">
                Switch between Mainnet (real funds) and Testnet (test funds) networks. 
                The page will reload after switching.
              </p>
            </motion.div>

            {/* Appearance */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-card p-6 rounded-xl"
            >
              <div className="flex items-center gap-3 mb-6">
                {darkMode ? <Moon className="w-5 h-5 text-primary" /> : <Sun className="w-5 h-5 text-primary" />}
                <h2 className="text-xl font-semibold">Appearance</h2>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium mb-1">Dark Mode</p>
                  <p className="text-sm text-muted-foreground">
                    Switch between light and dark theme
                  </p>
                </div>
                <Switch
                  checked={darkMode}
                  onCheckedChange={setDarkMode}
                />
              </div>
            </motion.div>

            {/* Language */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-card p-6 rounded-xl"
            >
              <div className="flex items-center gap-3 mb-6">
                <Globe className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold">Language</h2>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  Select Language
                </label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger className="glass-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass-card border-white/10">
                    <SelectItem value="english">English</SelectItem>
                    <SelectItem value="hindi">हिंदी (Hindi)</SelectItem>
                    <SelectItem value="tamil">தமிழ் (Tamil)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </motion.div>

            {/* Notifications */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="glass-card p-6 rounded-xl"
            >
              <div className="flex items-center gap-3 mb-6">
                <Bell className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold">Notifications</h2>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium mb-1">Enable Notifications</p>
                    <p className="text-sm text-muted-foreground">
                      Receive alerts for transactions and important events
                    </p>
                  </div>
                  <Switch
                    checked={notifications}
                    onCheckedChange={setNotifications}
                  />
                </div>
                
                {notifications && (
                  <div className="glass-card p-4 rounded-lg space-y-3 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Transaction alerts</span>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Gas fee spikes</span>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Swap updates</span>
                      <Switch defaultChecked />
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Save Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <button
                onClick={handleSave}
                className="w-full glass-card-hover p-4 rounded-xl font-semibold text-lg glow-border hover:bg-primary/10 transition-colors"
              >
                Save Changes
              </button>
            </motion.div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Settings;
