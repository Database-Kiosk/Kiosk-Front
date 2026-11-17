import { useState } from 'react';
import AdminPageHeader from '../../components/admin/AdminPageHeader.jsx';
import AdminStateView from '../../components/admin/AdminStateView.jsx';
import AdminTabs from '../../components/admin/AdminTabs.jsx';
import MenuFormDialog from '../../components/admin/MenuFormDialog.jsx';
import { fetchAdminMenus, saveMenu, setMenuActive } from '../../api/adminApi.js';
import { useAdminData } from '../../hooks/useAdminData.js';
import { formatPrice } from '../../utils/format.js';
import './AdminMenusPage.css';

// Menu list for admins: menus off sale are listed too. There is no delete button on purpose:
// orderdetail rows reference menu (FK), so a menu is taken off sale (is_active = 0) instead.
function AdminMenusPage() {
  const { status, data, retry, setData } = useAdminData(fetchAdminMenus);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [keyword, setKeyword] = useState('');
  // null: closed, { menu: null }: add, { menu }: edit
  const [dialog, setDialog] = useState(null);
  const [busyMenuId, setBusyMenuId] = useState(null);
  const [actionError, setActionError] = useState('');

  const categories = data?.categories ?? [];
  const menus = data?.menus ?? [];
  const categoryName = (categoryId) =>
    categories.find((category) => category.category_id === categoryId)?.category_name ?? '-';

  const search = keyword.trim().toLowerCase();
  const visibleMenus = menus.filter(
    (menu) =>
      (categoryFilter === 'all' || menu.category_id === categoryFilter) &&
      (search === '' || menu.menu_name.toLowerCase().includes(search)),
  );

  const replaceMenu = (saved) =>
    setData((previous) => {
      const exists = previous.menus.some((menu) => menu.menu_id === saved.menu_id);
      return {
        ...previous,
        menus: exists
          ? previous.menus.map((menu) => (menu.menu_id === saved.menu_id ? saved : menu))
          : [...previous.menus, saved],
      };
    });

  // MOCK: both change the in-memory mock data only (see api/adminApi.js).
  const handleToggle = async (menu) => {
    setBusyMenuId(menu.menu_id);
    setActionError('');
    try {
      replaceMenu(await setMenuActive(menu.menu_id, menu.is_active !== 1));
    } catch {
      setActionError(`'${menu.menu_name}'의 판매 상태를 변경하지 못했습니다.`);
    } finally {
      setBusyMenuId(null);
    }
  };

  const handleSave = async (menu) => {
    replaceMenu(await saveMenu(menu)); // errors are shown inside the dialog
    setDialog(null);
  };

  const addButton = (
    <button type="button" className="admin-btn admin-btn--primary" onClick={() => setDialog({ menu: null })}>
      + 메뉴 추가
    </button>
  );

  return (
    <>
      <AdminPageHeader title="메뉴 관리" description="메뉴 정보와 판매 상태를 관리합니다.">
        {status === 'success' && addButton}
      </AdminPageHeader>

      {actionError && <p className="admin-alert" role="alert">{actionError}</p>}

      {status === 'loading' && <AdminStateView status="loading" message="메뉴를 불러오는 중입니다…" />}
      {status === 'error' && <AdminStateView status="error" message="메뉴를 불러오지 못했습니다." onRetry={retry} />}
      {status === 'success' && menus.length === 0 && (
        <AdminStateView status="empty" message="등록된 메뉴가 없습니다.">{addButton}</AdminStateView>
      )}

      {status === 'success' && menus.length > 0 && (
        <>
          <div className="admin-menus__toolbar">
            <AdminTabs
              label="카테고리"
              value={categoryFilter}
              onChange={setCategoryFilter}
              options={[
                { value: 'all', label: '전체', count: menus.length },
                ...categories.map((category) => ({
                  value: category.category_id,
                  label: category.category_name,
                  count: menus.filter((menu) => menu.category_id === category.category_id).length,
                })),
              ]}
            />
            <input
              type="search"
              className="admin-input admin-menus__search"
              placeholder="메뉴 이름 검색"
              aria-label="메뉴 이름 검색"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
            />
          </div>

          {visibleMenus.length === 0 ? (
            <AdminStateView status="empty" message="조건에 맞는 메뉴가 없습니다." />
          ) : (
            <div className="admin-card admin-table-wrap">
              <table className="admin-table admin-menus__table">
                <thead>
                  <tr>
                    <th scope="col">메뉴</th>
                    <th scope="col">카테고리</th>
                    <th scope="col" className="is-number">가격</th>
                    <th scope="col" className="admin-menus__options">옵션</th>
                    <th scope="col">판매 상태</th>
                    <th scope="col"><span className="admin-sr-only">관리</span></th>
                  </tr>
                </thead>
                <tbody>
                  {visibleMenus.map((menu) => {
                    const isActive = menu.is_active === 1;
                    return (
                      <tr key={menu.menu_id} className={isActive ? undefined : 'is-inactive'}>
                        <td>
                          <div className="admin-menus__menu">
                            <span className="admin-menus__thumb" aria-hidden="true">{menu.menu_name.slice(0, 1)}</span>
                            <div>
                              <p className="admin-menus__name">{menu.menu_name}</p>
                              {menu.description && <p className="admin-menus__description">{menu.description}</p>}
                            </div>
                          </div>
                        </td>
                        <td>{categoryName(menu.category_id)}</td>
                        <td className="is-number">{formatPrice(menu.price)}</td>
                        <td className="admin-menus__options">
                          {menu.options.length > 0 ? menu.options.map((option) => option.option_name).join(', ') : '-'}
                        </td>
                        <td>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={isActive}
                            aria-label={`${menu.menu_name} 판매 상태`}
                            className="admin-switch"
                            disabled={busyMenuId === menu.menu_id}
                            onClick={() => handleToggle(menu)}
                          >
                            <span className="admin-switch__track" aria-hidden="true" />
                            {isActive ? '판매 중' : '판매 중지'}
                          </button>
                        </td>
                        <td className="is-number">
                          <button
                            type="button"
                            className="admin-btn admin-btn--secondary"
                            onClick={() => setDialog({ menu })}
                          >
                            수정
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {dialog && (
        <MenuFormDialog
          menu={dialog.menu}
          categories={categories}
          onClose={() => setDialog(null)}
          onSave={handleSave}
        />
      )}
    </>
  );
}

export default AdminMenusPage;
