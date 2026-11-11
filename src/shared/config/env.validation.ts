import { plainToInstance } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

const DEFAULT_PORT = 3000;
const MAX_PORT = 65535;
const DEFAULT_JWT_EXPIRES_IN = '15m';
const DEFAULT_REFRESH_TOKEN_TTL_DAYS = 7;
const MIN_JWT_SECRET_LENGTH = 32;
// A positive number with a unit (e.g. 900s, 15m, 1h, 7d); jsonwebtoken reads a unit-less string as milliseconds.
const JWT_EXPIRES_IN_FORMAT = /^[1-9]\d*(ms|s|m|h|d)$/;

export class EnvironmentVariables {
  @IsInt()
  @Min(1)
  @Max(MAX_PORT)
  PORT: number = DEFAULT_PORT;

  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  @IsString()
  @MinLength(MIN_JWT_SECRET_LENGTH)
  JWT_SECRET!: string;

  @IsString()
  @Matches(JWT_EXPIRES_IN_FORMAT)
  JWT_EXPIRES_IN: string = DEFAULT_JWT_EXPIRES_IN;

  @IsString()
  @IsNotEmpty()
  JWT_ISSUER!: string;

  @IsString()
  @IsNotEmpty()
  JWT_AUDIENCE!: string;

  @IsInt()
  @Min(1)
  REFRESH_TOKEN_TTL_DAYS: number = DEFAULT_REFRESH_TOKEN_TTL_DAYS;
}

// Messages name the variable and the rule, never the value, so secrets stay out of logs.
export const validateEnvironment = (
  rawEnvironment: Record<string, unknown>,
): EnvironmentVariables => {
  const environment = plainToInstance(EnvironmentVariables, rawEnvironment, {
    enableImplicitConversion: true,
    exposeDefaultValues: true,
  });
  const validationErrors = validateSync(environment);

  if (validationErrors.length > 0) {
    const problems = validationErrors
      .flatMap((validationError) =>
        Object.values(validationError.constraints ?? {}),
      )
      .join('; ');
    throw new Error(`Invalid environment variables: ${problems}`);
  }

  return environment;
};
