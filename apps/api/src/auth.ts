import { betterAuth } from 'better-auth';
import { getPool } from './db.ts';

const isProduction = process.env.NODE_ENV === 'production';
const configuredSecret = process.env.BETTER_AUTH_SECRET?.trim();

if (isProduction && !configuredSecret) {
  throw new Error('BETTER_AUTH_SECRET is required in production');
}

const baseURL = process.env.BETTER_AUTH_URL ?? 'http://localhost:5173';
const trustedOrigins = (process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? baseURL)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

export const auth = betterAuth({
  database: getPool(),
  baseURL,
  basePath: '/api/auth',
  secret:
    configuredSecret ??
    'magina-olivo-development-only-secret-never-use-in-production',
  trustedOrigins,
  emailAndPassword: {
    enabled: true,
  },
  advanced: {
    database: {
      joins: true,
    },
  },
});
