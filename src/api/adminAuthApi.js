import { API_BASE_URL } from '../config/env.js';

// Kiosk-Server admin authentication (real API).
// The server keeps the login in an httpOnly cookie (kiosk_admin_token, path /api, 8 hours), which this
// code cannot read: every request sends it with credentials: 'include', and the login state is checked
// with GET /api/admin/me. The page must be opened from the server's CORS_ORIGIN (e.g. http://localhost:5173,
// not 127.0.0.1), otherwise the browser blocks the request or does not send the cookie.
//
// POST /api/admin/login  body { adminId, password } → 200 { adminId } + cookie
//                        400 (empty input) / 401 (wrong ID or password) / 403 (other origin): { message }
// GET  /api/admin/me     → 200 { adminId } / 401 { message } (not logged in or expired)
// POST /api/admin/logout → 204 (clears the cookie)
//
// Errors:
// - The server answered with a non-2xx status: Error with `status` and `serverMessage` (if any).
// - No answer (network error, timeout): Error without `status`; `timedOut` is true for the timeout.
//   The timeout covers the whole request: from sending it until the response body has been read.
// - An abort through the caller's `signal`: the fetch AbortError (name 'AbortError'), never `timedOut`,
//   also when it happens while the body is being read.

export const AUTH_TIMEOUT_MS = 10000;

async function request(path, { method = 'GET', body, signal } = {}) {
  // AbortController + setTimeout instead of AbortSignal.timeout/any (missing in older browsers).
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    if (controller.signal.aborted) return; // already cancelled by the caller: not a timeout
    timedOut = true;
    controller.abort();
  }, AUTH_TIMEOUT_MS);
  const abortFromCaller = () => controller.abort();
  signal?.addEventListener('abort', abortFromCaller);

  // The timer and the abort listener stay active until the body is read (aborting the controller also
  // stops reading the body), and are removed in `finally`.
  try {
    if (signal?.aborted) controller.abort();
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      credentials: 'include',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    if (!response.ok) {
      const error = new Error(`Admin auth request failed (${response.status})`);
      error.status = response.status;
      try {
        const data = await response.json();
        if (typeof data?.message === 'string') error.serverMessage = data.message;
      } catch {
        // No JSON body, or the body did not arrive in time: keep the status only.
      }
      // Cancelled by the caller while the body was read: report the cancel, not the status.
      // (signal.reason is missing in older browsers, hence the fallback with the same name.)
      if (controller.signal.aborted && !timedOut) {
        throw controller.signal.reason ?? new DOMException('The operation was aborted.', 'AbortError');
      }
      throw error;
    }

    return response.status === 204 ? null : await response.json();
  } catch (error) {
    // Only an error without a status (no usable answer) is a timeout.
    if (timedOut && error.status === undefined) error.timedOut = true;
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abortFromCaller);
  }
}

// Resolves with { adminId } and sets the login cookie.
export function loginAdmin({ adminId, password }) {
  return request('/api/admin/login', { method: 'POST', body: { adminId, password } });
}

// Resolves with { adminId } while logged in; rejects with status 401 when not.
export function fetchAdminMe({ signal } = {}) {
  return request('/api/admin/me', { signal });
}

// Clears the login cookie on the server. A rejection means the cookie may still be there.
export function logoutAdmin() {
  return request('/api/admin/logout', { method: 'POST' });
}
