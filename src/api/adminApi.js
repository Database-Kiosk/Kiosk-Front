// Admin screen data.
// - Orders: real Kiosk-Server API (Front #11), sent with the admin login cookie through adminRequest
//   (adminAuthApi.js: same timeout and errors as login). Never mixed with the mock data below.
// - Tables, menus, sales: MOCK ONLY (Front #9). Nothing is sent to Kiosk-Server and nothing is saved:
//   changes live in this module's memory and are lost on a page reload. Each function keeps the shape
//   a real API call would have (async, snake_case fields, Error with `status`).
// Login/logout are real and live in adminAuthApi.js.
//
// Dev only (after logging in): add ?preview=loading|empty|error to an admin URL to check those screen
// states. It applies to the mock functions only (not to the order screen).
import { adminRequest } from './adminAuthApi.js';
import { createAdminMockState } from '../mocks/adminMockData.js';
import { buildSalesReport, createPastSales } from '../mocks/adminSalesMock.js';
import { toDbDateTime } from '../utils/dateTime.js';

const MOCK_DELAY_MS = 400;
export const SALES_PERIOD_DAYS = { today: 1, week: 7, month: 30 };

function createState() {
  const now = new Date();
  const state = createAdminMockState(now);
  return { ...state, pastSales: createPastSales(state.menus, now) };
}

// Reset on every page load (module evaluated again).
const state = createState();

function getPreview() {
  if (!import.meta.env.DEV) return null;
  const value = new URLSearchParams(window.location.search).get('preview');
  return ['loading', 'empty', 'error'].includes(value) ? value : null;
}

function mockError(message, status = 500) {
  const error = new Error(message);
  error.status = status;
  return error;
}

// Resolves with a copy (screens must not change the mock state directly) after a short delay.
function respond(makeData, emptyData) {
  const preview = getPreview();
  if (preview === 'loading') return new Promise(() => {});
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (preview === 'error') {
        reject(mockError('Mock request failed (preview=error)'));
        return;
      }
      // A throw inside a timer callback would not reach this Promise (it would hang), so pass it on.
      try {
        resolve(structuredClone(preview === 'empty' && emptyData !== undefined ? emptyData : makeData()));
      } catch (error) {
        reject(error);
      }
    }, MOCK_DELAY_MS);
  });
}

/* ---------- Orders (real API) ---------- */

// orders.order_status ENUM values (Kiosk-Server DB/schema.sql), in the order a status moves forward.
export const ORDER_STATUSES = ['접수', '조리 중', '전달 완료'];

// Message for a failed admin request: login expired (401), timeout, no answer, or `fallback` otherwise.
export function describeAdminError(error, fallback) {
  if (error?.status === 401) return '로그인이 만료되었습니다. 다시 로그인해 주세요.';
  if (error?.timedOut) return '서버 응답이 늦어 요청을 중단했습니다. 잠시 후 다시 시도해 주세요.';
  if (error?.status === undefined) return '서버에 연결하지 못했습니다. 네트워크 상태를 확인해 주세요.';
  return fallback;
}

// GET /api/admin/orders → every order (ended sessions included), newest first:
// [{ order_id, session_id, table_id, order_status, order_time, total_price,
//    items: [{ order_detail_id, menu_id, menu_name, quantity, unit_price,
//              options: [{ option_id, option_name, extra_price }] }] }]
export function fetchAdminOrders() {
  return adminRequest('/api/admin/orders');
}

// GET /api/admin/orders/:orderId → one order as above plus session: { session_id, started_at, ended_at }.
// 400 / 404 (no such order): { message }
export function fetchAdminOrderById(orderId) {
  return adminRequest(`/api/admin/orders/${encodeURIComponent(orderId)}`);
}

// PATCH /api/admin/orders/:orderId/status  body { order_status }
// Only one step forward (접수 → 조리 중 → 전달 완료). 200: the full order (same shape as fetchAdminOrderById).
// 400 / 404 / 409 (status already changed, or not the next step): { message }
export function updateOrderStatus(orderId, nextStatus) {
  return adminRequest(`/api/admin/orders/${encodeURIComponent(orderId)}/status`, {
    method: 'PATCH',
    body: { order_status: nextStatus },
  });
}

/* ---------- Tables ---------- */

function summarizeTable(table) {
  const session = state.sessions.find((item) => item.table_id === table.table_id && item.ended_at === null);
  if (!session) return { ...table, session: null };
  const orders = state.orders.filter((order) => order.session_id === session.session_id);
  return {
    ...table,
    session: {
      session_id: session.session_id,
      started_at: session.started_at,
      order_count: orders.length,
      pending_count: orders.filter((order) => order.order_status !== '전달 완료').length,
      total_price: orders.reduce((sum, order) => sum + order.total_price, 0),
    },
  };
}

export function fetchAdminTables() {
  return adminRequest('/api/admin/tables');
}


// 테이블 이용 종료
export function closeTableSession(tableId) {
  return adminRequest(
    `/api/admin/tables/${encodeURIComponent(tableId)}/complete`,
    {
      method: 'PATCH',
    },
  );
}

export function fetchAdminTableOrders(tableId) {
  return adminRequest(
    `/api/admin/tables/${encodeURIComponent(tableId)}/orders`,
  );
}

/* ---------- Menus ---------- */

export function fetchAdminMenus() {
  return adminRequest('/api/admin/menus');
}

const nextId = (rows, key) => Math.max(0, ...rows.map((row) => row[key])) + 1;

// Creates (no menu_id) or updates a menu with its options (MOCK).
// Options: an option with option_id keeps it, one without gets a new ID, one left out is removed.
// Mock-only shortcut: a new ID is "current max + 1", so the ID of a removed option can be given again.
// For the real API:
// - option IDs come from the DB (AUTO_INCREMENT); the server must check that each sent option_id
//   belongs to this menu.
// - orderoption references menu_option (FK), so an option that was ordered cannot simply be deleted;
//   the schema has no "inactive" flag for options, so the deletion rule must be decided with the backend.
// - past orders keep their saved prices (orderoption.extra_price), but show the current option name.
export function saveMenu(menu, imageFile = null) {
  if (menu.menu_id != null) {
    return adminRequest(`/api/admin/menus/${encodeURIComponent(menu.menu_id)}`, {
      method: 'PATCH',
      body: {
        menu_name: menu.menu_name,
        price: menu.price,
        category_id: menu.category_id,
        description: menu.description,
        options: menu.options.map((option) => ({
          option_id: option.option_id,
          option_name: option.option_name,
          additional_price: option.additional_price,
        })),
      },
    });
  }

  const formData = new FormData();

  const menuData = {
    menu_name: menu.menu_name,
    price: menu.price,
    category_id: menu.category_id,
    description: menu.description,
    is_active: menu.is_active,
    options: menu.options.map((option) => ({
      option_name: option.option_name,
      additional_price: option.additional_price,
    })),
  };

  formData.append('data', JSON.stringify(menuData));

  if (imageFile) {
    formData.append('image', imageFile);
  }

  return adminRequest('/api/admin/menus', {
    method: 'POST',
    body: formData,
  });
}

export function setMenuActive(menuId, isActive) {
  return adminRequest(`/api/admin/menus/${encodeURIComponent(menuId)}/status`, {
    method: 'PATCH',
    body: {
      is_active: isActive ? 1 : 0,
    },
  });
}

/* ---------- Sales ---------- */

// period: 'today' | 'week' | 'month'
export function fetchSalesReport(query = 'today') {
  const params = new URLSearchParams();

  if (/^\d{4}-\d{2}$/.test(query)) {
    params.set('month', query);
  } else {
    params.set('period', query);
  }

  return adminRequest(`/api/admin/sales?${params.toString()}`);
}