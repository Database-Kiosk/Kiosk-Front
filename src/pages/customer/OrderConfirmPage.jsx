import { useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useOutletContext } from 'react-router-dom';
import CartItem from '../../components/customer/CartItem.jsx';
import BottomActionBar from '../../components/customer/BottomActionBar.jsx';
import { formatPrice } from '../../utils/format.js';

// Order request snapshot at confirm time, shaped for the future order API
// (orders / orderdetail / orderoption). Prices are not sent: the server must compute them.
function buildOrderRequest(tableId, items) {
  return {
    table_id: tableId,
    items: items.map((item) => ({
      menu_id: item.menu_id,
      option_ids: item.options.map((option) => option.option_id),
      quantity: item.quantity,
    })),
  };
}

// Customer order confirm page. Entry URL: /order/confirm?table={tableId}
// Read-only review of the cart; editing happens on the cart page.
function OrderConfirmPage() {
  const { tableId, toPath, cart } = useOutletContext();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Ref blocks double clicks synchronously (state updates are not visible until the next render).
  const submittingRef = useRef(false);

  function handleConfirm() {
    if (submittingRef.current) return;

    // 1–2. Re-check the cart and take a snapshot of what is being ordered right now.
    const orderRequest = buildOrderRequest(tableId, cart.items);
    if (orderRequest.items.length === 0) return;

    submittingRef.current = true;
    setIsSubmitting(true);

    // TEMPORARY (issue #2 mock): nothing is sent to a server and nothing is saved.
    // When the order API exists (src/api/), replace this block with:
    //   try { await createOrder(orderRequest); }
    //   catch { show an error, reset submittingRef / isSubmitting, keep the cart; return; }
    // and clear the cart + navigate ONLY after the success response.

    // 3–5. Clear this table's cart and show the (mock) complete page.
    // replace: Back must not return to this confirm page. The state marks this navigation
    // as coming from the confirm flow; the complete page redirects to the menu without it.
    cart.clearCart();
    navigate(toPath('/order/complete'), {
      replace: true,
      state: { fromOrderConfirm: true, tableId },
    });
  }

  // Empty cart (e.g. typed URL): nothing to confirm. The cart is restored synchronously from
  // sessionStorage on the first render, so this never fires before the saved cart is loaded.
  // Skipped while submitting, because clearCart() empties the cart just before navigating away.
  if (cart.items.length === 0 && !isSubmitting) {
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

      <BottomActionBar label="주문 확정하기" onClick={handleConfirm} disabled={isSubmitting} narrow />
    </section>
  );
}

export default OrderConfirmPage;
