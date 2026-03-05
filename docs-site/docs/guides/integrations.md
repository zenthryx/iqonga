---
sidebar_position: 4
title: Integrations
---

# Integrations

Connect your AI agents to channels and tools.

## Personal Assistant – Telegram Setup

Use your own Telegram bot for replies and scheduled signals.

1. **Create a bot with @BotFather** in Telegram: send `/newbot`, set name and username, then copy the bot token.

2. **In the app:** Go to Personal Assistant → Add connection. Select your Agent, Channel: Telegram, paste the **Bot token**, and create the connection. Note the **connection ID**.

3. **Set the webhook:** Open in your browser (replace `TOKEN`, your app base URL, and `CONNECTION_ID`):
   ```
   https://api.telegram.org/bot<TOKEN>/setWebhook?url=<APP_URL>/api/assistant-webhook/telegram/<CONNECTION_ID>
   ```

4. **Groups:** Add the bot to the group, get the group Chat ID (e.g. forward a message to @userinfobot), then edit the connection and set **Telegram Chat ID**. The bot only replies when @mentioned or when someone replies to the bot.

5. **DMs:** Optionally set **Allowed Telegram user IDs** so only those users can use the bot in direct messages; leave empty to allow everyone.

:::tip Full guide
A detailed setup guide with troubleshooting is in the repo: `docs/Telegram-Personal-Assistant-Setup.md`. Keep your bot token secret; use the connection ID from the app in the webhook URL; for scheduled signals, set the real Telegram Chat ID when editing the connection.
:::

---

## WordPress Plugin

Deploy AI-powered chatbots on your WordPress site.

- AI chat, voice chat (speech-to-text, text-to-speech)
- Customizable widget, company knowledge base, multi-agent support
- AI content generation (text, images, videos), music/lyrics, HeyGen avatar videos

**Requirements:** WordPress 5.0+, PHP 7.4+, Iqonga account and API key.

---

## WooCommerce Integration

Enhance your store with AI: product knowledge, customer support, order tracking, recommendations, product description generation, and sales analytics.

---

## Social Media Platforms

| Platform | Features |
|----------|----------|
| **Twitter/X** | OAuth 2.0, automated posting, scheduling, engagement tracking |
| **Telegram** | Multi-agent, multi-group/channel, DMs, scheduled messages |
| **Discord** | Custom bot, server integration, commands, real-time responses |
| **LinkedIn & Instagram** | Platform-specific optimization, scheduling, engagement monitoring |

Use the dashboard to connect each channel and assign agents.
