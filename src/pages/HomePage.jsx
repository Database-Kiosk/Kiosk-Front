import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../config/env.js';

// Development-only guide page listing available routes.
function HomePage() {
  return (
    <main className="page">
      <h1>Kiosk</h1>
      <p>개발용 안내 화면입니다.</p>

      <ul className="route-list">
        <li>
          <Link to="/order?table=3">/order?table=3</Link> — 고객 주문 페이지
        </li>
        <li>
          <Link to="/admin/login">/admin/login</Link> — 관리자 로그인 페이지
        </li>
      </ul>

      <p className="muted">
        API: <code>{API_BASE_URL}</code>
      </p>
    </main>
  );
}

export default HomePage;
