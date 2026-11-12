import { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import CategoryTabs from '../../components/customer/CategoryTabs.jsx';
import MenuCard from '../../components/customer/MenuCard.jsx';
import MenuDetailSheet from '../../components/customer/MenuDetailSheet.jsx';
import BottomActionBar from '../../components/customer/BottomActionBar.jsx';
// Categories/menus come through src/api/menuApi.js (TEMPORARY: mock data until the backend API exists).
import { useMenus } from '../../hooks/useMenus.js';

// Customer menu list page. Entry URL: /order?table={tableId}
// Table validation and cart state come from OrderLayout.
function OrderPage() {
  const { toPath, cart } = useOutletContext();
  const navigate = useNavigate();
  const { status, categories, menus, retry } = useMenus();
  const [selectedCategoryId, setSelectedCategoryId] = useState(null); // null = 전체 (default)
  const [selectedMenu, setSelectedMenu] = useState(null); // menu shown in the detail sheet

  // Customers see only menus on sale (is_active is normalized to 1/0 in menuApi.js).
  // Categories with no active menus keep their tab and show the empty message.
  const activeMenus = menus.filter((menu) => menu.is_active === 1);
  const visibleMenus =
    selectedCategoryId === null
      ? activeMenus
      : activeMenus.filter((menu) => menu.category_id === selectedCategoryId);

  function openMenu(menu) {
    if (menu.is_active === 1) setSelectedMenu(menu);
  }

  function closeMenu() {
    setSelectedMenu(null);
  }

  return (
    <section className="menu-page">
      <h1 className="sr-only">메뉴</h1>

      {status === 'loading' && (
        <p className="order-loading" role="status">
          메뉴를 불러오고 있습니다…
        </p>
      )}

      {status === 'error' && (
        <div className="order-error" role="alert">
          <p className="order-error__text">메뉴를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>
          <button type="button" className="order-btn order-btn--secondary order-error__retry" onClick={retry}>
            다시 시도
          </button>
        </div>
      )}

      {status === 'success' && (
        <>
          <CategoryTabs categories={categories} selectedId={selectedCategoryId} onSelect={setSelectedCategoryId} />

          {visibleMenus.length > 0 ? (
            <ul className="menu-list">
              {visibleMenus.map((menu) => (
                <li key={menu.menu_id}>
                  <MenuCard menu={menu} onSelect={openMenu} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="order-empty">이 카테고리에는 메뉴가 없습니다.</p>
          )}
        </>
      )}

      {/* Shown in every state so the saved cart stays reachable. */}
      <BottomActionBar
        label="장바구니 보기"
        count={cart.totalCount}
        price={cart.totalPrice}
        onClick={() => navigate(toPath('/order/cart'))}
      />

      {selectedMenu && (
        <MenuDetailSheet
          key={selectedMenu.menu_id}
          menu={selectedMenu}
          onAdd={cart.addItem}
          onClose={closeMenu}
        />
      )}
    </section>
  );
}

export default OrderPage;
