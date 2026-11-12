import { useState } from 'react';
import { formatPrice } from '../../utils/format.js';

// Menu card: image (or placeholder), name, price. Inactive menus (is_active !== 1) are disabled.
// onSelect(menu) is optional; OrderPage uses it to open the menu detail sheet.
function MenuCard({ menu, onSelect }) {
  const [imageFailed, setImageFailed] = useState(false);
  const isActive = menu.is_active === 1;
  const showImage = Boolean(menu.image_url) && !imageFailed;

  return (
    <button
      type="button"
      className={`menu-card${isActive ? '' : ' is-inactive'}`}
      disabled={!isActive}
      onClick={() => onSelect?.(menu)}
      aria-label={isActive ? undefined : `${menu.menu_name} (판매 중지)`}
    >
      <div className="menu-card__image">
        {showImage ? (
          <img src={menu.image_url} alt="" loading="lazy" onError={() => setImageFailed(true)} />
        ) : (
          <span className="menu-card__placeholder" aria-hidden="true">
            {menu.menu_name.charAt(0)}
          </span>
        )}
        {!isActive && <span className="menu-card__badge">판매 중지</span>}
      </div>

      <div className="menu-card__body">
        <span className="menu-card__name">{menu.menu_name}</span>
        <span className="menu-card__price">{formatPrice(menu.price)}</span>
      </div>
    </button>
  );
}

export default MenuCard;
