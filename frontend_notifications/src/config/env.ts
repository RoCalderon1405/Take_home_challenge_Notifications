import { z } from 'zod';

const envSchema = z.object({
  VITE_API_URL: z.string().url().default('http://localhost:3000/api'),
  VITE_AUTH_TRANSPORT: z.enum(['bearer', 'cookie']).default('bearer'),
  VITE_GOOGLE_OAUTH_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
});

const parsed = envSchema.safeParse(import.meta.env);

if (!parsed.success) {
  throw new Error(`Invalid frontend environment: ${parsed.error.message}`);
}

export const env = {
  apiUrl: parsed.data.VITE_API_URL.replace(/\/+$/, ''),
  authTransport: parsed.data.VITE_AUTH_TRANSPORT,
  googleOAuthEnabled: parsed.data.VITE_GOOGLE_OAUTH_ENABLED,
} as const;
