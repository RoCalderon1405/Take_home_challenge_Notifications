/**
 * Minimal Google profile data required by the application.
 *
 * Access and refresh tokens from Google are intentionally not persisted.
 */
export interface GoogleProfileModel {
  providerUserId: string;
  email: string;
}
