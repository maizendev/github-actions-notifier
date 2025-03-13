# GitHub Actions Notifier

Telegram bot for GitHub Actions notifications.

## Features

- 🔔 Real-time notifications for GitHub Actions workflow status
- 👥 Multi-user support - multiple users can monitor the same repository
- 🔐 Secure webhook handling with global secret
- ⚡ Instant notifications for workflow start and completion
- ⏱️ Execution time tracking for workflows
- 🎯 Filter notifications by specific actions (optional)

## Setup

### Prerequisites

- Node.js 18 or higher
- PostgreSQL database
- Telegram Bot Token (get from [@BotFather](https://t.me/BotFather))
- GitHub repository with Actions configured

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/github-actions-notifier.git
cd github-actions-notifier
```

2. Install dependencies:

```bash
npm install
```

3. Copy `.env.example` to `.env` and configure your environment:

```bash
cp .env.example .env
```

4. Configure your environment variables in `.env`:

```env
# Server Configuration
PORT=3000
NODE_ENV=production
APP_URL=https://your-domain.com

# Database Configuration
DB_HOST=your_db_host
DB_PORT=5432
DB_USERNAME=your_db_username
DB_PASSWORD=your_db_password
DB_DATABASE=your_db_name

# Telegram Configuration
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
OWNER=your_telegram_id # Telegram ID of the bot owner
ADMIN_IDS=[telegram_id1,telegram_id2] # Array of admin Telegram IDs

# GitHub Configuration
GITHUB_WEBHOOK_SECRET=your_github_webhook_secret

# Message Templates
TELEGRAM_SUCCESS_EMOJI=✅
TELEGRAM_ERROR_EMOJI=❌
TELEGRAM_MESSAGE_TEMPLATE="{emoji} GitHub Action '{action}' завершен {status}!\nRepository: {repository}\nBranch: {branch}"
```

5. Run database migrations:

```bash
npm run typeorm migration:run
```

6. Start the server:

```bash
npm run start:prod
```

### GitHub Repository Setup

1. Go to your GitHub repository settings
2. Navigate to Webhooks section
3. Add new webhook:
   - Payload URL: `https://your-domain.com/github/webhook`
   - Content type: `application/json`
   - Secret: Use the value from `GITHUB_WEBHOOK_SECRET`
   - Events: Select "Workflow runs"

## Usage

1. Start a chat with your bot on Telegram
2. Use `/start` to initialize
3. Use `/add owner/repo` to add a new repository to monitor
4. Use `/list` to see your monitored repositories
5. Use `/remove owner/repo` to stop monitoring a repository

## Admin Commands

- `/addadmin <telegram_id>` - Add a new administrator (Owner only)
- `/removeadmin <telegram_id>` - Remove an administrator (Owner only)
- `/userlist` - Show list of all users with their roles (Admin only)

## User Roles

- **Owner**: Has full access to all commands
- **Admin**: Can manage repositories
- **User**: Basic access

## Environment Variables

| Variable              | Description                  | Example                              |
| --------------------- | ---------------------------- | ------------------------------------ |
| PORT                  | Server port                  | 3000                                 |
| NODE_ENV              | Environment                  | production                           |
| APP_URL               | Your application URL         | https://your-domain.com              |
| DB_HOST               | Database host                | localhost                            |
| DB_PORT               | Database port                | 5432                                 |
| DB_USERNAME           | Database username            | postgres                             |
| DB_PASSWORD           | Database password            | your_password                        |
| DB_DATABASE           | Database name                | github_actions_notifier              |
| TELEGRAM_BOT_TOKEN    | Telegram Bot API token       | 123456789:ABCdefGHIjklMNOpqrsTUVwxyz |
| OWNER                 | Telegram ID of the bot owner | 123456789                            |
| ADMIN_IDS             | Admin Telegram IDs           | [123456789,987654321]                |
| GITHUB_WEBHOOK_SECRET | GitHub webhook secret        | your_secret                          |

## Message Templates

You can customize notification messages by modifying these variables:

```env
TELEGRAM_SUCCESS_EMOJI=✅
TELEGRAM_ERROR_EMOJI=❌
TELEGRAM_MESSAGE_TEMPLATE="{emoji} GitHub Action '{action}' завершен {status}!\nRepository: {repository}\nBranch: {branch}"
```

## Development

For development mode:

```bash
npm run start:dev
```

Running tests:

```bash
npm test
```

## License

MIT License - feel free to use and modify for your needs.

## Support

If you encounter any issues or have questions, please open an issue in the GitHub repository.
