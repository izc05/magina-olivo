import crypto from 'node:crypto';

export type VapidKeys = {
  publicKey: string;
  privateKey: string;
};

// Default fallback development VAPID public key (uncompressed EC P-256 URL-safe Base4)
export const DEFAULT_VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-Skv69yViEuiBIa-Ib9-Skv69yViEuiBIa-Ib9-Skv69yViEuiBIa-Ib9';

export function getOrGenerateVapidKeys(): VapidKeys {
  const envPublic = process.env.VAPID_PUBLIC_KEY;
  const envPrivate = process.env.VAPID_PRIVATE_KEY;

  if (envPublic && envPrivate) {
    return {
      publicKey: envPublic,
      privateKey: envPrivate,
    };
  }

  // Generate deterministic VAPID ECDSA P-256 key pair for development
  const ecdh = crypto.createECDH('prime256v1');
  ecdh.generateKeys();

  return {
    publicKey: ecdh.getPublicKey('base64url'),
    privateKey: ecdh.getPrivateKey('base64url'),
  };
}
