import { plainToClass } from "class-transformer";
import {
  IsString,
  IsNotEmpty,
  validateSync,
  IsArray,
  IsNumber,
  IsOptional,
  IsIn,
} from "class-validator";
import { Transform } from "class-transformer";

export class EnvironmentVariables {
  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10))
  @IsOptional()
  PORT: number = 3000;

  @IsString()
  @IsIn(["development", "production", "test"])
  @IsOptional()
  NODE_ENV: string = "development";

  @IsString()
  @IsNotEmpty()
  APP_URL: string;

  @IsString()
  @IsNotEmpty()
  DB_HOST: string;

  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10))
  @IsOptional()
  DB_PORT: number = 5432;

  @IsString()
  @IsNotEmpty()
  DB_USERNAME: string;

  @IsString()
  @IsNotEmpty()
  DB_PASSWORD: string;

  @IsString()
  @IsNotEmpty()
  DB_DATABASE: string;

  @IsString()
  @IsNotEmpty()
  TELEGRAM_BOT_TOKEN: string;

  @IsString()
  @IsNotEmpty()
  ADMIN_IDS: string;

  @IsString()
  @IsNotEmpty()
  GITHUB_WEBHOOK_SECRET: string;

  @IsString()
  @IsOptional()
  TELEGRAM_SUCCESS_EMOJI: string = "✅";

  @IsString()
  @IsOptional()
  TELEGRAM_ERROR_EMOJI: string = "❌";

  @IsString()
  @IsOptional()
  TELEGRAM_MESSAGE_TEMPLATE: string =
    "{emoji} GitHub Action '{action}' завершен {status}!\nRepository: {repository}\nBranch: {branch}";
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
