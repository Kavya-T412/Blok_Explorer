import { useState } from 'react';
import { Plus, Trash2, Edit2, Save, X, Network } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  CustomNetwork,
  getCustomNetworks,
  addCustomNetwork,
  removeCustomNetwork,
  updateCustomNetwork,
} from '@/types/customNetworks';

export const NetworkManager = () => {
  const [customNetworks, setCustomNetworks] = useState<CustomNetwork[]>(getCustomNetworks());
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    chainId: '',
    symbol: '',
    rpcUrl: '',
    fallbackRpcUrls: [] as string[],
    explorerUrl: '',
    decimals: '18',
    type: 'mainnet' as 'mainnet' | 'testnet',
    color: 'from-gray-500 to-gray-600',
    icon: '●',
  });

  const [newFallbackUrl, setNewFallbackUrl] = useState('');

  const resetForm = () => {
    setFormData({
      name: '',
      chainId: '',
      symbol: '',
      rpcUrl: '',
      fallbackRpcUrls: [],
      explorerUrl: '',
      decimals: '18',
      type: 'mainnet',
      color: 'from-gray-500 to-gray-600',
      icon: '●',
    });
    setNewFallbackUrl('');
    setIsAdding(false);
    setEditingId(null);
  };

  const handleAdd = () => {
    try {
      if (!formData.name || !formData.chainId || !formData.symbol || !formData.rpcUrl) {
        toast({
          title: 'Validation Error',
          description: 'Please fill in all required fields',
          variant: 'destructive',
        });
        return;
      }

      const chainId = parseInt(formData.chainId);
      if (isNaN(chainId) || chainId <= 0) {
        toast({
          title: 'Validation Error',
          description: 'Chain ID must be a valid positive number',
          variant: 'destructive',
        });
        return;
      }

      // Check for duplicate chain IDs
      const existingNetwork = customNetworks.find(n => n.chainId === chainId);
      if (existingNetwork) {
        toast({
          title: 'Duplicate Network',
          description: `A network with chain ID ${chainId} already exists`,
          variant: 'destructive',
        });
        return;
      }

      const newNetwork = addCustomNetwork({
        name: formData.name,
        chainId,
        symbol: formData.symbol,
        rpcUrl: formData.rpcUrl,
        fallbackRpcUrls: formData.fallbackRpcUrls.filter(url => url.trim() !== ''),
        explorerUrl: formData.explorerUrl || undefined,
        decimals: parseInt(formData.decimals) || 18,
        type: formData.type,
        color: formData.color,
        icon: formData.icon || '●',
      });

      setCustomNetworks([...customNetworks, newNetwork]);
      toast({
        title: 'Network Added',
        description: `${formData.name} has been added successfully`,
      });
      resetForm();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add network',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (network: CustomNetwork) => {
    setEditingId(network.id);
    setFormData({
      name: network.name,
      chainId: network.chainId.toString(),
      symbol: network.symbol,
      rpcUrl: network.rpcUrl,
      fallbackRpcUrls: network.fallbackRpcUrls || [],
      explorerUrl: network.explorerUrl || '',
      decimals: network.decimals.toString(),
      type: network.type,
      color: network.color,
      icon: network.icon || '●',
    });
  };

  const handleUpdate = () => {
    if (!editingId) return;

    try {
      if (!formData.name || !formData.chainId || !formData.symbol || !formData.rpcUrl) {
        toast({
          title: 'Validation Error',
          description: 'Please fill in all required fields',
          variant: 'destructive',
        });
        return;
      }

      updateCustomNetwork(editingId, {
        name: formData.name,
        chainId: parseInt(formData.chainId),
        symbol: formData.symbol,
        rpcUrl: formData.rpcUrl,
        fallbackRpcUrls: formData.fallbackRpcUrls.filter(url => url.trim() !== ''),
        explorerUrl: formData.explorerUrl || undefined,
        decimals: parseInt(formData.decimals) || 18,
        type: formData.type,
        color: formData.color,
        icon: formData.icon || '●',
      });

      setCustomNetworks(getCustomNetworks());
      toast({
        title: 'Network Updated',
        description: `${formData.name} has been updated successfully`,
      });
      resetForm();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update network',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = (id: string, name: string) => {
    try {
      removeCustomNetwork(id);
      setCustomNetworks(customNetworks.filter(n => n.id !== id));
      toast({
        title: 'Network Removed',
        description: `${name} has been removed successfully`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove network',
        variant: 'destructive',
      });
    }
  };

  const colorOptions = [
    { value: 'from-blue-500 to-purple-500', label: 'Blue-Purple' },
    { value: 'from-purple-500 to-pink-500', label: 'Purple-Pink' },
    { value: 'from-yellow-500 to-orange-500', label: 'Yellow-Orange' },
    { value: 'from-green-500 to-emerald-500', label: 'Green-Emerald' },
    { value: 'from-red-500 to-pink-500', label: 'Red-Pink' },
    { value: 'from-cyan-500 to-blue-500', label: 'Cyan-Blue' },
    { value: 'from-indigo-500 to-purple-500', label: 'Indigo-Purple' },
    { value: 'from-gray-500 to-gray-600', label: 'Gray' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Network className="w-5 h-5" />
            Custom Networks
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Add and manage custom blockchain networks
          </p>
        </div>
        {!isAdding && !editingId && (
          <Button onClick={() => setIsAdding(true)} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Network
          </Button>
        )}
      </div>

      {/* Add/Edit Form */}
      {(isAdding || editingId) && (
        <Card className="glass-card border-primary/20">
          <CardHeader>
            <CardTitle>{editingId ? 'Edit Network' : 'Add New Network'}</CardTitle>
            <CardDescription>
              {editingId ? 'Update network details' : 'Enter the details for your custom network'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Network Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., My Custom Chain"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="glass-card"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="chainId">Chain ID *</Label>
                <Input
                  id="chainId"
                  type="number"
                  placeholder="e.g., 1234"
                  value={formData.chainId}
                  onChange={(e) => setFormData({ ...formData, chainId: e.target.value })}
                  className="glass-card"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="symbol">Symbol *</Label>
                <Input
                  id="symbol"
                  placeholder="e.g., ETH"
                  value={formData.symbol}
                  onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
                  className="glass-card"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="decimals">Decimals</Label>
                <Input
                  id="decimals"
                  type="number"
                  placeholder="18"
                  value={formData.decimals}
                  onChange={(e) => setFormData({ ...formData, decimals: e.target.value })}
                  className="glass-card"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Network Type *</Label>
                <Select value={formData.type} onValueChange={(value: 'mainnet' | 'testnet') => setFormData({ ...formData, type: value })}>
                  <SelectTrigger className="glass-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mainnet">Mainnet</SelectItem>
                    <SelectItem value="testnet">Testnet</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="color">Color Theme</Label>
                <Select value={formData.color} onValueChange={(value) => setFormData({ ...formData, color: value })}>
                  <SelectTrigger className="glass-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {colorOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded bg-gradient-to-r ${option.value}`} />
                          {option.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="rpcUrl">RPC URL *</Label>
                <Input
                  id="rpcUrl"
                  placeholder="https://rpc.example.com"
                  value={formData.rpcUrl}
                  onChange={(e) => setFormData({ ...formData, rpcUrl: e.target.value })}
                  className="glass-card"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Fallback RPC URLs (Optional)</Label>
                <div className="space-y-2">
                  {formData.fallbackRpcUrls.map((url, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={url}
                        onChange={(e) => {
                          const newUrls = [...formData.fallbackRpcUrls];
                          newUrls[index] = e.target.value;
                          setFormData({ ...formData, fallbackRpcUrls: newUrls });
                        }}
                        placeholder="https://fallback-rpc.example.com"
                        className="glass-card flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const newUrls = formData.fallbackRpcUrls.filter((_, i) => i !== index);
                          setFormData({ ...formData, fallbackRpcUrls: newUrls });
                        }}
                        className="text-destructive hover:text-destructive"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Input
                      value={newFallbackUrl}
                      onChange={(e) => setNewFallbackUrl(e.target.value)}
                      placeholder="Add fallback RPC URL"
                      className="glass-card flex-1"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && newFallbackUrl.trim()) {
                          e.preventDefault();
                          setFormData({ 
                            ...formData, 
                            fallbackRpcUrls: [...formData.fallbackRpcUrls, newFallbackUrl.trim()] 
                          });
                          setNewFallbackUrl('');
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (newFallbackUrl.trim()) {
                          setFormData({ 
                            ...formData, 
                            fallbackRpcUrls: [...formData.fallbackRpcUrls, newFallbackUrl.trim()] 
                          });
                          setNewFallbackUrl('');
                        }
                      }}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Add backup RPC endpoints that will be used if the primary RPC fails
                  </p>
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="explorerUrl">Block Explorer URL (Optional)</Label>
                <Input
                  id="explorerUrl"
                  placeholder="https://explorer.example.com"
                  value={formData.explorerUrl}
                  onChange={(e) => setFormData({ ...formData, explorerUrl: e.target.value })}
                  className="glass-card"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="icon">Icon (Emoji or Symbol)</Label>
                <Input
                  id="icon"
                  placeholder="●"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  className="glass-card"
                  maxLength={2}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={editingId ? handleUpdate : handleAdd} className="flex-1">
                <Save className="w-4 h-4 mr-2" />
                {editingId ? 'Update' : 'Add'} Network
              </Button>
              <Button onClick={resetForm} variant="outline" className="flex-1">
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Networks List */}
      <div className="space-y-3">
        {customNetworks.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="py-8 text-center">
              <Network className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No custom networks added yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Click "Add Network" to get started
              </p>
            </CardContent>
          </Card>
        ) : (
          customNetworks.map((network) => (
            <Card key={network.id} className="glass-card hover:border-primary/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">{network.icon}</span>
                      <div>
                        <h4 className="font-semibold flex items-center gap-2">
                          {network.name}
                          <Badge variant="outline" className={`bg-gradient-to-r ${network.color} border-0 text-white`}>
                            {network.type}
                          </Badge>
                        </h4>
                        <p className="text-sm text-muted-foreground">Chain ID: {network.chainId}</p>
                      </div>
                    </div>
                    <div className="space-y-1 text-sm">
                      <p><span className="text-muted-foreground">Symbol:</span> {network.symbol}</p>
                      <p><span className="text-muted-foreground">RPC:</span> <span className="text-xs font-mono">{network.rpcUrl}</span></p>
                      {network.fallbackRpcUrls && network.fallbackRpcUrls.length > 0 && (
                        <p><span className="text-muted-foreground">Fallback RPCs:</span> {network.fallbackRpcUrls.length} endpoint{network.fallbackRpcUrls.length !== 1 ? 's' : ''}</p>
                      )}
                      {network.explorerUrl && (
                        <p><span className="text-muted-foreground">Explorer:</span> <span className="text-xs font-mono">{network.explorerUrl}</span></p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleEdit(network)}
                      variant="ghost"
                      size="sm"
                      disabled={isAdding || !!editingId}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => handleDelete(network.id, network.name)}
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      disabled={isAdding || !!editingId}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
