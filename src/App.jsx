import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage.jsx';
import OrderPage from './pages/customer/OrderPage.jsx';
import AdminLoginPage from './pages/admin/AdminLoginPage.jsx';
import './App.css';

function App() {
  return (
    <Routes>
      {/* Development guide */}
      <Route path="/" element={<HomePage />} />

      {/* Customer */}
      <Route path="/order" element={<OrderPage />} />

      {/* Admin */}
      <Route path="/admin/login" element={<AdminLoginPage />} />

      <Route
        path="*"
        element={
          <main className="page">
            <h1>404</h1>
            <p>페이지를 찾을 수 없습니다.</p>
          </main>
        }
      />
    </Routes>
  );
}

export default App;
