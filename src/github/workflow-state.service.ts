import { Injectable } from "@nestjs/common";

interface WorkflowState {
  id: number;
  name: string;
  repository: string;
  branch: string;
  startedAt: Date;
}

@Injectable()
export class WorkflowStateService {
  private runningWorkflows = new Map<string, WorkflowState>();

  addWorkflow(workflow: WorkflowState): void {
    const key = this.getWorkflowKey(workflow.id, workflow.repository);
    this.runningWorkflows.set(key, workflow);
  }

  getWorkflow(id: number, repository: string): WorkflowState | undefined {
    const key = this.getWorkflowKey(id, repository);
    return this.runningWorkflows.get(key);
  }

  removeWorkflow(id: number, repository: string): void {
    const key = this.getWorkflowKey(id, repository);
    this.runningWorkflows.delete(key);
  }

  private getWorkflowKey(id: number, repository: string): string {
    return `${repository}:${id}`;
  }

  // Метод для очистки старых процессов (можно вызывать периодически)
  cleanupOldWorkflows(maxAgeMs: number = 24 * 60 * 60 * 1000): void {
    const now = new Date();
    for (const [key, workflow] of this.runningWorkflows.entries()) {
      if (now.getTime() - workflow.startedAt.getTime() > maxAgeMs) {
        this.runningWorkflows.delete(key);
      }
    }
  }
}
