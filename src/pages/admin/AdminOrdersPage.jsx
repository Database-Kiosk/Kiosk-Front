import { useEffect, useState } from 'react';
import AdminPageHeader from '../../components/admin/AdminPageHeader.jsx';
import AdminStateView from '../../components/admin/AdminStateView.jsx';
import AdminTabs from '../../components/admin/AdminTabs.jsx';
import AdminOrderCard from '../../components/admin/AdminOrderCard.jsx';
import StatusBadge from '../../components/admin/StatusBadge.jsx';
import { fetchAdminOrders, updateOrderStatus } from '../../api/adminApi.js';
import { ORDER_STATUSES } from '../../mocks/adminMockData.js';
import { useAdminData } from '../../hooks/useAdminData.js';
import './AdminOrdersPage.css';

// PC (≥1024px): three columns (접수 / 조리 중 / 전달 완료), the tabs are hidden.
// Tablet: status tabs; only the selected column is shown ('전체' shows all columns stacked).
const ELAPSED_REFRESH_MS = 30000;

// Orders still in progress: oldest first (first come, first served). Delivered: newest first.
function sortForColumn(orders, status) {
  const direction = status === '전달 완료' ? -1 : 1;
  return orders.filter((order) => order.order_status === status).sort((a, b) => (a.order_id - b.order_id) * direction);
}

function AdminOrdersPage() {
  const { status, data: orders, retry, setData } = useAdminData(fetchAdminOrders);
  const [filter, setFilter] = useState('all');
  const [busyOrderId, setBusyOrderId] = useState(null);
  const [actionError, setActionError] = useState('');
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), ELAPSED_REFRESH_MS);
    return () => clearInterval(timer);
  }, []);

  // MOCK: changes the in-memory mock order only (see api/adminApi.js).
  const handleAdvance = async (order, nextStatus) => {
    setBusyOrderId(order.order_id);
    setActionError('');
    try {
      const updated = await updateOrderStatus(order.order_id, nextStatus);
      setData((list) => list.map((item) => (item.order_id === updated.order_id ? updated : item)));
    } catch {
      setActionError(`주문 #${order.order_id}의 상태를 변경하지 못했습니다. 목록을 새로고침해 주세요.`);
    } finally {
      setBusyOrderId(null);
    }
  };

  const countOf = (orderStatus) => orders?.filter((order) => order.order_status === orderStatus).length ?? 0;

  return (
    <>
      <AdminPageHeader title="주문 관리" description="들어온 주문을 상태별로 확인하고 다음 단계로 넘깁니다.">
        <button
          type="button"
          className="admin-btn admin-btn--secondary"
          onClick={retry}
          disabled={status === 'loading'}
        >
          새로고침
        </button>
      </AdminPageHeader>

      {actionError && <p className="admin-alert" role="alert">{actionError}</p>}

      {status === 'loading' && <AdminStateView status="loading" message="주문을 불러오는 중입니다…" />}
      {status === 'error' && <AdminStateView status="error" message="주문을 불러오지 못했습니다." onRetry={retry} />}
      {status === 'success' && orders.length === 0 && (
        <AdminStateView status="empty" message="아직 들어온 주문이 없습니다." />
      )}

      {status === 'success' && orders.length > 0 && (
        <>
          <AdminTabs
            className="admin-orders__tabs"
            label="주문 상태"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: '전체', count: orders.length },
              ...ORDER_STATUSES.map((item) => ({ value: item, label: item, count: countOf(item) })),
            ]}
          />

          <div className="admin-kanban">
            {ORDER_STATUSES.map((columnStatus) => {
              const columnOrders = sortForColumn(orders, columnStatus);
              const isVisible = filter === 'all' || filter === columnStatus;
              return (
                <section
                  key={columnStatus}
                  className={`admin-kanban__column${isVisible ? ' is-visible' : ''}`}
                  aria-label={`${columnStatus} 주문`}
                >
                  <h2 className="admin-kanban__head">
                    <StatusBadge status={columnStatus} />
                    <span className="admin-kanban__count">{columnOrders.length}건</span>
                  </h2>

                  {columnOrders.length === 0 ? (
                    <p className="admin-kanban__empty">{columnStatus} 상태의 주문이 없습니다.</p>
                  ) : (
                    <ul className="admin-kanban__list">
                      {columnOrders.map((order) => (
                        <li key={order.order_id}>
                          <AdminOrderCard
                            order={order}
                            now={now}
                            isBusy={busyOrderId === order.order_id}
                            onAdvance={handleAdvance}
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}

export default AdminOrdersPage;
