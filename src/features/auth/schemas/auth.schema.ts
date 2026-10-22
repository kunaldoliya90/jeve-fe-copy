import { z } from 'zod';

/**
 * Schemas are the single source of truth for both form validation and API
 * response parsing, so a server contract change surfaces as a type error
 * rather than as `undefined` deep inside a component.
 */
export const loginSchema = z.object({
  email: z.string().min(1, 'Email is required.').pipe(z.email('Enter a valid email address.')),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const userSchema = z.object({
  id: z.string(),
  email: z.email(),
  name: z.string(),
  roles: z.array(z.string()).default([]),
});

export const sessionSchema = z.object({
  user: userSchema,
  tokens: z.object({
    accessToken: z.string().min(1),
    expiresIn: z.number().int().positive(),
  }),
});
