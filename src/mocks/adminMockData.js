// MOCK data for the admin table / menu / sales screens (Front #9, design only).
// The order screen uses the real API (Front #11); the mock orders below only feed the mock table
// summaries and sales report.
// Field names and status values follow DB/schema.sql (snake_case, Korean ENUM strings, is_active 0/1),
// so the screens can switch to the real API later with few changes.
import { toDbDateTime } from '../utils/dateTime.js';

export const TABLE_STATUSES = ['이용 중', '이용 가능'];

const categories = [
  { category_id: 1, category_name: '식사' },
  { category_id: 2, category_name: '면류' },
  { category_id: 3, category_name: '사이드' },
  { category_id: 4, category_name: '음료' },
  { category_id: 5, category_name: '주류' },
];

const menu = (menu_id, menu_name, price, category_id, description, options = [], is_active = 1) => ({
  menu_id, menu_name, price, category_id, description, image_url: null, is_active, options,
});
const option = (option_id, option_name, additional_price) => ({ option_id, option_name, additional_price });

const menus = [
  menu(1, '김치볶음밥', 9000, 1, '잘 익은 김치로 볶아낸 볶음밥', [option(1, '곱빼기', 2000), option(2, '계란 추가', 1000)]),
  menu(2, '제육덮밥', 10000, 1, '매콤한 제육볶음을 올린 덮밥', [option(3, '밥 추가', 1000)]),
  menu(3, '된장찌개', 8500, 1, '두부와 애호박을 넣은 된장찌개'),
  menu(4, '잔치국수', 7000, 2, '멸치 육수로 끓인 국수', [option(4, '곱빼기', 1500)]),
  menu(5, '치즈스틱', 4500, 3, '모차렐라 치즈스틱 4개'),
  menu(6, '감자튀김', 5000, 3, '바삭한 감자튀김', [option(5, '치즈 소스', 500)]),
  menu(7, '콜라', 2500, 4, '355ml', [option(6, '얼음 많이', 0)]),
  menu(8, '사이다', 2500, 4, '355ml'),
  menu(9, '생맥주', 5000, 5, '500cc', [option(7, '사이즈 업 (1000cc)', 4000)]),
  menu(10, '군만두', 6000, 3, '바삭하게 구운 만두 6개', [], 0),
];

// table_id 1–8. Sessions: [session_id, table_id, started (minutes ago), ended (minutes ago) or null]
const TABLE_COUNT = 8;
const sessions = [
  [1, 1, 200, 120],
  [2, 2, 85, null],
  [3, 3, 50, null],
  [4, 5, 25, null],
  [5, 7, 8, null],
];

// [order_id, session_id, minutes ago, order_status, items: [menu_id, quantity, option_ids]]
const orders = [
  [1, 1, 190, '전달 완료', [[1, 2, [1]], [7, 2, []]]],
  [2, 2, 80, '전달 완료', [[2, 1, [3]], [3, 1, []], [9, 2, []]]],
  [3, 3, 45, '전달 완료', [[4, 2, [4]], [7, 1, [6]]]],
  [4, 2, 35, '조리 중', [[6, 1, [5]], [9, 2, [7]]]],
  [5, 4, 20, '접수', [[5, 1, []], [8, 2, []]]],
  [6, 3, 12, '조리 중', [[1, 1, [1, 2]]]],
  [7, 5, 6, '접수', [[2, 2, []], [3, 1, []], [7, 3, [6]]]],
  [8, 2, 3, '접수', [[5, 1, []]]],
];

/**
 * Builds a fresh copy of the mock data with times relative to `now`.
 * Order prices are computed like Kiosk-Server POST /api/orders:
 * total = Σ (unit_price + Σ extra_price) × quantity.
 */
export function createAdminMockState(now = new Date()) {
  const minutesAgo = (minutes) => toDbDateTime(new Date(now.getTime() - minutes * 60000));
  const menuById = new Map(menus.map((item) => [item.menu_id, item]));
  let nextDetailId = 1;

  const sessionRows = sessions.map(([session_id, table_id, started, ended]) => ({
    session_id,
    table_id,
    started_at: minutesAgo(started),
    ended_at: ended === null ? null : minutesAgo(ended),
  }));
  const tableBySession = new Map(sessionRows.map((session) => [session.session_id, session.table_id]));

  const orderRows = orders.map(([order_id, session_id, ago, order_status, items]) => {
    const orderItems = items.map(([menuId, quantity, optionIds]) => {
      const { menu_name, price, options } = menuById.get(menuId);
      return {
        order_detail_id: nextDetailId++,
        menu_id: menuId,
        menu_name,
        quantity,
        unit_price: price,
        options: options
          .filter((item) => optionIds.includes(item.option_id))
          .map((item) => ({
            option_id: item.option_id,
            option_name: item.option_name,
            extra_price: item.additional_price,
          })),
      };
    });
    const total_price = orderItems.reduce(
      (sum, item) => sum + (item.unit_price + item.options.reduce((a, o) => a + o.extra_price, 0)) * item.quantity,
      0,
    );
    return {
      order_id, session_id, table_id: tableBySession.get(session_id), order_status,
      order_time: minutesAgo(ago), total_price, items: orderItems,
    };
  });

  const openTables = new Set(sessionRows.filter((s) => s.ended_at === null).map((s) => s.table_id));
  const tables = Array.from({ length: TABLE_COUNT }, (_, index) => ({
    table_id: index + 1,
    table_status: openTables.has(index + 1) ? '이용 중' : '이용 가능',
  }));

  return {
    categories: structuredClone(categories),
    menus: structuredClone(menus),
    tables,
    sessions: sessionRows,
    orders: orderRows,
  };
}
