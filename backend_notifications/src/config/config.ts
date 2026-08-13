import dotenv from 'dotenv';
import { resolve } from 'node:path';
import { z } from 'zod';

dotenv.config({
  path: resolve(process.cwd(), '../.env'),
});

// Después defines y ejecutas el esquema.
export const envSchema = z
  .object({
    PORT: z
      .string()
      .min(1, { message: 'PORT is required' })
      .transform(Number),
    ALLOWED_ORIGINS: z
      .string()
      .min(1, { message: 'ALLOWED_ORIGINS is required' })
      .transform((val) => val.split(',').map((origin) => origin.trim())),
    DATABASE_URL: z.string().min(1, { message: 'DATABASE_URL is required' }),
    REDIS_URL: z.string().min(1, { message: 'REDIS_URL is required' }),
    PASSWORD_PEPPER: z.string().min(32, { message: 'PASSWORD_PEPPER is required' }),
  })
  .loose();

type EnvType = z.infer<typeof envSchema>;

const envParsed = envSchema.safeParse(process.env);


if (!envParsed.success) {
  console.log('Config validations error:', z.treeifyError(envParsed.error));
  throw new Error('Invalid environment variables');
}

export const Envs: EnvType = {
  PORT: envParsed.data.PORT,
  ALLOWED_ORIGINS: envParsed.data.ALLOWED_ORIGINS,
  DATABASE_URL: process.env.DATABASE_URL || '',
  REDIS_URL: process.env.REDIS_URL || '',
  PASSWORD_PEPPER: process.env.PASSWORD_PEPPER || '',
}
