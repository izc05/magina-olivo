import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiError } from './api.ts';
import { privateRouteFailureState } from './private-route-state.ts';

test('PrivateRoute gates only explicit authentication failures', () => {
  assert.equal(privateRouteFailureState(new ApiError('No session', 401), { hasKnownLocalOwner: true, offline: false }), 'denied');
  assert.equal(privateRouteFailureState(new ApiError('Forbidden', 403), { hasKnownLocalOwner: true, offline: false }), 'denied');
});

test('PrivateRoute preserves protected offline semantics only with a known local owner', () => {
  assert.equal(privateRouteFailureState(new Error('Network failed'), { hasKnownLocalOwner: true, offline: false }), 'offline_locked');
  assert.equal(privateRouteFailureState(new Error('Offline'), { hasKnownLocalOwner: true, offline: true }), 'offline_locked');
  assert.equal(privateRouteFailureState(new Error('Network failed'), { hasKnownLocalOwner: false, offline: false }), 'unavailable');
});

test('PrivateRoute never converts a temporary server failure into authentication or access', () => {
  assert.equal(privateRouteFailureState(new ApiError('Unavailable', 503), { hasKnownLocalOwner: true, offline: false }), 'unavailable');
  assert.equal(privateRouteFailureState(new ApiError('Unavailable', 503), { hasKnownLocalOwner: false, offline: false }), 'unavailable');
});
