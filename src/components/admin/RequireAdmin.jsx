import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { fetchAdminMe } from '../../api/adminAuthApi.js';
import AdminStateView from './AdminStateView.jsx';
import '../../pages/admin/admin.css';

// Access control for every /admin page except /admin/login.
// Checks the login once when the admin area is entered (GET /api/admin/me); moving between admin pages
// keeps this component mounted, so it does not check again.
// - checking: loading screen
// - 401: to /admin/login, remembering the page that was requested (location.state.from)
// - server or network error: retry screen (the admin may still be logged in, so no redirect)
// - logged in: renders the admin layout with { adminId } as outlet context
function RequireAdmin() {
  const location = useLocation();
  const [attempt, setAttempt] = useState(0);
  // Result of the last finished check, tagged with its attempt (same pattern as useAdminData).
  const [result, setResult] = useState({ attempt: null, status: 'checking', adminId: null });

  useEffect(() => {
    const controller = new AbortController();

    fetchAdminMe({ signal: controller.signal })
      .then((me) => {
        if (typeof me?.adminId !== 'string') throw new Error('Unexpected /api/admin/me response');
        setResult({ attempt, status: 'ok', adminId: me.adminId });
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setResult({ attempt, status: error.status === 401 ? 'unauthorized' : 'error', adminId: null });
      });

    return () => controller.abort();
  }, [attempt]);

  const status = result.attempt === attempt ? result.status : 'checking';

  if (status === 'unauthorized') {
    return <Navigate to="/admin/login" replace state={{ from: location }} />;
  }

  if (status === 'ok') {
    return <Outlet context={{ adminId: result.adminId }} />;
  }

  return (
    <main className="admin-scope admin-guard">
      {status === 'checking' ? (
        <AdminStateView status="loading" message="로그인 상태를 확인하고 있습니다…" />
      ) : (
        <AdminStateView
          status="error"
          message="로그인 상태를 확인하지 못했습니다. 서버 연결을 확인한 뒤 다시 시도해 주세요."
          onRetry={() => setAttempt((count) => count + 1)}
        />
      )}
    </main>
  );
}

export default RequireAdmin;
