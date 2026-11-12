import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage.jsx';
import OrderLayout from './pages/customer/OrderLayout.jsx';
import OrderPage from './pages/customer/OrderPage.jsx';
import CartPage from './pages/customer/CartPage.jsx';
import OrderConfirmPage from './pages/customer/OrderConfirmPage.jsx';
import OrderCompletePage from './pages/customer/OrderCompletePage.jsx';
import AdminLoginPage from './pages/admin/AdminLoginPage.jsx';
import './App.css';

function App() {
  return (
    <Routes>
      {/* Development guide */}
      <Route path="/" element={<HomePage />} />

      {/* Customer (all routes keep ?table=N) */}
      <Route path="/order" element={<OrderLayout />}>
        <Route index element={<OrderPage />} />
        <Route path="cart" element={<CartPage />} />
        <Route path="confirm" element={<OrderConfirmPage />} />
        <Route path="complete" element={<OrderCompletePage />} />
      </Route>

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
