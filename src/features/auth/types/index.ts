export interface User {
  id: string;
  email: string;
  name: string;
  roles: string[];
}

export interface AuthTokens {
  accessToken: string;
  /** Seconds until `accessToken` expires. */
  expiresIn: number;
}

export interface Session {
  user: User;
  tokens: AuthTokens;
}
