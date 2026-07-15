// import 'dotenv/config';
import { z } from 'zod';

export const envSchema = z
  .object({
    PORT: z
      .number()
      .int('PORT must be an integer')
      .positive('PORT must be a positive'),
    allowedOrigins: z
      .string()
      .min(1, { message: 'allowedOrigins is required' })
      .transform((val) => val.split(',').map((origin) => origin.trim())),
  })
  .loose();

type EnvType = z.infer<typeof envSchema>;

const envParsed = envSchema.safeParse(process.env);

if (!envParsed.success) {
  console.log(' config validations error:', z.treeifyError(envParsed.error));
  throw new Error('Invalid environment variables');
}

export const Envs: EnvType = {
  PORT: envParsed.data.PORT,
  allowedOrigins: envParsed.data.allowedOrigins,
  DATABASE_URL: process.env.DATABASE_URL || '',
  REDIS_URL: process.env.REDIS_URL || '',
  JWT_SECRET: process.env.JWT_SECRET || '',
}
