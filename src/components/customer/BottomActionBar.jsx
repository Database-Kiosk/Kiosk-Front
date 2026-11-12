import { formatPrice } from '../../utils/format.js';

// Fixed bottom action bar (reused by menu, cart and confirm pages).
// count and price are optional numbers; price is formatted here with formatPrice().
// Renders a spacer so the fixed bar never covers the end of the page content.
// narrow: match the narrow content column (cart / confirm pages) instead of the full content width.
function BottomActionBar({ label, count, price, onClick, disabled = false, narrow = false }) {
  return (
    <>
      <div className="bottom-bar-spacer" aria-hidden="true" />
      <div className="bottom-bar">
        <div className={`bottom-bar__inner${narrow ? ' bottom-bar__inner--narrow' : ''}`}>
          <button type="button" className="bottom-bar__button" onClick={onClick} disabled={disabled}>
            <span className="bottom-bar__label">
              {typeof count === 'number' && <span className="bottom-bar__count">{count}</span>}
              {label}
            </span>
            {typeof price === 'number' && <span className="bottom-bar__price">{formatPrice(price)}</span>}
          </button>
        </div>
      </div>
    </>
  );
}

export default BottomActionBar;
