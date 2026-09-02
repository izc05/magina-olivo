import { createHash } from 'node:crypto';
import { appendFileSync, chmodSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

type PasswordResetMessage = {
  to: string;
  resetUrl: string;
};

type AuthMailTransport = 'disabled' | 'capture' | 'resend';

function transport(): AuthMailTransport {
  const configured = (process.env.AUTH_MAIL_TRANSPORT ?? 'disabled').trim();
  if (configured === 'disabled' || configured === 'capture' || configured === 'resend') {
    return configured;
  }
  throw new Error(`Unsupported AUTH_MAIL_TRANSPORT: ${configured}`);
}

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for auth mail transport`);
  return value;
}

async function sendWithResend(message: PasswordResetMessage): Promise<void> {
  const apiKey = requiredEnvironment('RESEND_API_KEY');
  const from = requiredEnvironment('AUTH_MAIL_FROM');
  const idempotencyKey = `password-reset-${createHash('sha256').update(message.resetUrl).digest('hex')}`;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    signal: AbortSignal.timeout(10_000),
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
      'idempotency-key': idempotencyKey,
      'user-agent': 'magina-olivo/0.0.0',
    },
    body: JSON.stringify({
      from,
      to: [message.to],
      subject: 'Restablecer contraseña — Mágina Olivo',
      text: [
        'Has solicitado restablecer tu contraseña de Mágina Olivo.',
        '',
        'Abre este enlace para elegir una contraseña nueva:',
        message.resetUrl,
        '',
        'El enlace caduca en 1 hora. Si no has solicitado este cambio, puedes ignorar este correo.',
      ].join('\n'),
    }),
  });

  if (!response.ok) {
    throw new Error(`Resend returned HTTP ${response.status}`);
  }
}

/**
 * Password-reset delivery boundary.
 *
 * `capture` exists only for automated tests and writes the reset URL to a
 * private file so CI can complete the real Better Auth reset flow without
 * printing tokens.
 *
 * The production HTTP transport is deliberately launched without awaiting it
 * from the password-reset request path. This keeps the public endpoint from
 * exposing whether a user exists through provider-dependent response timing.
 * Delivery failures emit only a generic marker: never the address, URL/token,
 * provider response body, or credentials.
 */
export function queuePasswordResetEmail(message: PasswordResetMessage): void {
  const selectedTransport = transport();
  if (selectedTransport === 'disabled') {
    return;
  }

  if (selectedTransport === 'capture') {
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
    return;
  }

  void sendWithResend(message).catch(() => {
    process.stderr.write('[auth-mail] password-reset delivery failed\n');
  });
}
