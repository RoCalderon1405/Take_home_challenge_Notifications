/**
 * Represents the application claims stored inside an access token.
 *
 * Standard JWT claims such as `iat` and `exp` are added automatically
 * by the JWT library when the token is signed.
 */
export interface JwtPayload {
  /**
   * Subject of the token.
   * Contains the authenticated user's identifier.
   */
  sub: string;

  /**
   * Email associated with the authenticated user.
   */
  email: string;
}
