import { API_BASE_URL } from '../config/env.js';

// Kiosk-Server order limits (POST /api/orders rejects larger orders with 400).
export const MAX_ORDER_LINES = 50;
// No response within this time → the request is aborted. The order may still have been saved.
export const ORDER_TIMEOUT_MS = 15000;

// POST /api/orders (Kiosk-Server)
// body: { table_id, items: [{ menu_id, option_ids, quantity }] }  — prices are computed by the server.
// 201: { order_id, table_id, order_status, order_time, total_price,
//        items: [{ menu_id, menu_name, quantity, unit_price, options: [{ option_id, option_name, extra_price }] }] }
// 400 / 404 / 409 / 500: { message }
//
// Errors (never retried here):
// - The server answered with a non-2xx status: Error with `status` and `serverMessage` (if any).
// - No answer (network error, timeout): Error without `status`; `timedOut` is true for the timeout.
//   The server may have saved the order before the connection failed.
export async function createOrder(orderRequest, { timeoutMs = ORDER_TIMEOUT_MS } = {}) {
  // AbortController + setTimeout instead of AbortSignal.timeout (missing in Safari < 16, Chrome < 103).
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  let response;
  try {
    response = await fetch(`${API_BASE_URL}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderRequest),
      signal: controller.signal,
    });
  } catch (error) {
    if (timedOut) error.timedOut = true;
    throw error;
  } finally {
    // The status is known from here on; reading the body must not be cut off by the timer.
    clearTimeout(timer);
  }

  if (!response.ok) {
    const error = new Error(`Order request failed (${response.status})`);
    error.status = response.status;
    try {
      const body = await response.json();
      if (typeof body?.message === 'string') error.serverMessage = body.message;
    } catch {
      // No JSON body: keep the status only.
    }
    throw error;
  }

  // 201 means the order was saved. A broken body must not hide that, so return null instead of throwing.
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function fetchTableOrders(tableId, { signal } = {}) {
  const response = await fetch(
    `${API_BASE_URL}/api/tables/${encodeURIComponent(tableId)}/orders`,
    {
      signal,
      cache: 'no-store',
    },
  );

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const error = new Error(
      body?.message || '주문 내역을 불러오지 못했습니다.',
    );

    error.status = response.status;
    throw error;
  }

  return response.json();
}