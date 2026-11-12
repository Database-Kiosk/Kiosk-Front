import { useCallback, useEffect, useMemo, useReducer } from 'react';

// Customer cart state for one table.
// - useReducer for state, sessionStorage ("kiosk-cart-table-{tableId}") so a refresh keeps the cart.
// - All prices are plain numbers here; format only when rendering (formatPrice).
// - Prices are a client-side snapshot for display. The real order total must be computed by the server.

export const MAX_QUANTITY = 99;

const STORAGE_KEY_PREFIX = 'kiosk-cart-table-';

/* ---------- validation helpers ---------- */

const isPositiveInt = (value) => Number.isInteger(value) && value > 0;
const isNonNegativeInt = (value) => Number.isInteger(value) && value >= 0;
const isValidQuantity = (value) => isPositiveInt(value) && value <= MAX_QUANTITY;
const clampQuantity = (value) => Math.min(value, MAX_QUANTITY);

// Cart item key: menu_id + sorted option_ids, e.g. "1:1,3" or "6:" (no options)
function makeCartKey(menuId, options) {
  const optionIds = options.map((option) => option.option_id).sort((a, b) => a - b);
  return `${menuId}:${optionIds.join(',')}`;
}

// Returns a clean option list (valid fields, no duplicate option_id), or null if any option is invalid.
function sanitizeOptions(options) {
  if (!Array.isArray(options)) return null;
  const seen = new Set();
  const result = [];
  for (const option of options) {
    if (
      !option ||
      !isPositiveInt(option.option_id) ||
      typeof option.option_name !== 'string' ||
      !isNonNegativeInt(option.additional_price)
    ) {
      return null;
    }
    if (seen.has(option.option_id)) continue;
    seen.add(option.option_id);
    result.push({
      option_id: option.option_id,
      option_name: option.option_name,
      additional_price: option.additional_price,
    });
  }
  return result.sort((a, b) => a.option_id - b.option_id);
}

// Returns a clean cart item, or null if the data is invalid.
function sanitizeCartItem(raw) {
  if (
    !raw ||
    !isPositiveInt(raw.menu_id) ||
    typeof raw.menu_name !== 'string' ||
    !isNonNegativeInt(raw.price) ||
    !isPositiveInt(raw.quantity)
  ) {
    return null;
  }
  const options = sanitizeOptions(raw.options ?? []);
  if (!options) return null;

  return {
    key: makeCartKey(raw.menu_id, options),
    menu_id: raw.menu_id,
    menu_name: raw.menu_name,
    price: raw.price,
    image_url: typeof raw.image_url === 'string' ? raw.image_url : null,
    options,
    quantity: clampQuantity(raw.quantity),
  };
}

// Adds an item to the list; the same key merges into the existing item's quantity.
function mergeItem(items, item) {
  const index = items.findIndex((existing) => existing.key === item.key);
  if (index === -1) return [...items, item];
  return items.map((existing, i) =>
    i === index ? { ...existing, quantity: clampQuantity(existing.quantity + item.quantity) } : existing,
  );
}

/* ---------- price helpers (numbers only) ---------- */

// 메뉴 1개 가격 = 기본 가격 + 선택 옵션 가격 합계
export function getUnitPrice(item) {
  return item.price + item.options.reduce((sum, option) => sum + option.additional_price, 0);
}

// 항목별 금액 = 1개 가격 × 수량
export function getLineTotal(item) {
  return getUnitPrice(item) * item.quantity;
}

/**
 * Builds a cart item from a menu (mock/API shape) and the selected option ids.
 * Option data is taken from menu.options, so unknown or duplicate ids are ignored.
 * Returns null if the menu is inactive (is_active !== 1) or the input is invalid.
 */
export function createCartItem(menu, selectedOptionIds = [], quantity = 1) {
  if (!menu || menu.is_active !== 1 || !isValidQuantity(quantity)) return null;

  const selected = new Set(selectedOptionIds);
  const options = (menu.options ?? []).filter((option) => selected.has(option.option_id));

  return sanitizeCartItem({ ...menu, options, quantity });
}

/* ---------- sessionStorage ---------- */

const storageKey = (tableId) => `${STORAGE_KEY_PREFIX}${tableId}`;

// Reads the saved cart. Missing, broken or inaccessible storage -> empty cart.
export function loadCart(tableId) {
  if (!isPositiveInt(tableId)) return [];
  try {
    const saved = window.sessionStorage.getItem(storageKey(tableId));
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(sanitizeCartItem).filter(Boolean).reduce(mergeItem, []);
  } catch {
    return [];
  }
}

// Saves the cart. Storage errors (private mode, quota, blocked) are ignored; the cart still works in memory.
export function saveCart(tableId, items) {
  if (!isPositiveInt(tableId)) return;
  try {
    if (items.length === 0) {
      window.sessionStorage.removeItem(storageKey(tableId));
    } else {
      window.sessionStorage.setItem(storageKey(tableId), JSON.stringify(items));
    }
  } catch {
    // ignore
  }
}

/* ---------- reducer ---------- */

// state: { tableId, items }
export function cartReducer(state, action) {
  switch (action.type) {
    case 'LOAD':
      return { tableId: action.tableId, items: action.items };

    case 'ADD': {
      const item = sanitizeCartItem(action.item);
      if (!item) return state;
      return { ...state, items: mergeItem(state.items, item) };
    }

    case 'UPDATE_QTY': {
      if (!isPositiveInt(action.quantity)) return state;
      const quantity = clampQuantity(action.quantity);
      return {
        ...state,
        items: state.items.map((item) => (item.key === action.key ? { ...item, quantity } : item)),
      };
    }

    case 'REMOVE':
      return { ...state, items: state.items.filter((item) => item.key !== action.key) };

    case 'CLEAR':
      return { ...state, items: [] };

    default:
      return state;
  }
}

function initCart(tableId) {
  return { tableId, items: loadCart(tableId) };
}

/* ---------- hook ---------- */

/**
 * @param {number|null} tableId valid table number, or null when the table is invalid
 */
export function useCart(tableId) {
  const [state, dispatch] = useReducer(cartReducer, tableId, initCart);

  // Table number changed (e.g. ?table=3 -> ?table=5): load that table's cart.
  // Updating state during render is React's recommended way to reset state on a prop change.
  const isCurrentTable = state.tableId === tableId;
  if (!isCurrentTable) {
    dispatch({ type: 'LOAD', tableId, items: loadCart(tableId) });
  }

  // Save whenever items change. Uses state.tableId so one table's items never go to another table's key.
  useEffect(() => {
    saveCart(state.tableId, state.items);
  }, [state]);

  const items = isCurrentTable ? state.items : [];

  const { totalCount, totalPrice } = useMemo(
    () =>
      items.reduce(
        (totals, item) => ({
          totalCount: totals.totalCount + item.quantity,
          totalPrice: totals.totalPrice + getLineTotal(item),
        }),
        { totalCount: 0, totalPrice: 0 },
      ),
    [items],
  );

  // Returns true if added, false if the menu is inactive or the input is invalid.
  const addItem = useCallback((menu, selectedOptionIds, quantity) => {
    const item = createCartItem(menu, selectedOptionIds, quantity);
    if (!item) return false;
    dispatch({ type: 'ADD', item });
    return true;
  }, []);

  const updateQuantity = useCallback((key, quantity) => {
    dispatch({ type: 'UPDATE_QTY', key, quantity });
  }, []);

  const removeItem = useCallback((key) => {
    dispatch({ type: 'REMOVE', key });
  }, []);

  const clearCart = useCallback(() => {
    dispatch({ type: 'CLEAR' });
  }, []);

  return { items, totalCount, totalPrice, addItem, updateQuantity, removeItem, clearCart };
}
