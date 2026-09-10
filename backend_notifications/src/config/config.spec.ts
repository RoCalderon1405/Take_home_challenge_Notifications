import { envSchema } from './config';

const baseEnv = {
  PORT: '3000',
  ALLOWED_ORIGINS: 'http://localhost:5173',
  DATABASE_URL: 'postgresql://postgres:postgres@db:5432/notifications',
  REDIS_URL: 'redis://redis:6379',
  PASSWORD_PEPPER: '12345678901234567890123456789012',
  JWT_SECRET: '12345678901234567890123456789012',
  JWT_EXPIRES_IN_SECONDS: '3600',
};

describe('environment provider configuration', () => {
  it('should default all notification providers to console', () => {
    const result = envSchema.safeParse(baseEnv);

    expect(result.success).toBe(true);

    if (!result.success) {
      throw new Error('Expected environment parsing to succeed');
    }

    expect(result.data.EMAIL_PROVIDER).toBe('console');
    expect(result.data.SMS_PROVIDER).toBe('console');
    expect(result.data.PUSH_PROVIDER).toBe('console');
  });

  it('should normalize the legacy development email provider to console', () => {
    const result = envSchema.safeParse({
      ...baseEnv,
      EMAIL_PROVIDER: 'development',
    });

    expect(result.success).toBe(true);

    if (!result.success) {
      throw new Error('Expected environment parsing to succeed');
    }

    expect(result.data.EMAIL_PROVIDER).toBe('console');
  });

  it('should allow blank external credentials while console providers are selected', () => {
    const result = envSchema.safeParse({
      ...baseEnv,

      RESEND_API_KEY: '',
      EMAIL_FROM: '',

      TWILIO_ACCOUNT_SID: '',
      TWILIO_API_KEY_SID: '',
      TWILIO_API_KEY_SECRET: '',
      TWILIO_FROM_NUMBER: '',

      FIREBASE_PROJECT_ID: '',
      FIREBASE_CLIENT_EMAIL: '',
      FIREBASE_PRIVATE_KEY: '',
    });

    expect(result.success).toBe(true);
  });

  it('should require Resend credentials when the email provider is resend', () => {
    const result = envSchema.safeParse({
      ...baseEnv,
      EMAIL_PROVIDER: 'resend',
    });

    expect(result.success).toBe(false);
  });

  it('should accept Resend configuration when required credentials exist', () => {
    const result = envSchema.safeParse({
      ...baseEnv,

      EMAIL_PROVIDER: 'resend',
      RESEND_API_KEY: 're_test',
      EMAIL_FROM: 'Notifications <notifications@example.com>',
    });

    expect(result.success).toBe(true);
  });

  it('should require Twilio credentials when the SMS provider is twilio', () => {
    const result = envSchema.safeParse({
      ...baseEnv,
      SMS_PROVIDER: 'twilio',
    });

    expect(result.success).toBe(false);
  });

  it('should accept Twilio configuration when required credentials exist', () => {
    const result = envSchema.safeParse({
      ...baseEnv,

      SMS_PROVIDER: 'twilio',
      TWILIO_ACCOUNT_SID: 'AC123',
      TWILIO_API_KEY_SID: 'SK123',
      TWILIO_API_KEY_SECRET: 'twilio-api-key-secret',
      TWILIO_FROM_NUMBER: '+15551234567',
    });

    expect(result.success).toBe(true);
  });

  it('should require Firebase credentials when the Push provider is firebase', () => {
    const result = envSchema.safeParse({
      ...baseEnv,
      PUSH_PROVIDER: 'firebase',
    });

    expect(result.success).toBe(false);
  });

  it('should accept Firebase configuration when required credentials exist', () => {
    const result = envSchema.safeParse({
      ...baseEnv,

      PUSH_PROVIDER: 'firebase',
      FIREBASE_PROJECT_ID: 'notifications-project',
      FIREBASE_CLIENT_EMAIL: 'firebase@example.com',
      FIREBASE_PRIVATE_KEY: 'private-key',
    });

    expect(result.success).toBe(true);
  });
});
