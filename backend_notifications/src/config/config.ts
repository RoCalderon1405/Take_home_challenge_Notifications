// import 'dotenv/config';
import { z } from 'zod';

export const envSchema = z
  .object({
    PORT: z
      .string()
      .min(1, { message: 'PORT is required' })
      .transform(Number),
    ALLOWED_ORIGINS: z
      .string()
      .min(1, { message: 'allowedOrigins is required' })
      .transform((val) => val.split(',').map((origin) => origin.trim())),
  })
  .loose();

type EnvType = z.infer<typeof envSchema>;

const envParsed = envSchema.safeParse(process.env);

console.log(process.env.ALLOWED_ORIGINS);


if (!envParsed.success) {
  console.log(' config validations error:', z.treeifyError(envParsed.error));
  throw new Error('Invalid environment variables');
}

export const Envs: EnvType = {
  PORT: envParsed.data.PORT,
  ALLOWED_ORIGINS: envParsed.data.ALLOWED_ORIGINS,
  DATABASE_URL: process.env.DATABASE_URL || '',
  REDIS_URL: process.env.REDIS_URL || '',
  JWT_SECRET: process.env.JWT_SECRET || '',
}
