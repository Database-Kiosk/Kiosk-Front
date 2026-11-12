// ============================================================================
// TEMPORARY (issue #4): the backend has NO category/menu API yet.
// These functions return mock data from src/mocks/menuData.js. NO request is sent.
//
// When the backend API spec is confirmed:
//   1. Replace ONLY the bodies of fetchCategories / fetchMenus with fetch(`${API_BASE_URL}/...`)
//      (import API_BASE_URL from '../config/env.js', like tableApi.js). Paths/response shape are
//      NOT decided yet - do not guess them.
//   2. Keep the return shape below (DB column names) so pages/hooks do not change:
//      category: { category_id, category_name }
//      menu:     { menu_id, menu_name, price, category_id, description, image_url, is_active, options }
//      option:   { option_id, option_name, additional_price }
//   3. Remove the mock import.
// ============================================================================
import { categories, menus } from '../mocks/menuData.js';

// is_active may come as 1/0 (MySQL TINYINT) or true/false depending on the final API.
// Normalize to 1/0 here so every `is_active === 1` check in the UI keeps working.
function normalizeMenu(menu) {
  return { ...menu, is_active: menu.is_active === 1 || menu.is_active === true ? 1 : 0 };
}

// TEMPORARY: mock data (no API call)
export async function fetchCategories() {
  return categories.map((category) => ({ ...category }));
}

// TEMPORARY: mock data (no API call). Returns all menus, including inactive ones;
// the customer page shows only is_active === 1.
export async function fetchMenus() {
  return menus.map(normalizeMenu);
}
