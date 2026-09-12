/**
 * E2E tests must never contact billable/external notification providers.
 *
 * Jest loads this file before application modules, so these values take
 * precedence over a developer's local .env provider selection.
 */
process.env.EMAIL_PROVIDER = 'console';
process.env.SMS_PROVIDER = 'console';
process.env.PUSH_PROVIDER = 'console';

// OAuth is disabled in E2E unless a dedicated Google flow is being tested.
process.env.GOOGLE_OAUTH_ENABLED = 'false';
