const fetch = require('node-fetch');

/**
 * Sends a simple text notification to a Discord channel via Webhook.
 * @param {string} message - The content of the message to send.
 */
async function sendDiscordNotification(message) {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

    if (!webhookUrl || webhookUrl.includes('your_webhook_url_here')) {
        console.warn('⚠️ Discord Notification: Webhook URL is missing or placeholder.');
        return;
    }

    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                content: message,
            }),
        });

        if (response.ok) {
            console.log('🚀 Discord Notification Sent Successfully');
        } else {
            const errorText = await response.text();
            console.error(`❌ Discord Notification Failed (${response.status}):`, errorText);
        }
    } catch (error) {
        console.error('❌ Discord Notification Error:', error.message);
    }
}

module.exports = { sendDiscordNotification };
