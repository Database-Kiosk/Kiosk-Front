import { NavLink } from 'react-router-dom';
import './AdminSidebar.css';

// Inline SVG icons (no icon library). Paths use currentColor, so they follow the link color.
const ICON_PATHS = {
  orders: 'M6 3h12v18l-3-2-3 2-3-2-3 2V3zM9 8h6M9 12h6M9 16h4',
  tables: 'M3 9h18M5 9v10M19 9v10M7 5h10l2 4H5l2-4z',
  menus: 'M4 5h16M4 12h16M4 19h10',
  sales: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  logout: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10',
};

function Icon({ name }) {
  return (
    <svg className="admin-sidebar__icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d={ICON_PATHS[name]} />
    </svg>
  );
}

const NAV_ITEMS = [
  { to: '/admin/orders', label: '주문 관리', icon: 'orders' },
  { to: '/admin/tables', label: '테이블 관리', icon: 'tables' },
  { to: '/admin/menus', label: '메뉴 관리', icon: 'menus' },
  { to: '/admin/sales', label: '매출 조회', icon: 'sales' },
];

// PC: full sidebar with labels. Tablet: narrow rail. Small screens: top bar (see AdminSidebar.css).
// adminId: the logged-in admin (from GET /api/admin/me). Logout itself is handled by AdminLayout.
function AdminSidebar({ adminId, onLogout, isLoggingOut }) {
  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar__brand">
        <span className="admin-sidebar__logo" aria-hidden="true">K</span>
        <span className="admin-sidebar__brand-text">Kiosk 관리자</span>
      </div>

      <nav className="admin-sidebar__nav" aria-label="관리자 메뉴">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `admin-sidebar__link${isActive ? ' is-active' : ''}`}
          >
            <Icon name={item.icon} />
            <span className="admin-sidebar__label">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="admin-sidebar__footer">
        <p className="admin-sidebar__account" title={adminId}>
          {adminId}
          <span className="admin-sidebar__account-note">로그인 계정</span>
        </p>
        <button
          type="button"
          className="admin-sidebar__link admin-sidebar__logout"
          onClick={onLogout}
          disabled={isLoggingOut}
        >
          <Icon name="logout" />
          <span className="admin-sidebar__label">{isLoggingOut ? '로그아웃 중…' : '로그아웃'}</span>
        </button>
      </div>
    </aside>
  );
}

export default AdminSidebar;
