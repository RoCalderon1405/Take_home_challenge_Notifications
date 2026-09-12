import { z } from 'zod';

const providerCredential = (message: string) =>
  z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.string().min(1, { message }).optional(),
  );

export const envSchema = z
  .object({
    PORT: z
      .string()
      .min(1, {
        message: 'PORT is required',
      })
      .transform(Number),

    ALLOWED_ORIGINS: z
      .string()
      .min(1, {
        message: 'ALLOWED_ORIGINS is required',
      })
      .transform((val) => val.split(',').map((origin) => origin.trim())),

    DATABASE_URL: z.string().min(1, {
      message: 'DATABASE_URL is required',
    }),

    REDIS_URL: z.string().min(1, {
      message: 'REDIS_URL is required',
    }),

    PASSWORD_PEPPER: z.string().min(32, {
      message: 'PASSWORD_PEPPER is required',
    }),

    JWT_SECRET: z.string().min(32, {
      message: 'JWT_SECRET must contain at least 32 characters',
    }),

    JWT_EXPIRES_IN_SECONDS: z
      .string()
      .transform(Number)
      .pipe(z.number().int().positive()),

    GOOGLE_OAUTH_ENABLED: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),

    GOOGLE_CLIENT_ID: providerCredential('GOOGLE_CLIENT_ID is required'),

    GOOGLE_CLIENT_SECRET: providerCredential(
      'GOOGLE_CLIENT_SECRET is required',
    ),

    GOOGLE_CALLBACK_URL: z.preprocess(
      (value) => (value === '' ? undefined : value),
      z
        .string()
        .url({ message: 'GOOGLE_CALLBACK_URL must be a valid URL' })
        .optional(),
    ),

    EMAIL_PROVIDER: z
      .enum(['console', 'development', 'resend'])
      .default('console')
      .transform((provider) =>
        provider === 'development' ? 'console' : provider,
      ),

    RESEND_API_KEY: providerCredential('RESEND_API_KEY is required'),

    EMAIL_FROM: providerCredential('EMAIL_FROM is required'),

    RESEND_WEBHOOK_SECRET: providerCredential(
      'RESEND_WEBHOOK_SECRET must not be empty',
    ),

    SMS_PROVIDER: z.enum(['console', 'twilio']).default('console'),

    TWILIO_ACCOUNT_SID: providerCredential('TWILIO_ACCOUNT_SID is required'),

    TWILIO_API_KEY_SID: providerCredential('TWILIO_API_KEY_SID is required'),

    TWILIO_API_KEY_SECRET: providerCredential(
      'TWILIO_API_KEY_SECRET is required',
    ),

    TWILIO_FROM_NUMBER: providerCredential('TWILIO_FROM_NUMBER is required'),

    TWILIO_AUTH_TOKEN: providerCredential(
      'TWILIO_AUTH_TOKEN must not be empty',
    ),

    PUBLIC_API_BASE_URL: z.preprocess(
      (value) => (value === '' ? undefined : value),
      z
        .string()
        .url({ message: 'PUBLIC_API_BASE_URL must be a valid URL' })
        .transform((value) => value.replace(/\/+$/, ''))
        .optional(),
    ),

    PUSH_PROVIDER: z.enum(['console', 'firebase']).default('console'),

    FIREBASE_PROJECT_ID: providerCredential('FIREBASE_PROJECT_ID is required'),

    FIREBASE_CLIENT_EMAIL: providerCredential(
      'FIREBASE_CLIENT_EMAIL is required',
    ),

    FIREBASE_PRIVATE_KEY: providerCredential(
      'FIREBASE_PRIVATE_KEY is required',
    ),
  })
  .loose()
  .superRefine((config, ctx) => {
    if (config.GOOGLE_OAUTH_ENABLED) {
      addRequiredIssue(
        ctx,
        config.GOOGLE_CLIENT_ID,
        'GOOGLE_CLIENT_ID',
        'google oauth',
      );

      addRequiredIssue(
        ctx,
        config.GOOGLE_CLIENT_SECRET,
        'GOOGLE_CLIENT_SECRET',
        'google oauth',
      );

      addRequiredIssue(
        ctx,
        config.GOOGLE_CALLBACK_URL,
        'GOOGLE_CALLBACK_URL',
        'google oauth',
      );
    }

    if (config.EMAIL_PROVIDER === 'resend') {
      addRequiredIssue(ctx, config.RESEND_API_KEY, 'RESEND_API_KEY', 'resend');

      addRequiredIssue(ctx, config.EMAIL_FROM, 'EMAIL_FROM', 'resend');

      addRequiredIssue(
        ctx,
        config.RESEND_WEBHOOK_SECRET,
        'RESEND_WEBHOOK_SECRET',
        'resend',
      );
    }

    if (config.SMS_PROVIDER === 'twilio') {
      addRequiredIssue(
        ctx,
        config.TWILIO_ACCOUNT_SID,
        'TWILIO_ACCOUNT_SID',
        'twilio',
      );

      addRequiredIssue(
        ctx,
        config.TWILIO_API_KEY_SID,
        'TWILIO_API_KEY_SID',
        'twilio',
      );

      addRequiredIssue(
        ctx,
        config.TWILIO_API_KEY_SECRET,
        'TWILIO_API_KEY_SECRET',
        'twilio',
      );

      addRequiredIssue(
        ctx,
        config.TWILIO_FROM_NUMBER,
        'TWILIO_FROM_NUMBER',
        'twilio',
      );

      addRequiredIssue(
        ctx,
        config.TWILIO_AUTH_TOKEN,
        'TWILIO_AUTH_TOKEN',
        'twilio',
      );

      addRequiredIssue(
        ctx,
        config.PUBLIC_API_BASE_URL,
        'PUBLIC_API_BASE_URL',
        'twilio',
      );
    }

    if (config.PUSH_PROVIDER === 'firebase') {
      addRequiredIssue(
        ctx,
        config.FIREBASE_PROJECT_ID,
        'FIREBASE_PROJECT_ID',
        'firebase',
      );

      addRequiredIssue(
        ctx,
        config.FIREBASE_CLIENT_EMAIL,
        'FIREBASE_CLIENT_EMAIL',
        'firebase',
      );

      addRequiredIssue(
        ctx,
        config.FIREBASE_PRIVATE_KEY,
        'FIREBASE_PRIVATE_KEY',
        'firebase',
      );
    }
  });

function addRequiredIssue(
  ctx: z.RefinementCtx,
  value: string | undefined,
  field: string,
  provider: string,
): void {
  if (value) {
    return;
  }

  ctx.addIssue({
    code: 'custom',
    path: [field],
    message: `${field} is required when its provider is ${provider}`,
  });
}

export type EnvType = z.infer<typeof envSchema>;

export const validateEnv = (config: Record<string, unknown>): EnvType => {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    console.error('Config validations error:', z.treeifyError(result.error));

    throw new Error('Invalid environment variables');
  }

  return result.data;
};
