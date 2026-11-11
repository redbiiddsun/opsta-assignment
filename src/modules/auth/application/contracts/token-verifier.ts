export const TOKEN_VERIFIER = Symbol('TOKEN_VERIFIER');

export interface TokenVerifier {
  /** Returns the user id, or null for any invalid token (signature, expiry, iss/aud, malformed). */
  verify(accessToken: string): Promise<string | null>;
}
