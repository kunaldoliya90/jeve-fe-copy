import { fileURLToPath, URL } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const proxyTarget = env['VITE_API_PROXY_TARGET'];

  return {
    plugins: [react(), tailwindcss()],

    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },

    server: {
      port: 3000,
      strictPort: true,
      // Proxy keeps the browser same-origin in dev, so cookie-based auth and
      // CORS behave the same locally as they do behind the production gateway.
      // Spread rather than `proxy: undefined` — exactOptionalPropertyTypes
      // treats an explicit undefined as a different thing from an absent key.
      ...(proxyTarget
        ? {
            proxy: {
              '/api': {
                target: proxyTarget,
                changeOrigin: true,
                secure: false,
              },
            },
          }
        : {}),
    },

    preview: {
      port: 3000,
      strictPort: true,
    },

    build: {
      outDir: 'dist',
      sourcemap: mode !== 'production',
      target: 'es2022',
      reportCompressedSize: false,
      // Vite 8 bundles with Rolldown; `codeSplitting` is its declarative
      // replacement for Rollup's `manualChunks`.
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [
              // Pin the framework and data layer into long-lived chunks so
              // shipping a feature does not invalidate them in users' caches.
              {
                name: 'react',
                test: /[\\/]node_modules[\\/](react|react-dom|react-router|scheduler)[\\/]/,
              },
              { name: 'query', test: /[\\/]node_modules[\\/]@tanstack[\\/]/ },
            ],
          },
        },
      },
    },

    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/testing/setup.ts'],
      css: true,
      restoreMocks: true,
      include: ['src/**/*.{test,spec}.{ts,tsx}'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'lcov'],
        reportsDirectory: './coverage',
        include: ['src/**/*.{ts,tsx}'],
        // The shell and the route-level pages are deliberately thin wiring,
        // and Playwright asserts on them end to end. Measuring them here
        // would only invite tests that re-render a layout to move a number.
        exclude: [
          'src/**/*.{test,spec}.{ts,tsx}',
          'src/**/index.ts',
          'src/**/*.d.ts',
          'src/testing/**',
          'src/app/**',
          'src/pages/**',
          'src/main.tsx',
        ],
        // A ratchet, not an aspiration: these are set just under what the
        // suite currently holds, so a green checkout stays green and any drop
        // fails CI. Raise them as features land -- never lower them to get a
        // build passing.
        thresholds: {
          statements: 60,
          branches: 60,
          functions: 55,
          lines: 60,
        },
      },
    },
  };
});
