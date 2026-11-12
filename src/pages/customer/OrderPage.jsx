import { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import CategoryTabs from '../../components/customer/CategoryTabs.jsx';
import MenuCard from '../../components/customer/MenuCard.jsx';
import MenuDetailSheet from '../../components/customer/MenuDetailSheet.jsx';
import BottomActionBar from '../../components/customer/BottomActionBar.jsx';
// TEMPORARY (issue #2): mock data. Replace with the menu API (src/api/) later.
import { categories, menus } from '../../mocks/menuData.js';

// Customer menu list page. Entry URL: /order?table={tableId}
// Table validation and cart state come from OrderLayout.
function OrderPage() {
  const { toPath, cart } = useOutletContext();
  const navigate = useNavigate();
  const [selectedCategoryId, setSelectedCategoryId] = useState(null); // null = 전체
  const [selectedMenu, setSelectedMenu] = useState(null); // menu shown in the detail sheet

  const visibleMenus =
    selectedCategoryId === null ? menus : menus.filter((menu) => menu.category_id === selectedCategoryId);

  function openMenu(menu) {
    if (menu.is_active === 1) setSelectedMenu(menu);
  }

  function closeMenu() {
    setSelectedMenu(null);
  }

  return (
    <section className="menu-page">
      <h1 className="sr-only">메뉴</h1>

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
