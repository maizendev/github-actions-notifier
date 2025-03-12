export interface RepositoryConfig {
  name: string;
  repository?: string; // For backward compatibility
  chatId: number;
  actions: string[];
  addedAt: string;
  webhookSecret?: string;
}
