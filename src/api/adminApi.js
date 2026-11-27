// Admin screen data: orders, tables, menus and sales from the real Kiosk-Server API.
// Every request goes through adminRequest (adminAuthApi.js), which sends the admin login cookie and
// uses the same timeout and errors as login. Login/logout live in adminAuthApi.js.
import { adminRequest } from './adminAuthApi.js';

/* ---------- Orders ---------- */

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

// No menu_id: POST /api/admin/menus (multipart: `data` = menu JSON, optional `image` file).
// With menu_id: PATCH /api/admin/menus/:menuId (JSON: menu fields and the existing options only;
// is_active and the image are not sent — the server does not accept them on this route).
// Both resolve with the saved menu returned by the server.
export function saveMenu(menu, imageFile = null) {
  if (menu.menu_id != null) {
    const path = `/api/admin/menus/${encodeURIComponent(menu.menu_id)}`;
    const menuData = {
      menu_name: menu.menu_name,
      price: menu.price,
      category_id: menu.category_id,
      description: menu.description,
      options: menu.options.map((option) => ({
        option_id: option.option_id,
        option_name: option.option_name,
        additional_price: option.additional_price,
      })),
    };

    if (!imageFile) {
      return adminRequest(path, {
        method: 'PATCH',
        body: menuData,
      });
    }

    const formData = new FormData();
    formData.append('data', JSON.stringify(menuData));
    formData.append('image', imageFile);

    return adminRequest(path, {
      method: 'PATCH',
      body: formData,
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

// query: 'today' | 'week' | 'month' (sent as ?period=) or 'YYYY-MM' (sent as ?month=)
export function fetchSalesReport(query = 'today') {
  const params = new URLSearchParams();

  if (/^\d{4}-\d{2}$/.test(query)) {
    params.set('month', query);
  } else {
    params.set('period', query);
  }

  return adminRequest(`/api/admin/sales?${params.toString()}`);
}