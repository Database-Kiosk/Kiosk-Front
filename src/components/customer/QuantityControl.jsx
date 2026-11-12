import { MAX_QUANTITY } from '../../hooks/useCart.js';

// − / value / + control. Reused by the menu detail sheet and the cart page.
// Buttons are disabled at min and max; onChange always receives an integer within [min, max].
function QuantityControl({ value, onChange, min = 1, max = MAX_QUANTITY, label = '수량' }) {
  const canDecrease = value > min;
  const canIncrease = value < max;

  return (
    <div className="quantity-control" role="group" aria-label={label}>
      <button
        type="button"
        className="quantity-control__button"
        onClick={() => onChange(value - 1)}
        disabled={!canDecrease}
        aria-label={`${label} 줄이기`}
      >
        −
      </button>
      <span className="quantity-control__value" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        className="quantity-control__button"
        onClick={() => onChange(value + 1)}
        disabled={!canIncrease}
        aria-label={`${label} 늘리기`}
      >
        +
      </button>
    </div>
  );
}

export default QuantityControl;
