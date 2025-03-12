# GitHub Actions Telegram Notifier

A Telegram bot for GitHub Actions completion notifications.

## Features

- 🔔 Real-time notifications for GitHub Actions workflow completions
- 🔐 Secure webhook handling with signature validation
- 👥 Multi-repository support
- 🎯 Customizable notifications per repository
- 👮‍♂️ Admin-only access control

## Installation

1. Clone the repository

```bash
git clone https://github.com/yourusername/github-actions-notifier.git
cd github-actions-notifier
```

2. Install dependencies

```bash
npm install
```

3. Create `.env` file based on `.env.example`:

```env
# Server Configuration
PORT=3000

# Telegram Configuration
TELEGRAM_BOT_TOKEN=your_bot_token_here
ADMIN_IDS=[your_telegram_id]  # Array of admin IDs

# GitHub Configuration
GITHUB_WEBHOOK_SECRET=your_webhook_secret_here

# Message Templates (optional)
TELEGRAM_SUCCESS_EMOJI=✅
TELEGRAM_ERROR_EMOJI=❌
TELEGRAM_MESSAGE_TEMPLATE="{emoji} GitHub Action '{action}' completed {status}!\nRepository: {repository}\nBranch: {branch}"
```

## Bot Commands

- `/start` - Display available commands
- `/watch owner/repo` - Start watching a repository
- `/unwatch owner/repo` - Stop watching a repository
- `/list` - Show all watched repositories

## Usage Guide

1. **Bot Setup**:

   - Create a new bot with [@BotFather](https://t.me/BotFather)
   - Get your Telegram user ID (use [@userinfobot](https://t.me/userinfobot))
   - Add your ID to `ADMIN_IDS` in `.env`

2. **Start the Bot**:

```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

3. **Adding a Repository**:

   - Send `/watch owner/repository` to the bot
   - Follow the webhook setup instructions provided by the bot

4. **GitHub Webhook Setup**:
   - Go to your repository Settings → Webhooks
   - Click "Add webhook"
   - Set:
     - Payload URL: `https://your-domain/github/webhook`
     - Content type: `application/json`
     - Secret: (use the one provided by bot)
     - Events: Select "Workflow runs"

## Notification Format

A Telegram bot for GitHub Actions completion notifications.

## Setup

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Create `.env` file based on `.env.example` and fill in the required variables:

- `TELEGRAM_BOT_TOKEN` - your Telegram bot token (get from @BotFather)
- `TELEGRAM_CHAT_ID` - chat ID where notifications will be sent

## GitHub Webhook Setup

1. Go to your GitHub repository settings
2. Select "Webhooks" -> "Add webhook"
3. Specify your server URL: `https://your-domain.com/github/webhook`
4. Select content type: `application/json`
5. Select events: `Workflow runs`
6. Save webhook

## Running

```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

## Usage

After setting up the webhook, the bot will automatically send notifications to the specified Telegram chat when GitHub Actions complete.
