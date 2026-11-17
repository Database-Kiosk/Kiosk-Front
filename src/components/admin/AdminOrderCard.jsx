import StatusBadge from './StatusBadge.jsx';
import { formatPrice } from '../../utils/format.js';
import { formatElapsed, formatOrderTime, toDateTimeAttr } from '../../utils/dateTime.js';

// Next step button per status. '전달 완료' is the last status (no button).
const NEXT_STEP = {
  접수: { label: '조리 시작', status: '조리 중' },
  '조리 중': { label: '전달 완료', status: '전달 완료' },
};

// One order on the admin order board. `now` refreshes the elapsed time (and decides what "today" is:
// orders of another day also show their date).
function AdminOrderCard({ order, now, isBusy, onAdvance, onOpenDetail }) {
  const nextStep = NEXT_STEP[order.order_status];
  const isDone = !nextStep;

  return (
    <article className={`admin-order-card${isDone ? ' is-done' : ''}`}>
      <header className="admin-order-card__head">
        <div>
          <p className="admin-order-card__table">테이블 {order.table_id}</p>
          <p className="admin-order-card__id">주문 #{order.order_id}</p>
        </div>
        <div className="admin-order-card__time">
          <time dateTime={toDateTimeAttr(order.order_time)}>{formatOrderTime(order.order_time, now)}</time>
          {!isDone && <span className="admin-order-card__elapsed">{formatElapsed(order.order_time, now)}</span>}
        </div>
      </header>

      <ul className="admin-order-card__items">
        {order.items.map((item) => (
          <li key={item.order_detail_id} className="admin-order-card__item">
            <div className="admin-order-card__item-row">
              <span>{item.menu_name}</span>
              <span className="admin-order-card__quantity">× {item.quantity}</span>
            </div>
            {item.options.length > 0 && (
              <p className="admin-order-card__options">
                {item.options.map((option) => option.option_name).join(', ')}
              </p>
            )}
          </li>
        ))}
      </ul>

      <footer className="admin-order-card__foot">
        <div className="admin-order-card__summary">
          <StatusBadge status={order.order_status} />
          <strong className="admin-order-card__total">{formatPrice(order.total_price)}</strong>
        </div>
        <div className="admin-order-card__actions">
          <button
            type="button"
            className="admin-btn admin-btn--secondary admin-order-card__detail"
            aria-label={`주문 #${order.order_id} 상세 보기`}
            disabled={isBusy}
            onClick={() => onOpenDetail(order.order_id)}
          >
            상세 보기
          </button>
          {nextStep && (
            <button
              type="button"
              className="admin-btn admin-btn--primary admin-order-card__action"
              disabled={isBusy}
              onClick={() => onAdvance(order, nextStep.status)}
            >
              {isBusy ? '변경 중…' : nextStep.label}
            </button>
          )}
        </div>
      </footer>
    </article>
  );
}

export default AdminOrderCard;
