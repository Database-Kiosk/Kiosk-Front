// MOCK sales data for the admin sales screen (Front #9, design only).
// Sales basis for this design: the sum of all order totals (orders.total_price), whatever the status.
// The real rule is decided when the backend sales API is built.
import { toDbDate } from '../utils/dateTime.js';

// Small seeded random generator, so the generated past days look the same on every load.
function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const dayKey = (now, daysAgo) => toDbDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo));

/**
 * Past 29 days (yesterday and before) of generated sales per menu. Today comes from the mock orders.
 * @returns {{ date: string, order_count: number, items: { menu_id, quantity, sales }[] }[]}
 */
export function createPastSales(menus, now = new Date()) {
  return Array.from({ length: 29 }, (_, index) => {
    const date = dayKey(now, index + 1);
    const random = seededRandom(Number(date.replaceAll('-', '')));
    const weekend = [0, 6].includes(new Date(`${date}T00:00:00`).getDay());
    const items = menus
      .map((menu) => {
        const quantity = Math.floor(random() * (weekend ? 9 : 6));
        return { menu_id: menu.menu_id, quantity, sales: quantity * menu.price };
      })
      .filter((item) => item.quantity > 0);
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    return { date, order_count: Math.ceil(totalQuantity / 2.6), items };
  });
}

/**
 * Sales of the last `days` days (today included).
 * @returns {{ summary, daily: { date, order_count, total_sales }[], menus: { menu_id, menu_name,
 *   category_name, quantity, total_sales }[] }}
 */
export function buildSalesReport({ menus, categories, orders, pastSales }, days, now = new Date()) {
  const daily = new Map(
    Array.from({ length: days }, (_, index) => {
      const date = dayKey(now, index);
      return [date, { date, order_count: 0, total_sales: 0 }];
    }),
  );
  const byMenu = new Map();
  const addMenuSales = (menuId, quantity, sales) => {
    const row = byMenu.get(menuId) ?? { menu_id: menuId, quantity: 0, total_sales: 0 };
    row.quantity += quantity;
    row.total_sales += sales;
    byMenu.set(menuId, row);
  };

  for (const day of pastSales) {
    const row = daily.get(day.date);
    if (!row) continue;
    row.order_count += day.order_count;
    day.items.forEach((item) => {
      row.total_sales += item.sales;
      addMenuSales(item.menu_id, item.quantity, item.sales);
    });
  }

  for (const order of orders) {
    const row = daily.get(order.order_time.slice(0, 10));
    if (!row) continue;
    row.order_count += 1;
    row.total_sales += order.total_price;
    order.items.forEach((item) => {
      const unitTotal = item.options.reduce((sum, option) => sum + option.extra_price, item.unit_price);
      addMenuSales(item.menu_id, item.quantity, unitTotal * item.quantity);
    });
  }

  const menuById = new Map(menus.map((menu) => [menu.menu_id, menu]));
  const categoryById = new Map(categories.map((category) => [category.category_id, category.category_name]));
  const menuRows = [...byMenu.values()]
    .map((row) => {
      const menu = menuById.get(row.menu_id);
      return {
        ...row,
        menu_name: menu?.menu_name ?? `메뉴 #${row.menu_id}`,
        category_name: categoryById.get(menu?.category_id) ?? '-',
      };
    })
    .sort((a, b) => b.total_sales - a.total_sales || a.menu_id - b.menu_id);

  const dailyRows = [...daily.values()];
  const totalSales = dailyRows.reduce((sum, row) => sum + row.total_sales, 0);
  const orderCount = dailyRows.reduce((sum, row) => sum + row.order_count, 0);

  return {
    summary: {
      total_sales: totalSales,
      order_count: orderCount,
      average_order_price: orderCount > 0 ? Math.round(totalSales / orderCount) : 0,
      quantity: menuRows.reduce((sum, row) => sum + row.quantity, 0),
    },
    daily: dailyRows,
    menus: menuRows,
  };
}
