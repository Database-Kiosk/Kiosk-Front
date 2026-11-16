import { useEffect, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate, useOutletContext } from 'react-router-dom';
import PendingOrderNotice from '../../components/customer/PendingOrderNotice.jsx';
import { createOrder, MAX_ORDER_LINES } from '../../api/orderApi.js';
import { saveCart } from '../../hooks/useCart.js';
import {
  beginPendingOrder,
  getPendingOrderStatus,
  settlePendingOrder,
  usePendingOrder,
} from '../../hooks/usePendingOrder.js';
import { formatPrice } from '../../utils/format.js';
import './PaymentPage.css';

// Mock card payment. No real payment system is called.
const MOCK_PAYMENT_MS = 2000;

// Order request for POST /api/orders. Prices are not sent: the server computes them.
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

// True only for 4xx: Kiosk-Server returns every 4xx before writing anything (validation, table/menu/
// option checks), so the order was certainly not saved.
// 5xx is NOT certain: e.g. if the connection to MySQL drops after COMMIT succeeded, the server still
// answers 500 although the order exists. 5xx, gateway errors and no answer (network error, timeout)
// are treated as an unknown result.
function isCertainFailure(error) {
  const status = error?.status;
  return typeof status === 'number' && status >= 400 && status < 500;
}

// Message for a certain failure. `toCart`: the cart must be edited before ordering again.
function describeFailure(error) {
  switch (error.status) {
    case 409:
      return { message: '판매가 중지된 메뉴가 포함되어 있습니다. 장바구니를 확인해 주세요.', toCart: true };
    case 400:
      return {
        message: error.serverMessage ?? '주문 정보가 올바르지 않습니다. 장바구니를 확인해 주세요.',
        toCart: true,
      };
    case 404:
      return { message: '테이블 정보를 찾을 수 없습니다. 직원에게 문의해 주세요.' };
    default:
      return { message: '주문을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.' };
  }
}

// Customer mock payment page. Entry URL: /order/payment?table={tableId} (from the confirm page only).
// Flow: ready → paying (mock card payment, can be cancelled) → ordering (POST /api/orders, once)
//       → complete page on 201, or failed (cart kept).
// Duplicate orders: while a previous request for this table is running or its result is unknown
// (usePendingOrder), payment is blocked and PendingOrderNotice is shown instead.
function PaymentPage() {
  const { tableId, toPath, cart } = useOutletContext();
  const location = useLocation();
  const navigate = useNavigate();
  const pendingOrder = usePendingOrder(tableId);
  const [step, setStep] = useState('ready'); // 'ready' | 'paying' | 'ordering' | 'failed'
  const [failure, setFailure] = useState(null);
  // Read once: only the confirm page's "결제하기" sets this navigation state.
  const [cameFromConfirm] = useState(() => location.state?.fromConfirm === true);
  // Blocks a second payment synchronously (a double click lands before the next render).
  const inProgressRef = useRef(false);
  const timerRef = useRef(null);
  const mountedRef = useRef(false);

  // Leaving the page during the mock payment cancels it, so no order is created.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      window.clearTimeout(timerRef.current);
    };
  }, []);

  async function submitOrder(orderRequest) {
    // Re-check right before sending: another request for this table may have started meanwhile.
    if (getPendingOrderStatus(tableId) !== 'none') {
      inProgressRef.current = false;
      setStep('ready');
      return;
    }

    setStep('ordering');
    beginPendingOrder(tableId);
    try {
      const order = await createOrder(orderRequest);
      // 201: the order exists. Clean up even if the customer already left this page,
      // so the same items cannot be ordered twice (saveCart also covers an unmounted layout).
      cart.clearCart();
      saveCart(tableId, []);
      settlePendingOrder(tableId, 'settled');
      if (mountedRef.current) {
        navigate(toPath('/order/complete'), {
          replace: true,
          state: { fromPayment: true, tableId, order },
        });
      }
    } catch (error) {
      const certain = isCertainFailure(error);
      // Certain failure: nothing was saved. Unknown result: keep the marker (blocks re-ordering).
      settlePendingOrder(tableId, certain ? 'settled' : 'unknown');
      inProgressRef.current = false;
      if (!mountedRef.current) return;
      setFailure(certain ? describeFailure(error) : null);
      setStep('failed');
    }
  }

  function handlePay() {
    if (inProgressRef.current || getPendingOrderStatus(tableId) !== 'none') return;
    inProgressRef.current = true;
    // Snapshot of what is being paid for; the cart cannot change on this page.
    const orderRequest = buildOrderRequest(tableId, cart.items);
    setFailure(null);
    setStep('paying');
    timerRef.current = window.setTimeout(() => submitOrder(orderRequest), MOCK_PAYMENT_MS);
  }

  // Cancel (ready / paying / failed): to the confirm page, without relying on browser history.
  // No order request is sent.
  function handleCancel() {
    if (step === 'ordering') return;
    window.clearTimeout(timerRef.current);
    inProgressRef.current = false;
    navigate(toPath('/order/confirm'), { replace: true });
  }

  // While the order request runs (and right after success, when the cart is already empty) stay here.
  if (step !== 'ordering') {
    if (cart.items.length === 0) return <Navigate to={toPath('/order')} replace />;
    if (!cameFromConfirm || cart.items.length > MAX_ORDER_LINES) {
      return <Navigate to={toPath('/order/confirm')} replace />;
    }
  }

  const isBusy = step === 'paying' || step === 'ordering';
  // A previous request (not this page's own running one) blocks payment.
  const isBlocked = !isBusy && pendingOrder.status !== 'none';

  return (
    <section className="order-section">
      <div className="order-section__head">
        <h1 className="order-section__title">결제</h1>
      </div>

      <div className="payment-amount">
        <span className="payment-amount__label">결제 금액</span>
        <strong className="payment-amount__value">{formatPrice(cart.totalPrice)}</strong>
        <span className="payment-amount__count">메뉴 {cart.totalCount}개</span>
      </div>

      <fieldset className="payment-methods" disabled={isBusy || isBlocked}>
        <legend className="payment-methods__title">결제 수단</legend>
        <label className="payment-method">
          <input type="radio" name="payment-method" value="card" checked readOnly />
          <span className="payment-method__name">카드 결제</span>
          <span className="payment-method__hint">신용·체크카드</span>
        </label>
      </fieldset>

      {isBusy && (
        <div className="payment-progress" role="status">
          <span className="payment-progress__spinner" aria-hidden="true" />
          <p className="payment-progress__text">
            {step === 'paying'
              ? '카드 결제를 진행하고 있습니다…'
              : '결제가 완료되었습니다. 주문을 접수하고 있습니다…'}
          </p>
        </div>
      )}

      {isBlocked && (
        <PendingOrderNotice status={pendingOrder.status} onAcknowledge={pendingOrder.acknowledge} />
      )}

      {step === 'failed' && failure && !isBlocked && (
        <div className="order-error payment-error" role="alert">
          <p className="order-error__text">{failure.message}</p>
        </div>
      )}

      <p className="payment-notice">실제 결제는 이루어지지 않는 모의 결제입니다.</p>

      <div className="order-actions">
        {step === 'failed' && failure?.toCart && !isBlocked ? (
          <button
            type="button"
            className="order-btn order-btn--secondary"
            onClick={() => navigate(toPath('/order/cart'), { replace: true })}
          >
            장바구니 확인
          </button>
        ) : (
          <button
            type="button"
            className="order-btn order-btn--secondary"
            onClick={handleCancel}
            disabled={step === 'ordering'}
          >
            {step === 'paying' ? '결제 취소' : '취소'}
          </button>
        )}
        <button
          type="button"
          className="order-btn order-btn--primary"
          onClick={handlePay}
          disabled={isBusy || isBlocked}
        >
          {isBusy ? '결제 진행 중…' : step === 'failed' ? '다시 결제하기' : `${formatPrice(cart.totalPrice)} 결제하기`}
        </button>
      </div>
    </section>
  );
}

export default PaymentPage;
