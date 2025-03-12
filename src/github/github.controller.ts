import { Controller, Post, Body, Headers } from "@nestjs/common";
import { GithubService } from "./github.service";
import { GithubWebhookPayload } from "./interfaces/github-webhook.interface";

@Controller("github")
export class GithubController {
  constructor(private readonly githubService: GithubService) {}

  @Post("webhook")
  async handleWebhook(
    @Headers("x-hub-signature-256") signature: string,
    @Body() payload: GithubWebhookPayload
  ) {
    return this.githubService.handleWebhook(payload, signature);
  }
}
