import { useLayoutEffect } from 'react';
import { Outlet, useLocation, useNavigationType, useSearchParams } from 'react-router-dom';
import { useCart } from '../../hooks/useCart.js';
import './customer.css';

// Shared layout for customer routes: /order, /order/cart, /order/confirm, /order/complete
// Validates ?table=N once and passes it, plus the table's cart, to child pages via Outlet context.
function OrderLayout() {
  const [searchParams] = useSearchParams();
  const tableParam = searchParams.get('table');
  const tableId = Number(tableParam);
  // Digits only (no "1e2", "0x3", "3.0", " 3", "03"), so one table number has exactly one URL.
  const isValidTable = /^[1-9]\d*$/.test(tableParam ?? '') && Number.isSafeInteger(tableId);

  // Hooks must run unconditionally; an invalid table gets an empty, unsaved cart.
  const cart = useCart(isValidTable ? tableId : null);

  // New page (menu → cart → confirm → complete): start at the top instead of keeping the
  // previous page's scroll position. Back/Forward (POP) keeps the browser's scroll restoration.
  const { pathname } = useLocation();
  const navigationType = useNavigationType();
  useLayoutEffect(() => {
    if (navigationType !== 'POP') window.scrollTo(0, 0);
  }, [pathname, navigationType]);

  // Builds a customer path that keeps the table number, e.g. toPath('/order/cart') -> '/order/cart?table=3'
  const toPath = (path) => `${path}?table=${tableId}`;

  return (
    <div className="order-layout">
      <header className="order-header">
        <div className="order-header__inner">
          <span className="order-header__title">주문하기</span>
          {isValidTable && <span className="order-header__table">테이블 {tableId}번</span>}
        </div>
      </header>

      <main className="order-main">
        {isValidTable ? (
          <Outlet context={{ tableId, toPath, cart }} />
        ) : (
          <p className="order-error">테이블 번호가 올바르지 않습니다. QR 코드를 다시 확인해 주세요.</p>
        )}
      </main>
    </div>
  );
}

export default OrderLayout;
