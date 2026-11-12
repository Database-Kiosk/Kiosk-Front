import { useLayoutEffect } from 'react';
import { Outlet, useLocation, useNavigationType, useSearchParams } from 'react-router-dom';
import { useCart } from '../../hooks/useCart.js';
import { useTable } from '../../hooks/useTable.js';
import './customer.css';

// Shared layout for customer routes: /order, /order/cart, /order/confirm, /order/complete
// Validates ?table=N (format, then existence on the server) and passes it, plus the table's cart,
// to child pages via Outlet context. Child pages render only after the table is confirmed.
function OrderLayout() {
  const [searchParams] = useSearchParams();
  const tableParam = searchParams.get('table');
  const tableId = Number(tableParam);
  // Digits only (no "1e2", "0x3", "3.0", " 3", "03"), so one table number has exactly one URL.
  const isValidTable = /^[1-9]\d*$/.test(tableParam ?? '') && Number.isSafeInteger(tableId);

  // Hooks must run unconditionally; an invalid table gets an empty, unsaved cart.
  const cart = useCart(isValidTable ? tableId : null);

  // A well-formed number may still not exist: check it with the server (GET /api/tables/:tableId).
  // Child routes share this layout, so moving between them does not request again.
  const table = useTable(isValidTable ? tableId : null);
  const isTableFound = table.status === 'found';

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
          {isTableFound && <span className="order-header__table">테이블 {tableId}번</span>}
        </div>
      </header>

      <main className="order-main">
        {!isValidTable && (
          <p className="order-error" role="alert">
            테이블 번호가 올바르지 않습니다. 접속 주소를 확인하거나 직원에게 문의해 주세요.
          </p>
        )}

        {table.status === 'loading' && (
          <p className="order-loading" role="status">
            테이블 정보를 확인하고 있습니다…
          </p>
        )}

        {table.status === 'not-found' && (
          <p className="order-error" role="alert">
            해당 테이블을 찾을 수 없습니다. 직원에게 문의해 주세요.
          </p>
        )}

        {table.status === 'error' && (
          <div className="order-error" role="alert">
            <p className="order-error__text">
              테이블 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
            </p>
            <button
              type="button"
              className="order-btn order-btn--secondary order-error__retry"
              onClick={table.retry}
            >
              다시 시도
            </button>
          </div>
        )}

        {isTableFound && <Outlet context={{ tableId, toPath, cart }} />}
      </main>
    </div>
  );
}

export default OrderLayout;
