import { Link, useLocation } from 'react-router-dom';
import AdminStateView from './AdminStateView.jsx';
import { describeAdminError } from '../../api/adminApi.js';

// "로그인 화면으로" link. Passes the current page as state.from, so AdminLoginPage returns here after login.
export function AdminLoginLink() {
  const location = useLocation();
  return (
    <Link to="/admin/login" replace state={{ from: location }} className="admin-btn admin-btn--primary">
      로그인 화면으로
    </Link>
  );
}

// Error state for an admin screen whose data failed to load (useAdminData `error`).
// 401 (login expired): message + login link, no retry (retrying would fail the same way).
// Anything else: describeAdminError(error, fallback) + retry button.
function AdminLoadError({ error, fallback, onRetry }) {
  if (error?.status === 401) {
    return (
      <AdminStateView status="error" message={describeAdminError(error)}>
        <AdminLoginLink />
      </AdminStateView>
    );
  }

  return <AdminStateView status="error" message={describeAdminError(error, fallback)} onRetry={onRetry} />;
}

export default AdminLoadError;
