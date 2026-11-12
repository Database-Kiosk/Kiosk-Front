import { API_BASE_URL } from '../config/env.js';

// GET /api/tables/:tableId (Kiosk-Server)
// 200: { table_id, table_status }
// 400 (invalid number) / 404 (no such table) / 500: { message }
// Non-2xx responses throw an Error with `status`; network errors and aborts throw as fetch does.
export async function fetchTable(tableId, { signal } = {}) {
  const response = await fetch(`${API_BASE_URL}/api/tables/${encodeURIComponent(tableId)}`, { signal });

  if (!response.ok) {
    const error = new Error(`Table request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }

  return response.json();
}
