import { useRef } from 'react';
import { Link, Navigate, useNavigate, useOutletContext } from 'react-router-dom';
import CartItem from '../../components/customer/CartItem.jsx';
import BottomActionBar from '../../components/customer/BottomActionBar.jsx';
import PendingOrderNotice from '../../components/customer/PendingOrderNotice.jsx';
import { MAX_ORDER_LINES } from '../../api/orderApi.js';
import { usePendingOrder } from '../../hooks/usePendingOrder.js';
import { formatPrice } from '../../utils/format.js';

// Customer order confirm page. Entry URL: /order/confirm?table={tableId}
// Read-only review of the cart (menus, options, quantities, total); editing happens on the cart page.
// "결제하기" opens the mock payment page, which creates the order.
function OrderConfirmPage() {
  const { tableId, toPath, cart } = useOutletContext();
  const navigate = useNavigate();
  const pendingOrder = usePendingOrder(tableId);
  // A double click must open the payment page once (one history entry).
  const navigatingRef = useRef(false);
  // The server accepts at most MAX_ORDER_LINES lines per order.
  const extraLines = cart.items.length - MAX_ORDER_LINES;
  const isOverLimit = extraLines > 0;
  // A previous order request is running or its result is unknown: no new payment.
  const isBlocked = pendingOrder.status !== 'none';

  function goToPayment() {
    if (navigatingRef.current || isOverLimit || isBlocked) return;
    navigatingRef.current = true;
    navigate(toPath('/order/payment'), { state: { fromConfirm: true } });
  }

  // Empty cart (e.g. typed URL): nothing to confirm. The cart is restored synchronously from
  // sessionStorage on the first render, so this never fires before the saved cart is loaded.
  if (cart.items.length === 0) {
    return <Navigate to={toPath('/order')} replace />;
  }

  return (
    <section className="order-section">
      <div className="order-section__head">
        <Link className="order-back" to={toPath('/order/cart')} aria-label="장바구니로 돌아가기">
          ←
        </Link>
        <h1 className="order-section__title">주문 확인</h1>
      </div>

      <p className="order-confirm__table">테이블 {tableId}번 주문</p>

      <ul className="cart-list">
        {cart.items.map((item) => (
          <li key={item.key}>
            <CartItem item={item} readOnly />
          </li>
        ))}
      </ul>

      <p className="order-confirm__notice">
        수량이나 옵션을 바꾸려면 <Link to={toPath('/order/cart')}>장바구니</Link>로 돌아가 주세요.
      </p>

      <dl className="cart-summary">
        <div className="cart-summary__row">
          <dt>총 수량</dt>
          <dd>{cart.totalCount}개</dd>
        </div>
        <div className="cart-summary__row cart-summary__row--total">
          <dt>총 주문 금액</dt>
          <dd>{formatPrice(cart.totalPrice)}</dd>
        </div>
      </dl>

      {isOverLimit && (
        <p className="order-confirm__limit" role="alert">
          한 번에 주문할 수 있는 항목은 최대 {MAX_ORDER_LINES}개입니다. 장바구니에서 항목 {extraLines}개를
          삭제한 뒤 결제해 주세요.
        </p>
      )}

      <PendingOrderNotice status={pendingOrder.status} onAcknowledge={pendingOrder.acknowledge} />

      <BottomActionBar
        label={`${formatPrice(cart.totalPrice)} 결제하기`}
        onClick={goToPayment}
        disabled={isOverLimit || isBlocked}
        narrow
      />
    </section>
  );
}

export default OrderConfirmPage;
