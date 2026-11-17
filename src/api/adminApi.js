// Admin screen data — MOCK ONLY (Front #9, design issue).
// Nothing here sends a request to Kiosk-Server and nothing is saved: changes live in this module's
// memory and are lost on a page reload. Each function keeps the shape a real API call would have
// (async, snake_case fields, Error with `status`), so only the function bodies change when the
// admin APIs are built.
//
// Dev only: add ?preview=loading|empty|error to an admin URL to check those screen states.
import { createAdminMockState, ORDER_STATUSES } from '../mocks/adminMockData.js';
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
let mockAdminId = null;

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

/* ---------- Login (MOCK: no real authentication) ---------- */

// Real API for later: POST /api/admin/login { adminId, password } → cookie. Here any input is accepted.
export function mockAdminLogin({ adminId }) {
  return respond(() => {
    mockAdminId = adminId;
    return { adminId };
  });
}

export function mockAdminLogout() {
  mockAdminId = null;
}

export const getMockAdminId = () => mockAdminId;

/* ---------- Orders ---------- */

// All mock orders, newest first.
export function fetchAdminOrders() {
  return respond(() => [...state.orders].sort((a, b) => b.order_id - a.order_id), []);
}

export function updateOrderStatus(orderId, nextStatus) {
  return respond(() => {
    const order = state.orders.find((item) => item.order_id === orderId);
    if (!order) throw mockError('존재하지 않는 주문입니다.', 404);
    // Status only moves forward: 접수 → 조리 중 → 전달 완료
    if (ORDER_STATUSES.indexOf(nextStatus) !== ORDER_STATUSES.indexOf(order.order_status) + 1) {
      throw mockError('변경할 수 없는 주문 상태입니다.', 409);
    }
    order.order_status = nextStatus;
    return order;
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
  return respond(() => state.tables.map(summarizeTable), []);
}

// Ends the open session and makes the table available (MOCK).
// Design-only policy: allowed even when some orders are not delivered yet (the screen only warns).
// The real server needs its own decision here (e.g. reject with 409 while orders are pending, or allow
// it), and must end the session and update dining_table.table_status in one transaction.
export function closeTableSession(tableId) {
  return respond(() => {
    const table = state.tables.find((item) => item.table_id === tableId);
    const session = state.sessions.find((item) => item.table_id === tableId && item.ended_at === null);
    if (!table || !session) throw mockError('이용 중인 테이블이 아닙니다.', 409);
    session.ended_at = toDbDateTime(new Date());
    table.table_status = '이용 가능';
    return summarizeTable(table);
  });
}

/* ---------- Menus ---------- */

export function fetchAdminMenus() {
  return respond(
    () => ({ categories: state.categories, menus: state.menus }),
    { categories: state.categories, menus: [] },
  );
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
export function saveMenu(menu) {
  return respond(() => {
    let optionId = nextId(state.menus.flatMap((item) => item.options), 'option_id');
    const options = menu.options.map((item) => ({ ...item, option_id: item.option_id ?? optionId++ }));
    if (menu.menu_id == null) {
      const created = { ...menu, menu_id: nextId(state.menus, 'menu_id'), image_url: null, options };
      state.menus.push(created);
      return created;
    }
    const index = state.menus.findIndex((item) => item.menu_id === menu.menu_id);
    if (index === -1) throw mockError('존재하지 않는 메뉴입니다.', 404);
    state.menus[index] = { ...state.menus[index], ...menu, options };
    return state.menus[index];
  });
}

export function setMenuActive(menuId, isActive) {
  return respond(() => {
    const menu = state.menus.find((item) => item.menu_id === menuId);
    if (!menu) throw mockError('존재하지 않는 메뉴입니다.', 404);
    menu.is_active = isActive ? 1 : 0;
    return menu;
  });
}

/* ---------- Sales ---------- */

// period: 'today' | 'week' | 'month'
export function fetchSalesReport(period) {
  const days = SALES_PERIOD_DAYS[period] ?? 1;
  return respond(
    () => buildSalesReport(state, days),
    buildSalesReport({ ...state, orders: [], pastSales: [] }, days),
  );
}
