import { listPendingOperations } from '../offline/outbox';

export type PwaUpdateResult =
  | {
      status: 'deferred';
      pendingOperations: number;
      reason: 'pending_outbox';
    }
  | {
      status: 'applied';
      pendingOperations: 0;
    };

export type ApplyPwaUpdate = () => Promise<void> | void;

/**
 * Decide whether a newly downloaded PWA version may take control.
 *
 * The service worker cache and the business outbox intentionally live in
 * different browser stores. A worker update must never clear IndexedDB.
 * Additionally, Mágina Olivo defers activation while the current user's
 * durable outbox still contains unsynchronised writes, avoiding a reload at
 * the most sensitive point of an offline workflow.
 */
export async function applyPwaUpdateWhenSafe(input: {
  ownerUserId: string;
  applyUpdate: ApplyPwaUpdate;
}): Promise<PwaUpdateResult> {
  if (!input.ownerUserId.trim()) {
    throw new Error('ownerUserId is required before applying a PWA update');
  }

  const pendingOperations = (await listPendingOperations(input.ownerUserId)).length;
  if (pendingOperations > 0) {
    return {
      status: 'deferred',
      pendingOperations,
      reason: 'pending_outbox',
    };
  }

  await input.applyUpdate();
  return {
    status: 'applied',
    pendingOperations: 0,
  };
}
