import { useLayoutEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate, useOutletContext } from 'react-router-dom';
import { logoutAdmin } from '../../api/adminAuthApi.js';
import AdminSidebar from '../../components/admin/AdminSidebar.jsx';
import './admin.css';

// Shared layout for /admin/orders, /admin/tables, /admin/menus, /admin/sales.
// Rendered by RequireAdmin only after the login was confirmed; { adminId } comes from its outlet context.
// Login, logout and the order screen use the real Kiosk-Server API; the table, menu and sales screens'
// data is still mock (api/adminApi.js).
function AdminLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { adminId } = useOutletContext();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');

  // A new admin screen starts at the top.
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  // On failure the cookie may still be valid, so the admin stays on this screen and sees an error
  // (moving to the login page would log them straight back in).
  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    setLogoutError('');
    try {
      await logoutAdmin();
      navigate('/admin/login', { replace: true });
    } catch (error) {
      setLogoutError(
        error.status
          ? '로그아웃하지 못했습니다. 잠시 후 다시 시도해 주세요.'
          : '서버에 연결하지 못해 로그아웃하지 못했습니다. 네트워크 상태를 확인한 뒤 다시 시도해 주세요.',
      );
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="admin-scope admin-layout">
      <AdminSidebar adminId={adminId} onLogout={handleLogout} isLoggingOut={isLoggingOut} />

      <div className="admin-body">
        <p className="admin-dev-banner" role="note">
          <strong>개발용 화면</strong> · 주문 관리는 실제 서버 데이터를 사용합니다. 테이블·메뉴·매출 화면은 mock
          데이터이며, 이용 완료 처리·메뉴 저장은 서버에 저장되지 않고 새로고침하면 처음 상태로 돌아갑니다.
        </p>

        {logoutError && <p className="admin-alert admin-layout__alert" role="alert">{logoutError}</p>}

        <main className="admin-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;
