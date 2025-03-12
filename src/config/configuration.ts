interface RepositoryConfig {
  name: string;
  chatId: number;
  actions?: string[];
}

export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
  },
  github: {
    webhookSecret: process.env.GITHUB_WEBHOOK_SECRET,
  },
  repositories: JSON.parse(
    process.env.REPOSITORIES_CONFIG || "[]"
  ) as RepositoryConfig[],
});
