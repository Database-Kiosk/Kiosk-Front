import { Navigate, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage.jsx';
import OrderLayout from './pages/customer/OrderLayout.jsx';
import OrderPage from './pages/customer/OrderPage.jsx';
import CartPage from './pages/customer/CartPage.jsx';
import OrderConfirmPage from './pages/customer/OrderConfirmPage.jsx';
import PaymentPage from './pages/customer/PaymentPage.jsx';
import OrderCompletePage from './pages/customer/OrderCompletePage.jsx';
import AdminLoginPage from './pages/admin/AdminLoginPage.jsx';
import AdminLayout from './pages/admin/AdminLayout.jsx';
import AdminOrdersPage from './pages/admin/AdminOrdersPage.jsx';
import AdminTablesPage from './pages/admin/AdminTablesPage.jsx';
import AdminMenusPage from './pages/admin/AdminMenusPage.jsx';
import AdminSalesPage from './pages/admin/AdminSalesPage.jsx';
import OrderHistoryPage from './pages/customer/OrderHistoryPage.jsx';
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
        <Route path="payment" element={<PaymentPage />} />
        <Route path="complete" element={<OrderCompletePage />} />
        <Route path="history" element={<OrderHistoryPage />} />
      </Route>

      {/* Admin (Front #9: design with mock data, no access control yet) */}
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Navigate to="/admin/orders" replace />} />
        <Route path="orders" element={<AdminOrdersPage />} />
        <Route path="tables" element={<AdminTablesPage />} />
        <Route path="menus" element={<AdminMenusPage />} />
        <Route path="sales" element={<AdminSalesPage />} />
      </Route>

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
