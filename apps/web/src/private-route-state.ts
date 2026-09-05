import { ApiError } from './api.ts';

export type PrivateRouteState = 'checking' | 'allowed' | 'denied' | 'offline_locked' | 'unavailable';

export function privateRouteFailureState(reason: unknown, options: { hasKnownLocalOwner: boolean; offline: boolean }): PrivateRouteState {
  if (reason instanceof ApiError && (reason.status === 401 || reason.status === 403)) return 'denied';

  // A remembered owner is only evidence that this device has queued work. It never
  // authorizes data access, but it does preserve V11's protected offline state.
  if (options.hasKnownLocalOwner && (options.offline || !(reason instanceof ApiError))) return 'offline_locked';

  return 'unavailable';
}
