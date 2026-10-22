import { http } from '@/lib/http/client';

import { type LoginInput, sessionSchema, userSchema } from '../schemas/auth.schema';
import type { Session, User } from '../types';

/**
 * Transport layer for the auth feature.
 *
 * Each call parses its response through the Zod schema rather than casting.
 * The type parameter on `http.*` is only an assertion; `parse` is what
 * actually guarantees the shape at runtime.
 */

export async function login(input: LoginInput): Promise<Session> {
  // `skipAuth` — there is no token to send yet, and a 401 here means bad
  // credentials, not an expired session, so the refresh handshake must not run.
  const data = await http.post<unknown>('/auth/login', input, {
    skipAuth: true,
    skipRefresh: true,
  });

  return sessionSchema.parse(data);
}

export async function logout(): Promise<void> {
  await http.post<unknown>('/auth/logout');
}

export async function getCurrentUser(): Promise<User> {
  const data = await http.get<unknown>('/auth/me');
  return userSchema.parse(data);
}

/**
 * Exchanges the refresh cookie for a new access token. Must not itself go
 * through the refresh handshake, or a failure recurses.
 */
export async function refreshSession(): Promise<Session> {
  const data = await http.post<unknown>('/auth/refresh', undefined, {
    skipAuth: true,
    skipRefresh: true,
  });

  return sessionSchema.parse(data);
}
