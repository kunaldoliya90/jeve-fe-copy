import { z } from 'zod';

/**
 * Environment contract.
 *
 * Validated once, at module load, so a misconfigured deploy fails loudly on
 * boot instead of producing a subtly broken app hours later. Everything the
 * app reads from the environment goes through `env` — never `import.meta.env`
 * directly, which is untyped and silently `undefined` when a var is missing.
 */
const envSchema = z.object({
  VITE_APP_NAME: z.string().min(1).default('JEVE'),

  VITE_API_BASE_URL: z.string().min(1).default('/api'),

  VITE_API_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),

  VITE_ENABLE_API_MOCKING: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),

  VITE_LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error', 'silent']).default('info'),
});

function parseEnv() {
  const result = envSchema.safeParse(import.meta.env);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');

    throw new Error(
      `Invalid environment configuration:\n${issues}\n\n` +
        'Copy .env.example to .env.local and fill in the missing values.',
    );
  }

  return result.data;
}

export const env = {
  ...parseEnv(),
  /** True in `vite dev`. Prefer this over checking NODE_ENV by hand. */
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
  mode: import.meta.env.MODE,
} as const;

export type Env = typeof env;
