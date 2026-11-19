import { useEffect, useRef, useState } from 'react';
import AdminPageHeader from '../../components/admin/AdminPageHeader.jsx';
import AdminStateView from '../../components/admin/AdminStateView.jsx';
import AdminLoadError, { AdminLoginLink } from '../../components/admin/AdminLoadError.jsx';
import AdminTabs from '../../components/admin/AdminTabs.jsx';
import AdminOrderCard from '../../components/admin/AdminOrderCard.jsx';
import AdminOrderDetailDialog from '../../components/admin/AdminOrderDetailDialog.jsx';
import StatusBadge from '../../components/admin/StatusBadge.jsx';
import { describeAdminError, fetchAdminOrders, ORDER_STATUSES, updateOrderStatus } from '../../api/adminApi.js';
import { useAdminData } from '../../hooks/useAdminData.js';
import './AdminOrdersPage.css';

// Real Kiosk-Server orders (GET /api/admin/orders). No automatic refresh: the admin uses "새로고침".
// PC (≥1024px): three columns (접수 / 조리 중 / 전달 완료), the tabs are hidden.
// Tablet: status tabs; only the selected column is shown ('전체' shows all columns stacked).
const ELAPSED_REFRESH_MS = 30000;

// Orders still in progress: oldest first (first come, first served). Delivered: newest first.
function sortForColumn(orders, status) {
  const direction = status === '전달 완료' ? -1 : 1;
  return orders.filter((order) => order.order_status === status).sort((a, b) => (a.order_id - b.order_id) * direction);
}

// Message for a failed status change. reload: the list is loaded again (another admin changed the order).
function describeAdvanceError(error, orderId) {
  if (error.status === 409) {
    return { message: `주문 #${orderId}의 상태가 이미 변경되었습니다. 최신 주문 목록을 다시 불러옵니다.`, reload: true };
  }
  if (error.status === 404) {
    return { message: `주문 #${orderId}을(를) 찾을 수 없습니다. 최신 주문 목록을 다시 불러옵니다.`, reload: true };
  }
  // No answer: the server may have saved the change before the connection failed.
  if (error.timedOut) {
    return { message: `주문 #${orderId}: 서버 응답이 없어 상태가 변경되었는지 알 수 없습니다. 목록을 새로고침해 주세요.` };
  }
  if (error.status === undefined) {
    return { message: `주문 #${orderId}: 서버에 연결하지 못했습니다. 네트워크 상태를 확인한 뒤 목록을 새로고침해 주세요.` };
  }
  return { message: describeAdminError(error, `주문 #${orderId}의 상태를 변경하지 못했습니다. 잠시 후 다시 시도해 주세요.`) };
}

function AdminOrdersPage() {
  const { status, data: orders, error, retry, setData } = useAdminData(fetchAdminOrders);
  const [filter, setFilter] = useState('all');
  const [tableFilter, setTableFilter] = useState('all'); // 'all' or a table_id as a string (<select> value)
  const [detailOrderId, setDetailOrderId] = useState(null);
  // Orders with a status change in flight (several orders can change at once).
  const [busyOrderIds, setBusyOrderIds] = useState(() => new Set());
  // Same IDs, updated synchronously: blocks a second PATCH for an order before the disabled button renders.
  const pendingOrderIds = useRef(new Set());
  const [actionError, setActionError] = useState(null); // { message, loginExpired? }
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), ELAPSED_REFRESH_MS);
    return () => clearInterval(timer);
  }, []);

  // PATCH /api/admin/orders/:orderId/status; the card shows the order the server returned.
  const handleAdvance = async (order, nextStatus) => {
    const orderId = order.order_id;
    if (pendingOrderIds.current.has(orderId)) return;
    pendingOrderIds.current.add(orderId);
    setBusyOrderIds((current) => new Set(current).add(orderId));
    setActionError(null);
    try {
      const updated = await updateOrderStatus(order.order_id, nextStatus);
      setData((list) => list.map((item) => (item.order_id === updated.order_id ? updated : item)));
    } catch (advanceError) {
      if (advanceError.status === 401) {
        setActionError({ message: describeAdminError(advanceError), loginExpired: true });
      } else {
        const { message, reload } = describeAdvanceError(advanceError, order.order_id);
        setActionError({ message });
        if (reload) retry();
      }
    } finally {
      pendingOrderIds.current.delete(orderId);
      setBusyOrderIds((current) => {
        const next = new Set(current);
        next.delete(orderId);
        return next;
      });
    }
  };

  // Table filter: tables that have orders in the list (+ the selected one, so the <select> keeps its value).
  const tableIds = [...new Set([
    ...(orders ?? []).map((order) => order.table_id),
    ...(tableFilter === 'all' ? [] : [Number(tableFilter)]),
  ])].sort((a, b) => a - b);
  const visibleOrders = (orders ?? []).filter((order) => tableFilter === 'all' || order.table_id === Number(tableFilter));
  const countOf = (orderStatus) => visibleOrders.filter((order) => order.order_status === orderStatus).length;

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

      {actionError && (
        <div className="admin-alert admin-orders__alert" role="alert">
          <p>{actionError.message}</p>
          {actionError.loginExpired && <AdminLoginLink />}
        </div>
      )}

      {status === 'loading' && <AdminStateView status="loading" message="주문을 불러오는 중입니다…" />}
      {status === 'error' && <AdminLoadError error={error} fallback="주문을 불러오지 못했습니다." onRetry={retry} />}
      {status === 'success' && orders.length === 0 && (
        <AdminStateView status="empty" message="아직 들어온 주문이 없습니다." />
      )}

      {status === 'success' && orders.length > 0 && (
        <>
          <div className="admin-orders__toolbar">
            <label className="admin-orders__table-filter">
              <span className="admin-field__label">테이블</span>
              <select className="admin-input" value={tableFilter} onChange={(e) => setTableFilter(e.target.value)}>
                <option value="all">전체 테이블</option>
                {tableIds.map((tableId) => (
                  <option key={tableId} value={String(tableId)}>테이블 {tableId}</option>
                ))}
              </select>
            </label>

            <AdminTabs
              className="admin-orders__tabs"
              label="주문 상태"
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: '전체', count: visibleOrders.length },
                ...ORDER_STATUSES.map((item) => ({ value: item, label: item, count: countOf(item) })),
              ]}
            />
          </div>

          <div className="admin-kanban">
            {ORDER_STATUSES.map((columnStatus) => {
              const columnOrders = sortForColumn(visibleOrders, columnStatus);
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
                            isBusy={busyOrderIds.has(order.order_id)}
                            onAdvance={handleAdvance}
                            onOpenDetail={setDetailOrderId}
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

      {/* key: a new order starts with an empty dialog, never with the previous order's data. */}
      {detailOrderId !== null && (
        <AdminOrderDetailDialog key={detailOrderId} orderId={detailOrderId} onClose={() => setDetailOrderId(null)} />
      )}
    </>
  );
}

export default AdminOrdersPage;
