import { betterAuth } from 'better-auth';
import { getPool } from './db.ts';
import { queuePasswordResetEmail } from './auth-mailer.ts';

const isProduction = process.env.NODE_ENV === 'production';
const configuredSecret = process.env.BETTER_AUTH_SECRET?.trim();

if (isProduction && !configuredSecret) {
  throw new Error('BETTER_AUTH_SECRET is required in production');
}

const baseURL = process.env.BETTER_AUTH_URL ?? 'http://localhost:5173';
export const trustedOrigins = (process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? baseURL)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim();
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
export const googleAuthEnabled = Boolean(googleClientId && googleClientSecret);

export const auth = betterAuth({
  appName: 'Mágina Olivo',
  database: getPool(),
  baseURL,
  basePath: '/api/auth',
  secret:
    configuredSecret ??
    'magina-olivo-development-only-secret-never-use-in-production',
  trustedOrigins,
  socialProviders: googleAuthEnabled
    ? {
        google: {
          clientId: googleClientId as string,
          clientSecret: googleClientSecret as string,
          prompt: 'select_account',
        },
      }
    : {},
  account: {
    accountLinking: {
      enabled: true,
      // Better Auth only links same-email OAuth accounts implicitly when the
      // provider confirms that email. Google supplies a verified email claim,
      // so existing email/password users are reused instead of duplicated.
      disableImplicitLinking: false,
      allowDifferentEmails: false,
    },
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    maxPasswordLength: 128,
    resetPasswordTokenExpiresIn: 3600,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      // The delivery adapter is intentionally synchronous/no-op in CI/dev.
      // A real provider must queue delivery rather than exposing the token in
      // logs or blocking this endpoint on a remote mail service.
      queuePasswordResetEmail({
        to: user.email,
        resetUrl: url,
      });
    },
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    customRules: {
      '/sign-in/email': { window: 60, max: 10 },
      '/sign-up/email': { window: 60, max: 10 },
      '/sign-in/social': { window: 60, max: 20 },
      '/request-password-reset': { window: 60, max: 5 },
      '/reset-password': { window: 60, max: 10 },
    },
  },
  advanced: {
    cookiePrefix: 'magina-olivo',
    useSecureCookies: isProduction,
    disableCSRFCheck: false,
    disableOriginCheck: false,
    defaultCookieAttributes: {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
    },
    database: {
      joins: true,
    },
  },
});
