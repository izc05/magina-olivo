export type OutboxOperation = {
  id: string;
  kind: 'delivery.create';
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
const DB_VERSION = 1;
const STORE_NAME = 'outbox';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt');
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

export async function enqueueDeliveryCreate(input: {
  campaignId: string;
  idempotencyKey: string;
  body: Record<string, unknown>;
  createdAt?: string;
}): Promise<OutboxOperation> {
  const operation: OutboxOperation = {
    id: input.idempotencyKey,
    kind: 'delivery.create',
    method: 'POST',
    path: `/api/v1/campaigns/${encodeURIComponent(input.campaignId)}/deliveries`,
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

export async function listPendingOperations(): Promise<OutboxOperation[]> {
  const db = await openDatabase();
  try {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const request = transaction.objectStore(STORE_NAME).getAll();
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

async function deleteOperation(id: string): Promise<void> {
  const db = await openDatabase();
  try {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).delete(id);
    await transactionDone(transaction);
  } finally {
    db.close();
  }
}

async function markAttempt(id: string, message: string): Promise<void> {
  const db = await openDatabase();
  try {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);
    const current = await new Promise<OutboxOperation | undefined>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result as OutboxOperation | undefined);
      request.onerror = () => reject(request.error ?? new Error('Unable to read offline operation'));
    });

    if (current) {
      store.put({
        ...current,
        attempts: current.attempts + 1,
        lastError: message,
      });
    }
    await transactionDone(transaction);
  } finally {
    db.close();
  }
}

export async function syncPendingOperations(fetchImpl: FetchLike = fetch): Promise<SyncResult> {
  const operations = await listPendingOperations();
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
        await markAttempt(operation.id, `HTTP ${response.status}`);
        continue;
      }

      await deleteOperation(operation.id);
      synced += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Network error';
      await markAttempt(operation.id, message);
      break;
    }
  }

  const pending = (await listPendingOperations()).length;
  return {
    attempted: operations.length,
    synced,
    pending,
  };
}

export async function clearOutbox(): Promise<void> {
  const db = await openDatabase();
  try {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).clear();
    await transactionDone(transaction);
  } finally {
    db.close();
  }
}
