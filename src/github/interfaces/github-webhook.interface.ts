export interface GithubWebhookPayload {
  action: string;
  workflow_run: {
    head_branch: string;
    conclusion: string;
    created_at: string;
    updated_at: string;
    name: string;
    workflow_id: number;
  };
  repository: {
    full_name: string;
    name: string;
    owner: {
      login: string;
    };
  };
}
