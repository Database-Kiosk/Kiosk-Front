import { useLayoutEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import AdminSidebar from '../../components/admin/AdminSidebar.jsx';
import './admin.css';

// Shared layout for /admin/orders, /admin/tables, /admin/menus, /admin/sales.
// Front #9 is a design issue: there is no access control yet (real login and route guard come in a
// later issue), and every screen runs on mock data (api/adminApi.js).
function AdminLayout() {
  const { pathname } = useLocation();

  // A new admin screen starts at the top.
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="admin-scope admin-layout">
      <AdminSidebar />

      <div className="admin-body">
        <p className="admin-dev-banner" role="note">
          <strong>개발용 화면</strong> · mock 데이터를 사용합니다. 상태 변경·메뉴 저장은 서버에 저장되지 않으며,
          새로고침하면 처음 상태로 돌아갑니다.
        </p>

        <main className="admin-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;
