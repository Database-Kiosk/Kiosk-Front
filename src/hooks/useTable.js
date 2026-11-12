import { useCallback, useEffect, useState } from 'react';
import { fetchTable } from '../api/tableApi.js';

/**
 * Checks that a table exists on the server.
 * @param {number|null} tableId valid table number, or null to skip the request
 * @returns {{ status: 'idle'|'loading'|'found'|'not-found'|'error', retry: () => void }}
 */
export function useTable(tableId) {
  const [reloadCount, setReloadCount] = useState(0);
  // Result of the last finished request, tagged with the request it belongs to.
  const [result, setResult] = useState({ requestKey: null, status: 'idle' });
  const requestKey = tableId === null ? null : `${tableId}:${reloadCount}`;

  useEffect(() => {
    if (tableId === null) return undefined;

    const controller = new AbortController();
    const key = `${tableId}:${reloadCount}`;

    fetchTable(tableId, { signal: controller.signal })
      .then((table) => {
        // Unexpected response body: treat as a server error.
        const status = table?.table_id === tableId ? 'found' : 'error';
        setResult({ requestKey: key, status });
      })
      .catch((error) => {
        if (controller.signal.aborted) return; // table changed or page left
        // 400 cannot normally happen (the number is validated first), so it is treated like 404.
        const status = error.status === 404 || error.status === 400 ? 'not-found' : 'error';
        setResult({ requestKey: key, status });
      });

    return () => controller.abort();
  }, [tableId, reloadCount]);

  const retry = useCallback(() => setReloadCount((count) => count + 1), []);

  // Until the current request finishes, the previous result does not apply.
  let status = 'idle';
  if (requestKey !== null) status = result.requestKey === requestKey ? result.status : 'loading';

  return { status, retry };
}
