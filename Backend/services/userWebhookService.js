const fetch = require('node-fetch');

// In-memory storage for user specific webhooks
const userWebhooks = {};

/**
 * Validates a Discord Webhook URL.
 * @param {string} url - The URL to validate.
 * @returns {boolean}
 */
const isValidDiscordWebhook = (url) => {
    return url && typeof url === 'string' && url.startsWith('https://discord.com/api/webhooks/');
};

/**
 * Saves a webhook for a specific wallet address.
 * @param {string} walletAddress - The user's wallet address.
 * @param {string} webhookUrl - The Discord Webhook URL.
 */
function saveUserWebhook(walletAddress, webhookUrl) {
    if (!walletAddress || !isValidDiscordWebhook(webhookUrl)) {
        throw new Error('Invalid wallet address or Discord Webhook URL');
    }
    userWebhooks[walletAddress.toLowerCase()] = webhookUrl;
    console.log(`✅ Webhook registered for wallet: ${walletAddress}`);
}

/**
 * Sends a notification to a specific user's Discord webhook.
 * @param {string} walletAddress - The wallet address to look up.
 * @param {string} message - The message content.
 */
async function sendUserDiscordNotification(walletAddress, message) {
    if (!walletAddress) return;

    const webhookUrl = userWebhooks[walletAddress.toLowerCase()];
    if (!webhookUrl) {
        // Return silently if no webhook is registered for this user
        return;
    }

    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: message })
        });

        if (response.ok) {
            console.log(`🚀 Personal Discord Notification sent to ${walletAddress}`);
        } else {
            console.error(`❌ Personal Discord Notification Failed for ${walletAddress}: ${response.status}`);
        }
    } catch (error) {
        console.error(`❌ Personal Discord Notification Error for ${walletAddress}:`, error.message);
    }
}

module.exports = {
    saveUserWebhook,
    sendUserDiscordNotification
};
