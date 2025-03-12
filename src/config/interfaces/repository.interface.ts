export interface RepositoryConfig {
  name: string;
  repository?: string; // For backward compatibility
  chatId: string;
  actions: string[];
  addedAt: string;
  webhookSecret?: string;
}
