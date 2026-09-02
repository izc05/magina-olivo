import { appendFileSync, chmodSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

type PasswordResetMessage = {
  to: string;
  resetUrl: string;
};

type AuthMailTransport = 'disabled' | 'capture';

function transport(): AuthMailTransport {
  const configured = (process.env.AUTH_MAIL_TRANSPORT ?? 'disabled').trim();
  if (configured === 'disabled' || configured === 'capture') return configured;
  throw new Error(`Unsupported AUTH_MAIL_TRANSPORT: ${configured}`);
}

/**
 * Password-reset delivery boundary.
 *
 * `capture` exists only for automated tests and writes the reset URL to a
 * private file so CI can complete the real Better Auth reset flow without
 * printing tokens. A real SMTP/API provider will replace `disabled` before
 * staging is opened to pilot users.
 */
export function queuePasswordResetEmail(message: PasswordResetMessage): void {
  const selectedTransport = transport();
  if (selectedTransport === 'disabled') {
    return;
  }

  if (process.env.NODE_ENV !== 'test') {
    throw new Error('AUTH_MAIL_TRANSPORT=capture is restricted to NODE_ENV=test');
  }

  const captureFile = process.env.AUTH_MAIL_CAPTURE_FILE?.trim();
  if (!captureFile) {
    throw new Error('AUTH_MAIL_CAPTURE_FILE is required for capture transport');
  }

  mkdirSync(dirname(captureFile), { recursive: true, mode: 0o700 });
  appendFileSync(
    captureFile,
    `${JSON.stringify({ type: 'password-reset', to: message.to, resetUrl: message.resetUrl })}\n`,
    { encoding: 'utf8', mode: 0o600 },
  );
  chmodSync(captureFile, 0o600);
}
