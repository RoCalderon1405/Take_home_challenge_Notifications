import type { UserAuthProvider } from './user-auth-provider.enum';

/**
 * Identity information produced by an external authentication provider.
 */
export interface ExternalIdentityInput {
  provider: UserAuthProvider;
  providerUserId: string;
  email: string;
}
