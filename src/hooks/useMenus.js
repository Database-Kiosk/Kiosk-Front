import { useCallback, useEffect, useState } from 'react';
import { fetchCategories, fetchMenus } from '../api/menuApi.js';

/**
 * Loads categories and menus for the customer menu page.
 * @returns {{ status: 'loading'|'success'|'error', categories: Array, menus: Array, retry: () => void }}
 */
export function useMenus() {
  const [reloadCount, setReloadCount] = useState(0);
  // Result of the last finished request, tagged with the request it belongs to.
  const [result, setResult] = useState({ requestId: null, status: 'loading', categories: [], menus: [] });

  useEffect(() => {
    let ignore = false; // page left or retried before the response arrived

    Promise.all([fetchCategories(), fetchMenus()])
      .then(([categories, menus]) => {
        if (ignore) return;
        if (!Array.isArray(categories) || !Array.isArray(menus)) {
          setResult({ requestId: reloadCount, status: 'error', categories: [], menus: [] });
          return;
        }
        setResult({ requestId: reloadCount, status: 'success', categories, menus });
      })
      .catch(() => {
        if (!ignore) setResult({ requestId: reloadCount, status: 'error', categories: [], menus: [] });
      });

    return () => {
      ignore = true;
    };
  }, [reloadCount]);

  const retry = useCallback(() => setReloadCount((count) => count + 1), []);

  // Until the current request finishes, the previous result does not apply.
  const isCurrent = result.requestId === reloadCount;

  return {
    status: isCurrent ? result.status : 'loading',
    categories: isCurrent ? result.categories : [],
    menus: isCurrent ? result.menus : [],
    retry,
  };
}
