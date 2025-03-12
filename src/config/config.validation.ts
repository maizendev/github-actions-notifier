import { plainToClass } from "class-transformer";
import { IsString, IsNotEmpty, validateSync, IsArray } from "class-validator";

export class EnvironmentVariables {
  @IsString()
  @IsNotEmpty()
  TELEGRAM_BOT_TOKEN: string;

  @IsString()
  @IsNotEmpty()
  ADMIN_IDS: string;

  @IsString()
  @IsNotEmpty()
  GITHUB_WEBHOOK_SECRET: string;
}

export function validate(config: Record<string, unknown>) {
  console.log("Config before validation:", config);

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

  console.log("Validated config:", validatedConfig);
  return validatedConfig;
}
