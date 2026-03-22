/**
 * Real-time Notification Backend Service
 * 
 * Features:
 * - Modular design (Socket.io instance accepted from outside)
 * - Transaction tracking (using ethers provider)
 * - Price alerts (polling CoinGecko API)
 * - Network detection
 * - Non-breaking integration
 * 
 * IMPORTANT: No database usage. Real-time emitters only.
 */

let ioInstance = null;
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || null;
const socketWebhookMap = new Map(); // Store per-user webhooks: socketId -> webhookUrl
const { sendUserDiscordNotification } = require('./userWebhookService');

/**
 * Initializes the Socket.io instance and sets up basic connection logging.
 * @param {object} io - The Socket.io server instance.
 */
function initSocket(io) {
    ioInstance = io;
    console.log('🔔 Notification System: Socket.io initialized');

    io.on('connection', (socket) => {
        console.log(`🔌 Client connected: ${socket.id}`);

        // Register personal discord webhook for this session
        socket.on('register_webhook', (webhookUrl) => {
            if (webhookUrl && webhookUrl.startsWith('https://discord.com/api/webhooks/')) {
                socketWebhookMap.set(socket.id, webhookUrl);
                console.log(`📡 Registered personal webhook for client: ${socket.id}`);
            } else {
                socketWebhookMap.delete(socket.id);
            }
        });

        // Listen for notifications sent from the client (e.g. swap errors)
        socket.on('client_notification', (data) => {
            console.log('📡 Client-side notification received, broadcasting:', data.type);

            // Send to current client's personal webhook if available
            const personalWebhook = socketWebhookMap.get(socket.id);
            if (personalWebhook) {
                sendDiscordMessage(data, personalWebhook);
                
                // Also ensures it's in the walletAddress -> webhook map for future backend alerts (like confirmation tracking)
                if (data.walletAddress) {
                    try {
                        require('./userWebhookService').saveUserWebhook(data.walletAddress, personalWebhook);
                    } catch (e) {}
                }
            }

            // Broadcast to all other clients
            socket.broadcast.emit('notification', data);

            // Mirror critical client errors to Discord (Global)
            if (data.type === 'FAILED') {
                sendDiscordMessage(data);
            }
        });

        socket.on('disconnect', () => {
            console.log(`🔌 Client disconnected: ${socket.id}`);
            socketWebhookMap.delete(socket.id); // Clean up
        });
    });
}

/**
 * Sends a message to a Discord channel via Webhook for mobile alerts.
 * @param {object} data - The notification data.
 * @param {string} customWebhook - Optional personal webhook URL.
 */
async function sendDiscordMessage(data, customWebhook = null) {
    let url = customWebhook || DISCORD_WEBHOOK_URL;

    // Validate the URL exists and is not a placeholder
    if (!url || url.includes('your_webhook_url_here')) {
        console.warn('⚠️ Discord alert skipped: Webhook URL is missing or still a placeholder.');
        return;
    }

    try {
        const fetch = require('node-fetch');
        const color = data.type === 'CONFIRMATION' ? 0x00ff00 : (data.type === 'FAILED' ? 0xff0000 : 0x0099ff);

        const embed = {
            title: data.title || `Notification: ${data.type || 'Alert'}`,
            description: data.message || 'No details provided.',
            color: color,
            fields: [],
            footer: customWebhook ? { text: 'Personal Alert' } : { text: 'Global Alert' },
            timestamp: new Date().toISOString()
        };

        if (data.txHash) {
            embed.fields.push({ name: 'Transaction Hash', value: `\`${data.txHash}\`` });
        }
        if (data.blocks) {
            embed.fields.push({ name: 'Confirmations', value: `${data.blocks} blocks`, inline: true });
        }
        if (data.price) {
            const symbol = data.currency === 'inr' ? '₹' : '$';
            embed.fields.push({ name: 'Price', value: `${symbol}${data.price}`, inline: true });
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: "@everyone", // Triggers mobile push
                embeds: [embed]
            })
        });

        if (response.ok) {
            console.log(`📱 Discord mobile alert sent to ${customWebhook ? 'Personal' : 'Global'} channel`);
        } else {
            const errBody = await response.text();
            console.error(`❌ Discord webhook returned error (${response.status}):`, errBody);
        }
    } catch (error) {
        console.error('❌ Discord webhook request failed:', error.message);
    }
}

/**
 * Emits a notification event and mirrors to Discord.
 * @param {object} data - The notification data.
 */
function sendNotification(data) {
    if (ioInstance) {
        ioInstance.emit('notification', data);
        console.log('✅ Notification emitted:', data.type || 'GENERIC');

        // Mirror to Discord for global notifications
        sendDiscordMessage(data);

        // Mirror to User-Specific Discord if walletAddress is provided
        if (data.walletAddress) {
            const personalMessage = `🔔 **${data.title || data.type}**: ${data.message}`;
            sendUserDiscordNotification(data.walletAddress, personalMessage);
        }

        // Also send to all personal webhooks for "public" alerts
        const publicTypes = ['PRICE_ALERT', 'NETWORK_DETECTED'];
        if (publicTypes.includes(data.type)) {
            for (const webhook of socketWebhookMap.values()) {
                sendDiscordMessage(data, webhook);
            }
        }
    } else {
        console.warn('⚠️ Socket.io instance not initialized. Cannot send notification.');
    }
}

/**
 * Tracks multi-block confirmations for a transaction.
 * @param {object} provider - Ethers provider instance.
 * @param {string} txHash - Transaction hash.
 * @param {string} walletAddress - User's wallet address for personal alerts.
 * @param {number} targetBlocks - Number of blocks to wait (e.g., 12).
 */
async function trackConfirmations(provider, txHash, walletAddress = null, targetBlocks = 12) {
    try {
        console.log(`🔍 Tracking confirmations for: ${txHash}`);

        // Initial confirmation
        const receipt = await provider.waitForTransaction(txHash, 1);
        sendNotification({
            type: "CONFIRMATION",
            message: `Transaction confirmed with 1 block`,
            txHash,
            blocks: 1,
            walletAddress
        });

        // Track up to targetBlocks
        const checkPoints = [6, 12].filter(b => b <= targetBlocks);
        for (const blocks of checkPoints) {
            await provider.waitForTransaction(txHash, blocks);
            sendNotification({
                type: "CONFIRMATION",
                message: `Transaction confirmed with ${blocks} blocks`,
                txHash,
                blocks: blocks,
                walletAddress
            });
        }
    } catch (error) {
        console.error(`❌ Confirmation tracking failed: ${txHash}`, error);
    }
}

/**
 * Tracks a transaction status and emits result.
 * @param {object} provider - Ethers provider instance.
 * @param {string} txHash - Transaction hash to track.
 * @param {string} walletAddress - User's wallet address.
 */
async function trackTransaction(provider, txHash, walletAddress = null) {
    try {
        await trackConfirmations(provider, txHash, walletAddress, 12);
    } catch (error) {
        console.error(`❌ Transaction tracking failed: ${txHash}`, error);
        sendNotification({
            type: "FAILED",
            message: error.reason || "Transaction failed",
            txHash,
            walletAddress
        });
    }
}

/**
 * Monitors token price and emits alerts.
 * @param {string} token - Token id for CoinGecko.
 * @param {number} threshold - Price threshold.
 * @param {string} currency - 'usd' or 'inr'.
 */
function monitorPrice(token, threshold, currency = 'usd') {
    const symbol = currency === 'inr' ? '₹' : '$';
    console.log(`📈 Monitoring price for ${token} (Threshold: ${symbol}${threshold})`);

    const poll = async () => {
        try {
            const fetch = require('node-fetch');
            const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${token}&vs_currencies=${currency}`);
            const data = await response.json();

            const currentPrice = data[token]?.[currency];
            if (currentPrice && currentPrice > threshold) {
                sendNotification({
                    type: "PRICE_ALERT",
                    token,
                    price: currentPrice,
                    currency,
                    threshold,
                    message: `${token.toUpperCase()} crossed ${symbol}${threshold.toLocaleString()}`
                });
            }
        } catch (error) {
            console.error('❌ Price monitoring error:', error.message);
        }
    };

    const intervalId = setInterval(poll, 30000);
    poll();

    return intervalId;
}

/**
 * Detects network and emits current network info with classification.
 * @param {object} provider - Ethers provider instance.
 */
async function detectNetwork(provider) {
    try {
        const network = await provider.getNetwork();
        const chainId = Number(network.chainId);
        const isTestnet = [5, 11155111, 421614, 80002, 97, 43113].includes(chainId);

        sendNotification({
            type: "NETWORK_DETECTED",
            network: network.name,
            chainId: chainId.toString(),
            message: isTestnet ? `Warning: You are using TESTNET (no real funds)` : `Mainnet transaction completed`,
            isTestnet
        });
    } catch (error) {
        console.error('❌ Network detection error:', error.message);
    }
}

module.exports = {
    initSocket,
    sendNotification,
    trackTransaction,
    monitorPrice,
    detectNetwork
};
