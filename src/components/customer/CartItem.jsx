import { useState } from 'react';
import QuantityControl from './QuantityControl.jsx';
import { getLineTotal } from '../../hooks/useCart.js';
import { formatOptionPrice, formatPrice } from '../../utils/format.js';
import './CartItem.css';

// One cart line: image, name, selected options, quantity control, line total, remove button.
// Options cannot be edited here; to change them, remove the item and add the menu again.
// readOnly (order confirm page): quantity is shown as text; quantity buttons and remove button are hidden.
function CartItem({ item, onQuantityChange, onRemove, readOnly = false }) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(item.image_url) && !imageFailed;

  return (
    <article className="cart-item">
      <div className="cart-item__top">
        <div className="cart-item__image">
          {showImage ? (
            <img src={item.image_url} alt="" loading="lazy" onError={() => setImageFailed(true)} />
          ) : (
            <span className="cart-item__placeholder" aria-hidden="true">
              {item.menu_name.charAt(0)}
            </span>
          )}
        </div>

        <div className="cart-item__info">
          <h2 className="cart-item__name">{item.menu_name}</h2>
          <p className="cart-item__base-price">{formatPrice(item.price)}</p>
        </div>

        {!readOnly && (
          <button
            type="button"
            className="cart-item__remove"
            onClick={() => onRemove(item.key)}
            aria-label={`${item.menu_name} 삭제`}
          >
            ✕
          </button>
        )}
      </div>

      {item.options.length > 0 && (
        <ul className="cart-item__options" aria-label="선택한 옵션">
          {item.options.map((option) => (
            <li key={option.option_id} className="cart-item__option">
              <span className="cart-item__option-name">{option.option_name}</span>
              <span className="cart-item__option-price">{formatOptionPrice(option.additional_price)}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="cart-item__bottom">
        {readOnly ? (
          <span className="cart-item__quantity">수량 {item.quantity}개</span>
        ) : (
          <QuantityControl
            value={item.quantity}
            onChange={(quantity) => onQuantityChange(item.key, quantity)}
            label={`${item.menu_name} 수량`}
          />
        )}
        <span className="cart-item__total">{formatPrice(getLineTotal(item))}</span>
      </div>
    </article>
  );
}

export default CartItem;
