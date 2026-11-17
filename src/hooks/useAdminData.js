import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Loads data for an admin screen (same pattern as useMenus: the latest request wins).
 * @param {(arg?: any) => Promise<any>} load stable function from api/adminApi.js
 * @param {any} [arg] passed to `load`; a new value starts a new request (e.g. sales period)
 * @returns {{ status: 'loading'|'success'|'error', data: any, retry: () => void,
 *   setData: (updater: (data: any) => any) => void }}
 */
export function useAdminData(load, arg) {
  const [reloadCount, setReloadCount] = useState(0);
  // Result of the last finished request, tagged with the request it belongs to.
  const [result, setResult] = useState({ requestKey: null, status: 'loading', data: null });
  const requestKey = `${String(arg)}:${reloadCount}`;
  // Counts local changes (setData). A load that was in flight while a change was saved may hold data
  // read before that change (real API), so its result is not shown and the data is loaded again.
  const changeCount = useRef(0);

  useEffect(() => {
    let ignore = false; // page left, argument changed or retried before the response arrived
    const changesAtStart = changeCount.current;

    load(arg)
      .then((data) => {
        if (ignore) return;
        if (changeCount.current !== changesAtStart) {
          setReloadCount((count) => count + 1);
          return;
        }
        setResult({ requestKey, status: 'success', data });
      })
      .catch(() => {
        if (!ignore) setResult({ requestKey, status: 'error', data: null });
      });

    return () => {
      ignore = true;
    };
  }, [load, arg, requestKey]);

  const retry = useCallback(() => setReloadCount((count) => count + 1), []);

  // Local update after a change (e.g. new order status), without loading again.
  const setData = useCallback((updater) => {
    changeCount.current += 1;
    // Only a successful result has data to update (after a failed reload, data is null).
    setResult((previous) => (previous.status === 'success' ? { ...previous, data: updater(previous.data) } : previous));
  }, []);

  // Until the current request finishes, the previous result does not apply.
  const status = result.requestKey === requestKey ? result.status : 'loading';

  return { status, data: status === 'success' ? result.data : null, retry, setData };
}
