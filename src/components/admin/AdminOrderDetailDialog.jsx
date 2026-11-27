import { useEffect, useRef } from 'react';
import AdminStateView from './AdminStateView.jsx';
import AdminLoadError from './AdminLoadError.jsx';
import StatusBadge from './StatusBadge.jsx';
import { fetchAdminOrderById } from '../../api/adminApi.js';
import { useAdminData } from '../../hooks/useAdminData.js';
import { formatOptionPrice, formatPrice } from '../../utils/format.js';
import { formatDateTime, toDateTimeAttr } from '../../utils/dateTime.js';
import './MenuFormDialog.css'; // shared .admin-dialog base styles
import './AdminOrderDetailDialog.css';

// 메뉴 단가 + 옵션 추가금액 합계 (1개 기준)
const getUnitTotal = (item) => item.options.reduce((sum, option) => sum + option.extra_price, item.unit_price);

// Order detail (GET /api/admin/orders/:orderId), loaded again every time the dialog opens.
// The parent renders it with key={orderId}, and useAdminData only shows the result of the request for
// this orderId, so the data of a previously opened order is never shown here.
function AdminOrderDetailDialog({ orderId, orderLabel = `주문 #${orderId}`, onClose }) {
  const dialogRef = useRef(null);
  const { status, data: order, error, retry } = useAdminData(fetchAdminOrderById, orderId);

  // Native modal dialog: focus stays inside, Esc closes (handled by onCancel below).
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  let content;
  if (status === 'loading') {
    content = <AdminStateView status="loading" message="주문 정보를 불러오는 중입니다…" />;
  } else if (status === 'error' && error?.status === 404) {
    content = <AdminStateView status="empty" message="존재하지 않는 주문입니다." />;
  } else if (status === 'error') {
    // 401 → login link; anything else → message + retry.
    content = <AdminLoadError error={error} fallback="주문 정보를 불러오지 못했습니다." onRetry={retry} />;
  } else {
    const { session } = order;
    content = (
      <>
        <dl className="admin-order-detail__info">
          <div>
            <dt>테이블</dt>
            <dd>{order.table_id}번</dd>
          </div>
          <div>
            <dt>주문 번호</dt>
            <dd>{orderLabel}</dd>
          </div>
          <div>
            <dt>주문 시간</dt>
            <dd><time dateTime={toDateTimeAttr(order.order_time)}>{formatDateTime(order.order_time)}</time></dd>
          </div>
          <div>
            <dt>진행 상태</dt>
            <dd><StatusBadge status={order.order_status} /></dd>
          </div>
          <div>
            <dt>세션 시작</dt>
            <dd><time dateTime={toDateTimeAttr(session.started_at)}>{formatDateTime(session.started_at)}</time></dd>
          </div>
          <div>
            <dt>세션 종료</dt>
            <dd>
              {session.ended_at ? (
                <time dateTime={toDateTimeAttr(session.ended_at)}>{formatDateTime(session.ended_at)}</time>
              ) : '이용 중'}
            </dd>
          </div>
        </dl>

        <h3 className="admin-order-detail__heading">주문 메뉴</h3>
        <ul className="admin-order-detail__items">
          {order.items.map((item) => (
            <li key={item.order_detail_id} className="admin-order-detail__item">
              <div className="admin-order-detail__row admin-order-detail__menu">
                <span>{item.menu_name}</span>
                <span>{formatPrice(item.unit_price)}</span>
              </div>
              {item.options.map((option) => (
                <div key={option.option_id} className="admin-order-detail__row admin-order-detail__option">
                  <span>+ {option.option_name}</span>
                  <span>{formatOptionPrice(option.extra_price)}</span>
                </div>
              ))}
              <div className="admin-order-detail__row admin-order-detail__subtotal">
                <span>{formatPrice(getUnitTotal(item))} × {item.quantity}개</span>
                <strong>{formatPrice(getUnitTotal(item) * item.quantity)}</strong>
              </div>
            </li>
          ))}
        </ul>

        <div className="admin-order-detail__row admin-order-detail__total">
          <span>주문 총액</span>
          <strong>{formatPrice(order.total_price)}</strong>
        </div>
      </>
    );
  }

  return (
    <dialog
      ref={dialogRef}
      className="admin-dialog"
      aria-labelledby="order-detail-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="admin-dialog__form">
        <header className="admin-dialog__head">
          <h2 id="order-detail-title" className="admin-dialog__title">{orderLabel} 상세</h2>
        </header>

        <div className="admin-dialog__body">{content}</div>

        <footer className="admin-dialog__foot">
          <button type="button" className="admin-btn admin-btn--secondary" onClick={onClose}>닫기</button>
        </footer>
      </div>
    </dialog>
  );
}

export default AdminOrderDetailDialog;