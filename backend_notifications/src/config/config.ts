import { z } from 'zod';

export const envSchema = z
  .object({
    PORT: z.string().min(1, { message: 'PORT is required' }).transform(Number),

    ALLOWED_ORIGINS: z
      .string()
      .min(1, { message: 'ALLOWED_ORIGINS is required' })
      .transform((val) => val.split(',').map((origin) => origin.trim())),

    DATABASE_URL: z.string().min(1, { message: 'DATABASE_URL is required' }),

    REDIS_URL: z.string().min(1, { message: 'REDIS_URL is required' }),

    PASSWORD_PEPPER: z
      .string()
      .min(32, { message: 'PASSWORD_PEPPER is required' }),

    JWT_SECRET: z
      .string()
      .min(32, { message: 'JWT_SECRET must contain at least 32 characters' }),

    JWT_EXPIRES_IN_SECONDS: z
      .string()
      .transform(Number)
      .pipe(z.number().int().positive()),
  })

  .loose();

export type EnvType = z.infer<typeof envSchema>;

export const validateEnv = (config: Record<string, unknown>): EnvType => {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    console.error('Config validations error:', z.treeifyError(result.error));

    throw new Error('Invalid environment variables');
  }

  return result.data;
};
