export type OutboxOperation = {
  id: string;
  ownerUserId: string;
  kind: 'delivery.create' | 'activity.create';
  method: 'POST';
  path: string;
  idempotencyKey: string;
  body: Record<string, unknown>;
  createdAt: string;
  attempts: number;
  lastError: string | null;
};

export type SyncResult = {
  attempted: number;
  synced: number;
  pending: number;
};

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

const DB_NAME = 'magina-olivo';
const DB_VERSION = 2;
const STORE_NAME = 'outbox';
const OWNER_INDEX = 'ownerUserId';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      let store: IDBObjectStore;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt');
      } else {
        store = request.transaction!.objectStore(STORE_NAME);
      }

      if (!store.indexNames.contains(OWNER_INDEX)) {
        store.createIndex(OWNER_INDEX, 'ownerUserId', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Unable to open offline database'));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction aborted'));
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed'));
  });
}

function scopedOperationId(ownerUserId: string, idempotencyKey: string): string {
  return `${ownerUserId}:${idempotencyKey}`;
}

async function enqueueOperation(input: {
  ownerUserId: string;
  kind: OutboxOperation['kind'];
  path: string;
  idempotencyKey: string;
  body: Record<string, unknown>;
  createdAt?: string;
}): Promise<OutboxOperation> {
  if (!input.ownerUserId.trim()) throw new Error('ownerUserId is required for offline operations');

  const operation: OutboxOperation = {
    id: scopedOperationId(input.ownerUserId, input.idempotencyKey),
    ownerUserId: input.ownerUserId,
    kind: input.kind,
    method: 'POST',
    path: input.path,
    idempotencyKey: input.idempotencyKey,
    body: input.body,
    createdAt: input.createdAt ?? new Date().toISOString(),
    attempts: 0,
    lastError: null,
  };

  const db = await openDatabase();
  try {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).add(operation);
    await transactionDone(transaction);
    return operation;
  } finally {
    db.close();
  }
}

export function enqueueDeliveryCreate(input: {
  ownerUserId: string;
  campaignId: string;
  idempotencyKey: string;
  body: Record<string, unknown>;
  createdAt?: string;
}): Promise<OutboxOperation> {
  return enqueueOperation({
    ownerUserId: input.ownerUserId,
    kind: 'delivery.create',
    path: `/api/v1/campaigns/${encodeURIComponent(input.campaignId)}/deliveries`,
    idempotencyKey: input.idempotencyKey,
    body: input.body,
    ...(input.createdAt !== undefined ? { createdAt: input.createdAt } : {}),
  });
}

export function enqueueActivityCreate(input: {
  ownerUserId: string;
  holdingId: string;
  idempotencyKey: string;
  body: Record<string, unknown>;
  createdAt?: string;
}): Promise<OutboxOperation> {
  return enqueueOperation({
    ownerUserId: input.ownerUserId,
    kind: 'activity.create',
    path: `/api/v1/holdings/${encodeURIComponent(input.holdingId)}/activities`,
    idempotencyKey: input.idempotencyKey,
    body: input.body,
    ...(input.createdAt !== undefined ? { createdAt: input.createdAt } : {}),
  });
}

export async function listPendingOperations(ownerUserId: string): Promise<OutboxOperation[]> {
  const db = await openDatabase();
  try {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const request = transaction.objectStore(STORE_NAME).index(OWNER_INDEX).getAll(ownerUserId);
    const items = await new Promise<OutboxOperation[]>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result as OutboxOperation[]);
      request.onerror = () => reject(request.error ?? new Error('Unable to read offline outbox'));
    });
    await transactionDone(transaction);
    return items.sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
  } finally {
    db.close();
  }
}

async function deleteOperation(ownerUserId: string, id: string): Promise<void> {
  const db = await openDatabase();
  try {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const current = await new Promise<OutboxOperation | undefined>((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result as OutboxOperation | undefined);
      request.onerror = () => reject(request.error ?? new Error('Unable to read offline operation'));
    });

    if (current?.ownerUserId === ownerUserId) store.delete(id);
    await transactionDone(transaction);
  } finally {
    db.close();
  }
}

async function markAttempt(ownerUserId: string, id: string, message: string): Promise<void> {
  const db = await openDatabase();
  try {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);
    const current = await new Promise<OutboxOperation | undefined>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result as OutboxOperation | undefined);
      request.onerror = () => reject(request.error ?? new Error('Unable to read offline operation'));
    });

    if (current?.ownerUserId === ownerUserId) {
      store.put({ ...current, attempts: current.attempts + 1, lastError: message });
    }
    await transactionDone(transaction);
  } finally {
    db.close();
  }
}

export async function syncPendingOperations(
  ownerUserId: string,
  fetchImpl: FetchLike = fetch,
): Promise<SyncResult> {
  const operations = await listPendingOperations(ownerUserId);
  let synced = 0;

  for (const operation of operations) {
    try {
      const response = await fetchImpl(operation.path, {
        method: operation.method,
        credentials: 'include',
        headers: {
          'content-type': 'application/json',
          'idempotency-key': operation.idempotencyKey,
        },
        body: JSON.stringify(operation.body),
      });

      if (!response.ok) {
        await markAttempt(ownerUserId, operation.id, `HTTP ${response.status}`);
        continue;
      }

      await deleteOperation(ownerUserId, operation.id);
      synced += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Network error';
      await markAttempt(ownerUserId, operation.id, message);
      break;
    }
  }

  const pending = (await listPendingOperations(ownerUserId)).length;
  return { attempted: operations.length, synced, pending };
}

export async function clearOutbox(ownerUserId?: string): Promise<void> {
  const db = await openDatabase();
  try {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    if (!ownerUserId) {
      store.clear();
      await transactionDone(transaction);
      return;
    }

    const request = store.index(OWNER_INDEX).openKeyCursor(IDBKeyRange.only(ownerUserId));
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return;
      store.delete(cursor.primaryKey);
      cursor.continue();
    };
    await transactionDone(transaction);
  } finally {
    db.close();
  }
}
