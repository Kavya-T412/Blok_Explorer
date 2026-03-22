import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';

/**
 * Frontend Notification Service
 * Connects to the backend Socket.io server and listens for events.
 */

const SOCKET_URL = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:3001';

export interface Notification {
    id: string;
    type: 'success' | 'warning' | 'info' | 'error' | 'CONFIRMATION' | 'FAILED' | 'PRICE_ALERT' | 'NETWORK_DETECTED' | 'PENDING';
    title: string;
    message: string;
    time: string;
    timestamp: number;
    read: boolean;
    txHash?: string;
    token?: string;
    price?: number;
    currency?: string;
    chainId?: string;
    network?: string;
    blocks?: number;
    isTestnet?: boolean;
    walletAddress?: string;
}

class NotificationService {
    private socket: Socket | null = null;
    private listeners: ((notifications: Notification[]) => void)[] = [];
    private notifications: Notification[] = [];

    constructor() {
        this.loadHistory();
    }

    private loadHistory() {
        const saved = sessionStorage.getItem('notifications_history');
        if (saved) {
            try {
                this.notifications = JSON.parse(saved);
            } catch (e) {
                this.notifications = [];
            }
        }
    }

    private saveHistory() {
        sessionStorage.setItem('notifications_history', JSON.stringify(this.notifications.slice(0, 100)));
    }

    private setupSocket() {
        console.log('🔌 Connecting to notification server...');
        this.socket = io(SOCKET_URL);

        this.socket.on('connect', () => {
            console.log('✅ Connected to notification server');
            // Sync saved webhook on reconnect
            const savedWebhook = localStorage.getItem('personal_discord_webhook');
            if (savedWebhook) {
                this.socket?.emit('register_webhook', savedWebhook);
            }
        });

        this.socket.on('notification', (data: any) => {
            console.log('🔔 Notification received from server:', data);
            const newNotification: Notification = {
                id: Math.random().toString(36).substring(7), // Re-using original ID generation logic
                timestamp: Date.now(),
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), // Re-using original time format
                read: false,
                type: data.type || 'info',
                title: this.getTitleForType(data.type), // Re-using original title logic
                message: data.message || 'New update received',
                ...data
            };

            this.notifications = [newNotification, ...this.notifications];
            this.saveHistory();
            this.notifyListeners();
            this.showToast(newNotification);
        });

        this.socket.on('disconnect', () => {
            console.log('🔌 Disconnected from notification server');
        });

        this.socket.on('connect_error', (error) => {
            console.error('❌ Socket connection error:', error);
        });
    }

    /**
     * Initializes the socket connection and sets up listeners.
     */
    connect() {
        if (this.socket && this.socket.connected) return;
        this.setupSocket();
    }

    /**
     * Registers a personal Discord webhook for mobile push notifications.
     */
    public setDiscordWebhook(url: string | null) {
        if (url) {
            localStorage.setItem('personal_discord_webhook', url);
        } else {
            localStorage.removeItem('personal_discord_webhook');
        }

        if (this.socket?.connected) {
            this.socket.emit('register_webhook', url);
        }
    }

    public getDiscordWebhook(): string | null {
        return localStorage.getItem('personal_discord_webhook');
    }

    /**
     * Registers a Discord Webhook for a specific wallet address.
     */
    public async registerWebhookWithWallet(walletAddress: string, webhookUrl: string) {
        if (!walletAddress || !webhookUrl) return;

        try {
            const response = await fetch(`${SOCKET_URL}/api/save-webhook`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ walletAddress, webhookUrl })
            });

            const result = await response.json();
            if (result.success) {
                localStorage.setItem('personal_discord_webhook', webhookUrl);
                // Also trigger socket registration for the current session
                this.setDiscordWebhook(webhookUrl);
                return true;
            } else {
                throw new Error(result.error || 'Failed to save webhook');
            }
        } catch (error: any) {
            console.error('❌ Error saving user webhook:', error);
            throw error;
        }
    }

    /**
     * Adds a notification to the history and triggers local listeners.
     */
    addNotification(data: any, fromServer = false) {
        // If fromServer is true, it means the notification came from the socket.on('notification') handler,
        // which already processes and adds it. So, we only process local notifications here.
        if (fromServer) return;

        const id = Math.random().toString(36).substring(7);
        const timestamp = Date.now();
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const newNotification: Notification = {
            id,
            timestamp,
            time,
            read: false,
            type: data.type || 'info',
            title: this.getTitleForType(data.type),
            message: data.message || 'New update received',
            ...data
        };

        this.notifications = [newNotification, ...this.notifications].slice(0, 50);
        this.persist();
        this.notifyListeners();

        // Show toast by default for all local notifications
        this.showToast(newNotification);
    }

    private getTitleForType(type: string): string {
        switch (type) {
            case 'CONFIRMATION': return 'Transaction Confirmed';
            case 'FAILED': return 'Transaction Failed';
            case 'PRICE_ALERT': return 'Price Alert';
            case 'NETWORK_DETECTED': return 'Network Switched';
            case 'PENDING': return 'Transaction Pending';
            default: return 'Notification';
        }
    }

    private showToast(n: Notification) {
        let title = n.title;
        if (n.type === 'CONFIRMATION' && n.blocks) {
            title = `Confirmed (${n.blocks} blocks)`;
        }

        const desc = `${n.message}${n.txHash ? `: ${n.txHash.slice(0, 10)}...` : ''}`;
        switch (n.type) {
            case 'CONFIRMATION':
                toast.success(title, { description: desc });
                break;
            case 'FAILED':
                toast.error(n.title, { description: desc });
                break;
            case 'PRICE_ALERT':
                const symbol = n.currency === 'inr' ? '₹' : '$';
                toast.info(n.title, { description: `${n.message} (Current: ${symbol}${n.price})` });
                break;
            case 'NETWORK_DETECTED':
                if (n.isTestnet) {
                    toast.warning(n.title, { description: n.message });
                } else {
                    toast.success(n.title, { description: n.message });
                }
                break;
            default:
                toast(n.title, { description: n.message });
        }
    }

    private persist() {
        sessionStorage.setItem('real_notifications', JSON.stringify(this.notifications));
    }

    private notifyListeners() {
        this.listeners.forEach(l => l([...this.notifications]));
    }

    subscribe(callback: (notifications: Notification[]) => void) {
        this.listeners.push(callback);
        callback([...this.notifications]);
        return () => {
            this.listeners = this.listeners.filter(l => l !== callback);
        };
    }

    getNotifications() {
        return [...this.notifications];
    }

    markAsRead(id: string) {
        this.notifications = this.notifications.map(n => n.id === id ? { ...n, read: true } : n);
        this.persist();
        this.notifyListeners();
    }

    clearAll() {
        this.notifications = [];
        this.persist();
        this.notifyListeners();
    }

    /**
     * Sends a notification event to the backend to be broadcasted.
     */
    sendNotification(data: any) {
        if (this.socket && this.socket.connected) {
            this.socket.emit('client_notification', data);
        }
        // Also add locally immediately
        this.addNotification(data, false);
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }
}

export const notificationService = new NotificationService();
