import { RepositoryConfig } from "./interfaces/repository.interface";

export default () => {
  console.log("Loading configuration...");
  console.log("REPOSITORIES_CONFIG env:", process.env.REPOSITORIES_CONFIG);

  let repositories: RepositoryConfig[] = [];
  try {
    repositories = process.env.REPOSITORIES_CONFIG
      ? JSON.parse(process.env.REPOSITORIES_CONFIG)
      : [];
    console.log("Parsed repositories:", repositories);
  } catch (error) {
    console.error("Error parsing REPOSITORIES_CONFIG:", error);
    repositories = [];
  }

  return {
    port: parseInt(process.env.PORT, 10) || 3000,
    telegram: {
      botToken: process.env.TELEGRAM_BOT_TOKEN,
    },
    github: {
      webhookSecret: process.env.GITHUB_WEBHOOK_SECRET,
    },
    repositories,
  };
};
