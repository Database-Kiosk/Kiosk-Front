import { API_BASE_URL } from '../config/env.js';

// Kiosk-Server customer menu API (only menus on sale are returned).
// GET /api/categories → 200: [{ category_id, category_name }]  (only categories with a menu on sale)
// GET /api/menus      → 200: [{ menu_id, menu_name, price, category_id, description, image_url, is_active,
//                               options: [{ option_id, option_name, additional_price }] }]
// Errors: { message }. Non-2xx responses throw an Error with `status`; network errors throw as fetch does.
async function getJson(path) {
  const response = await fetch(`${API_BASE_URL}${path}`);

  if (!response.ok) {
    const error = new Error(`Menu request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }

  return response.json();
}

// The server stores images in its own folder and returns paths like "/uploads/...".
// Resolve them against the API server (not this page's origin). Full URLs stay as they are; null stays null.
function resolveImageUrl(imageUrl) {
  if (typeof imageUrl !== 'string' || imageUrl === '') return null;
  try {
    return new URL(imageUrl, API_BASE_URL).href;
  } catch {
    return imageUrl; // API_BASE_URL is not an absolute URL: leave the value unchanged
  }
}

// is_active may come as 1/0 (MySQL TINYINT) or true/false.
// Normalize to 1/0 here so every `is_active === 1` check in the UI keeps working.
function normalizeMenu(menu) {
  return {
    ...menu,
    image_url: resolveImageUrl(menu.image_url),
    is_active: menu.is_active === 1 || menu.is_active === true ? 1 : 0,
  };
}

export async function fetchCategories() {
  return getJson('/api/categories');
}

// A non-array body is returned as is; useMenus treats it as an error.
export async function fetchMenus() {
  const menus = await getJson('/api/menus');
  return Array.isArray(menus) ? menus.map(normalizeMenu) : menus;
}
