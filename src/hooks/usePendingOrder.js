import { useCallback, useSyncExternalStore } from 'react';

// Per-table "an order request was sent and its result is not confirmed" state, to prevent duplicate
// orders when the customer leaves the payment page, refreshes, or the request times out.
//
// status (per table):
// - 'in-flight': a request started in THIS page load is still running (in memory; gone after a refresh)
// - 'uncertain': a request was sent but its result is unknown (sessionStorage marker, survives a refresh)
// - 'none'
//
// The marker is removed only when the result is certain (201, or a 4xx the server answered with),
// or when the customer explicitly says they checked (acknowledgePendingOrder). It never expires by time.
// Limits: sessionStorage is per browser tab, so other tabs/devices are not covered (see report).

const STORAGE_KEY_PREFIX = 'kiosk-order-pending-table-';

const inFlightTables = new Set();
// Fallback when sessionStorage is not writable (private mode, blocked): kept until a reload.
const uncertainTables = new Set();
const listeners = new Set();

const storageKey = (tableId) => `${STORAGE_KEY_PREFIX}${tableId}`;

function hasMarker(tableId) {
  try {
    return window.sessionStorage.getItem(storageKey(tableId)) !== null;
  } catch {
    return false;
  }
}

function writeMarker(tableId) {
  try {
    window.sessionStorage.setItem(storageKey(tableId), JSON.stringify({ startedAt: new Date().toISOString() }));
  } catch {
    // Not writable: the in-memory state below still protects this page load.
  }
}

function removeMarker(tableId) {
  try {
    window.sessionStorage.removeItem(storageKey(tableId));
  } catch {
    // ignore
  }
}

function notify() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getPendingOrderStatus(tableId) {
  if (inFlightTables.has(tableId)) return 'in-flight';
  if (uncertainTables.has(tableId) || hasMarker(tableId)) return 'uncertain';
  return 'none';
}

// Call right before sending the order request.
export function beginPendingOrder(tableId) {
  writeMarker(tableId);
  inFlightTables.add(tableId);
  notify();
}

// outcome 'settled': 201, or a 4xx (the order was not saved).
// outcome 'unknown': 5xx or no answer (network error, timeout) — keep the marker.
export function settlePendingOrder(tableId, outcome) {
  inFlightTables.delete(tableId);
  if (outcome === 'settled') {
    uncertainTables.delete(tableId);
    removeMarker(tableId);
  } else {
    uncertainTables.add(tableId);
  }
  notify();
}

// The customer states they checked (order history / staff) that the previous order was not received.
// This is NOT a server check; it only re-enables payment. Ignored while a request is still running.
export function acknowledgePendingOrder(tableId) {
  if (inFlightTables.has(tableId)) return;
  uncertainTables.delete(tableId);
  removeMarker(tableId);
  notify();
}

/** @returns {{ status: 'none'|'in-flight'|'uncertain', acknowledge: () => void }} */
export function usePendingOrder(tableId) {
  const status = useSyncExternalStore(subscribe, () => getPendingOrderStatus(tableId));
  const acknowledge = useCallback(() => acknowledgePendingOrder(tableId), [tableId]);
  return { status, acknowledge };
}
