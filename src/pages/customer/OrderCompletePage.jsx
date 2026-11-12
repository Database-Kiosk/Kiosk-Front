import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useOutletContext } from 'react-router-dom';

// Customer order complete page. Entry URL: /order/complete?table={tableId}
// TEMPORARY (issue #2 mock): no real order exists. No order number is shown or generated.
// Later this page is reached only after the order API succeeds (it may then show data from that response).
function OrderCompletePage() {
  const { tableId, toPath } = useOutletContext();
  const location = useLocation();
  const navigate = useNavigate();

  // Only the confirm flow sets this navigation state. Read it once on mount.
  const [cameFromConfirm] = useState(
    () => location.state?.fromOrderConfirm === true && location.state?.tableId === tableId,
  );

  // React Router keeps navigation state across a refresh, so drop it right away:
  // a refresh or a later visit to this URL then has no state and goes back to the menu.
  useEffect(() => {
    if (cameFromConfirm && location.state) {
      navigate(toPath('/order/complete'), { replace: true, state: null });
    }
  }, [cameFromConfirm, location.state, navigate, toPath]);

  // Typed URL, refresh, or Back/Forward into this entry: no confirmed order to show.
  if (!cameFromConfirm) {
    return <Navigate to={toPath('/order')} replace />;
  }

  return (
    <section className="order-section order-complete">
      <div className="order-complete__icon" aria-hidden="true">
        ✓
      </div>
      <h1 className="order-section__title">주문이 접수되었습니다</h1>
      <p className="order-complete__text">주문해 주셔서 감사합니다.</p>
      <p className="order-complete__table">테이블 {tableId}번</p>

      <div className="order-actions">
        <Link className="order-btn order-btn--primary" to={toPath('/order')} replace>
          메뉴 화면으로 돌아가기
        </Link>
      </div>
    </section>
  );
}

export default OrderCompletePage;
