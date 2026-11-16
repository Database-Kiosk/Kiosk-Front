import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useOutletContext } from 'react-router-dom';
import { formatOptionPrice, formatPrice } from '../../utils/format.js';

// Server time "2026-11-16 22:04:46" (DB local time, no time zone) → "2026-11-16 22:04"
function formatOrderedAt(value) {
  return typeof value === 'string' ? value.slice(0, 16) : '';
}

// 항목 금액 = (주문 당시 기본 가격 + 옵션 추가금액 합계) × 수량 — values from the order API response
function getOrderedLineTotal(item) {
  const optionTotal = item.options.reduce((sum, option) => sum + option.extra_price, 0);
  return (item.unit_price + optionTotal) * item.quantity;
}

// Minimal shape check of the POST /api/orders 201 body before rendering it.
function isOrderResponse(order) {
  return (
    Number.isInteger(order?.order_id) &&
    Number.isInteger(order.total_price) &&
    Array.isArray(order.items) &&
    order.items.every((item) => Array.isArray(item?.options))
  );
}

// Customer order complete page. Entry URL: /order/complete?table={tableId}
// Reached only from the payment page after the order API returned 201. Everything shown about the
// order (number, time, menus/options, total) comes from that response, not from the cart.
function OrderCompletePage() {
  const { tableId, toPath } = useOutletContext();
  const location = useLocation();
  const navigate = useNavigate();

  // Only the payment page sets this navigation state. Read it once on mount.
  const [entry] = useState(() => {
    const state = location.state;
    if (state?.fromPayment !== true || state?.tableId !== tableId) return null;
    return { order: isOrderResponse(state.order) ? state.order : null };
  });

  // React Router keeps navigation state across a refresh, so drop it right away:
  // a refresh or a later visit to this URL then has no state and goes back to the menu.
  useEffect(() => {
    if (entry && location.state) {
      navigate(toPath('/order/complete'), { replace: true, state: null });
    }
  }, [entry, location.state, navigate, toPath]);

  // Typed URL, refresh, or Back/Forward into this entry: no confirmed order to show.
  if (!entry) {
    return <Navigate to={toPath('/order')} replace />;
  }

  const { order } = entry;

  return (
    <section className="order-section order-complete">
      <div className="order-complete__icon" aria-hidden="true">
        ✓
      </div>
      <h1 className="order-section__title">주문이 접수되었습니다</h1>
      <p className="order-complete__text">주문해 주셔서 감사합니다.</p>
      <p className="order-complete__table">테이블 {tableId}번</p>

      {order ? (
        <div className="order-complete__receipt">
          <dl className="order-complete__meta">
            <div className="order-complete__meta-row">
              <dt>주문번호</dt>
              <dd>{order.order_id}</dd>
            </div>
            <div className="order-complete__meta-row">
              <dt>주문 시각</dt>
              <dd>{formatOrderedAt(order.order_time)}</dd>
            </div>
          </dl>

          <ul className="order-complete__items" aria-label="주문 메뉴">
            {order.items.map((item, index) => (
              // Same menu/options can appear twice (separate lines), so the index is part of the key.
              <li key={`${index}-${item.menu_id}`} className="order-complete__item">
                <div className="order-complete__item-row">
                  <span className="order-complete__item-name">
                    {item.menu_name} × {item.quantity}
                  </span>
                  <span className="order-complete__item-price">{formatPrice(getOrderedLineTotal(item))}</span>
                </div>
                {item.options.length > 0 && (
                  <ul className="order-complete__options">
                    {item.options.map((option) => (
                      <li key={option.option_id}>
                        + {option.option_name} ({formatOptionPrice(option.extra_price)})
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>

          <div className="order-complete__total">
            <span>총 결제 금액</span>
            <strong>{formatPrice(order.total_price)}</strong>
          </div>
        </div>
      ) : (
        <p className="order-complete__text">주문 정보를 표시할 수 없습니다. 주문 내용은 직원에게 확인해 주세요.</p>
      )}

      <div className="order-actions">
        <Link className="order-btn order-btn--primary" to={toPath('/order')} replace>
          메뉴 화면으로 돌아가기
        </Link>
      </div>
    </section>
  );
}

export default OrderCompletePage;
