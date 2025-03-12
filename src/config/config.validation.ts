import { plainToClass } from "class-transformer";
import { IsString, IsNotEmpty, validateSync } from "class-validator";

class EnvironmentVariables {
  @IsString()
  @IsNotEmpty()
  "telegram.botToken": string;

  @IsString()
  @IsNotEmpty()
  ADMIN_IDS: string;

  @IsString()
  @IsNotEmpty()
  GITHUB_WEBHOOK_SECRET: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToClass(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    console.error("Configuration validation errors:", errors);
    throw new Error(errors.toString());
  }
  return validatedConfig;
}
