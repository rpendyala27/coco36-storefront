import { existsSync, readdirSync, rmSync, statSync } from 'node:fs';
import path from 'node:path';

/**
 * Source-map upload for the Vite build. The plugin runs only when
 * SENTRY_AUTH_TOKEN is present, so CI and local builds still pass.
 * Release is the Vercel commit SHA. Environment is VERCEL_ENV.
 * The token is never given a VITE_ name and is not passed to `define`.
 */

export interface SentryViteSettings {
  enabled: boolean;
  sourcemap: false | 'hidden';
  release: string | undefined;
  environment: string | undefined;
  pluginOptions: {
    org: string;
    project: string;
    authToken?: string;
    disable: boolean;
    telemetry: false;
    release: {
      name?: string;
      inject: boolean;
      create: boolean;
      setCommits: false;
      deploy: false | { env: string };
    };
    sourcemaps: {
      filesToDeleteAfterUpload: string[];
    };
  };
}

export function sentryViteSettings(env: NodeJS.ProcessEnv): SentryViteSettings {
  const authToken = env.SENTRY_AUTH_TOKEN?.trim() || '';
  const enabled = authToken.length > 0;
  const release = env.VERCEL_GIT_COMMIT_SHA?.trim() || undefined;
  const environment = env.VERCEL_ENV?.trim() || undefined;
  return {
    enabled,
    sourcemap: enabled ? 'hidden' : false,
    release,
    environment,
    pluginOptions: {
      org: env.SENTRY_ORG?.trim() || 'coco36',
      project: env.SENTRY_PROJECT?.trim() || 'coco36-storefront',
      ...(enabled ? { authToken } : {}),
      disable: !enabled,
      telemetry: false,
      release: {
        ...(release ? { name: release } : {}),
        inject: Boolean(release),
        create: enabled,
        setCommits: false,
        deploy: environment ? { env: environment } : false,
      },
      sourcemaps: {
        filesToDeleteAfterUpload: ['./dist/**/*.map', './dist-server/**/*.map'],
      },
    },
  };
}

/** Deletes emitted source maps so they are not publicly served. */
export function removeSourceMaps(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const removed: string[] = [];
  const walk = (current: string): void => {
    for (const name of readdirSync(current)) {
      const full = path.join(current, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (name.endsWith('.map')) {
        rmSync(full);
        removed.push(full);
      }
    }
  };
  walk(dir);
  return removed;
}
