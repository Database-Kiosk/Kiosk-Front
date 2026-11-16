import { useId, useState } from 'react';
import './PendingOrderNotice.css';

// Shown on the confirm and payment pages while a previous order request is running ('in-flight')
// or its result is unknown ('uncertain'). Payment stays blocked until the status is 'none'.
// For 'uncertain', the customer must tick the checkbox and press the button (two explicit actions).
// That only records the customer's own statement; it is not a server-side check.
// Staff confirmation is the only reliable check for now: the order history page (#8) is not connected
// to the server yet, so it is not offered here. Add a link to it once it shows real orders.
function PendingOrderNotice({ status, onAcknowledge }) {
  const [checked, setChecked] = useState(false);
  const checkboxId = useId();

  if (status === 'in-flight') {
    return (
      <div className="pending-order" role="status">
        <p className="pending-order__text">이전 주문을 처리하고 있습니다. 잠시만 기다려 주세요.</p>
      </div>
    );
  }

  if (status !== 'uncertain') return null;

  return (
    <div className="pending-order pending-order--uncertain" role="alert">
      <p className="pending-order__text">
        이전 주문의 접수 여부를 확인하지 못했습니다. 다시 주문하기 전에 직원에게 접수 여부를 확인해 주세요.
      </p>

      <div className="pending-order__confirm">
        <input
          id={checkboxId}
          type="checkbox"
          checked={checked}
          onChange={(event) => setChecked(event.target.checked)}
        />
        <label htmlFor={checkboxId}>직원을 통해 이전 주문이 접수되지 않은 것을 확인했습니다.</label>
      </div>
      <button
        type="button"
        className="order-btn order-btn--secondary pending-order__button"
        onClick={onAcknowledge}
        disabled={!checked}
      >
        확인했습니다. 다시 주문하기
      </button>
    </div>
  );
}

export default PendingOrderNotice;
