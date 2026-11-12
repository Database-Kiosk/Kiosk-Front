import { useEffect, useId, useRef, useState } from 'react';
import QuantityControl from './QuantityControl.jsx';
import { getLineTotal } from '../../hooks/useCart.js';
import { formatOptionPrice, formatPrice } from '../../utils/format.js';
import './MenuDetailSheet.css';

const FOCUSABLE_SELECTOR =
  'button:not(:disabled), input:not(:disabled), [href], [tabindex]:not([tabindex="-1"])';
// Fast double-click/double-tap window (also about the open animation, 0.25s).
const CLICK_GUARD_MS = 300;

// "담기" closes (unmounts) the sheet on the first click, so the 2nd click of a fast double-click
// would land on whatever was under it (bottom bar → cart page, or another menu card).
// For a moment, swallow clicks on the area the button covered (capture phase, before React or a
// link sees them). Clicks anywhere else on the page are not affected.
function blockClickThrough(area) {
  const margin = 10; // px; a double-click's 2nd click can land slightly off the 1st
  const swallow = (event) => {
    const isOnArea =
      event.clientX >= area.left - margin &&
      event.clientX <= area.right + margin &&
      event.clientY >= area.top - margin &&
      event.clientY <= area.bottom + margin;
    if (!isOnArea) return;
    event.preventDefault();
    event.stopPropagation();
  };
  document.addEventListener('click', swallow, true);
  window.setTimeout(() => document.removeEventListener('click', swallow, true), CLICK_GUARD_MS);
}

// Menu detail: bottom sheet on mobile, centered modal on tablet/PC.
// Render with key={menu.menu_id} so option and quantity state start fresh for each menu.
// onAdd(menu, optionIds, quantity) returns true on success; the sheet closes only then.
function MenuDetailSheet({ menu, onAdd, onClose }) {
  const [selectedOptionIds, setSelectedOptionIds] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState('');
  const sheetRef = useRef(null);
  const titleId = useId();

  const options = menu.options ?? [];
  const isActive = menu.is_active === 1;
  const selectedOptions = options.filter((option) => selectedOptionIds.includes(option.option_id));
  // Same formula as the cart: (base price + selected option prices) × quantity
  const totalPrice = getLineTotal({ price: menu.price, options: selectedOptions, quantity });

  // Lock background scroll while open; restore the previous state on close.
  useEffect(() => {
    const { body, documentElement } = document;
    const previousOverflow = body.style.overflow;
    const previousPaddingRight = body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - documentElement.clientWidth;

    body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;

    return () => {
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPaddingRight;
    };
  }, []);

  // Move focus into the dialog, and return it to the opener (the menu card) on close.
  useEffect(() => {
    const opener = document.activeElement;
    sheetRef.current?.focus();
    return () => {
      if (opener instanceof HTMLElement) opener.focus();
    };
  }, []);

  // ESC closes; Tab / Shift+Tab stay inside the dialog.
  // Listens on document so it still works after a click moved focus to <body>.
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !sheetRef.current) return;

      const sheet = sheetRef.current;
      const focusable = [...sheet.querySelectorAll(FOCUSABLE_SELECTOR)];
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (!sheet.contains(active)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && (active === first || active === sheet)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Time the sheet opened (same clock as event.timeStamp).
  const openedAtRef = useRef(0);
  useEffect(() => {
    openedAtRef.current = performance.now();
  }, []);

  // Close only when the overlay itself is clicked, not the sheet inside it.
  // Clicks right after opening are ignored: the 2nd click of a double-click/double-tap on a
  // menu card lands on the overlay and would otherwise close the sheet immediately.
  function handleOverlayClick(event) {
    if (event.target !== event.currentTarget) return;
    if (event.timeStamp - openedAtRef.current < CLICK_GUARD_MS) return;
    onClose();
  }

  function toggleOption(optionId) {
    setError('');
    setSelectedOptionIds((ids) =>
      ids.includes(optionId) ? ids.filter((id) => id !== optionId) : [...ids, optionId],
    );
  }

  function changeQuantity(nextQuantity) {
    setError('');
    setQuantity(nextQuantity);
  }

  function handleAdd(event) {
    const added = onAdd(menu, selectedOptionIds, quantity);
    if (added) {
      blockClickThrough(event.currentTarget.getBoundingClientRect());
      onClose();
    } else {
      setError('장바구니에 담지 못했습니다. 메뉴 상태를 확인한 뒤 다시 시도해 주세요.');
    }
  }

  return (
    <div className="sheet-overlay" onClick={handleOverlayClick}>
      <div
        ref={sheetRef}
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <button type="button" className="sheet__close" onClick={onClose} aria-label="닫기">
          ✕
        </button>

        <div className="sheet__scroll">
          <div className="sheet__image">
            {menu.image_url ? (
              <img src={menu.image_url} alt="" />
            ) : (
              <span className="sheet__placeholder" aria-hidden="true">
                {menu.menu_name.charAt(0)}
              </span>
            )}
          </div>

          <div className="sheet__content">
            <h2 id={titleId} className="sheet__title">
              {menu.menu_name}
            </h2>
            {menu.description && <p className="sheet__description">{menu.description}</p>}
            <p className="sheet__base-price">{formatPrice(menu.price)}</p>

            {options.length > 0 && (
              <fieldset className="sheet__options">
                <legend className="sheet__section-title">
                  옵션 <span className="sheet__section-hint">선택 사항</span>
                </legend>
                {options.map((option) => (
                  <label key={option.option_id} className="sheet__option">
                    <input
                      type="checkbox"
                      checked={selectedOptionIds.includes(option.option_id)}
                      onChange={() => toggleOption(option.option_id)}
                      disabled={!isActive}
                    />
                    <span className="sheet__option-name">{option.option_name}</span>
                    <span className="sheet__option-price">{formatOptionPrice(option.additional_price)}</span>
                  </label>
                ))}
              </fieldset>
            )}

            <div className="sheet__quantity">
              <span className="sheet__section-title">수량</span>
              <QuantityControl value={quantity} onChange={changeQuantity} />
            </div>
          </div>
        </div>

        <div className="sheet__footer">
          {!isActive && <p className="sheet__error">판매 중지된 메뉴는 담을 수 없습니다.</p>}
          {error && (
            <p className="sheet__error" role="alert">
              {error}
            </p>
          )}
          <button type="button" className="sheet__add" onClick={handleAdd} disabled={!isActive}>
            {formatPrice(totalPrice)} 담기
          </button>
        </div>
      </div>
    </div>
  );
}

export default MenuDetailSheet;
