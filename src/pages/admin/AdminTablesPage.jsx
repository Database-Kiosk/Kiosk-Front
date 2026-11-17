import { useEffect, useState } from 'react';
import AdminPageHeader from '../../components/admin/AdminPageHeader.jsx';
import AdminStateView from '../../components/admin/AdminStateView.jsx';
import AdminTabs from '../../components/admin/AdminTabs.jsx';
import StatusBadge from '../../components/admin/StatusBadge.jsx';
import SummaryCard from '../../components/admin/SummaryCard.jsx';
import { closeTableSession, fetchAdminTables } from '../../api/adminApi.js';
import { useAdminData } from '../../hooks/useAdminData.js';
import { formatPrice } from '../../utils/format.js';
import { formatClock, formatElapsed } from '../../utils/dateTime.js';
import AdminTableDetailDialog from '../../components/admin/AdminTableDetailDialog.jsx';
import './AdminTablesPage.css';

const ELAPSED_REFRESH_MS = 30000;

function AdminTablesPage() {
  const { status, data: tables, retry, setData } = useAdminData(fetchAdminTables);
  const [filter, setFilter] = useState('all');
  const [busyTableId, setBusyTableId] = useState(null);
  const [actionError, setActionError] = useState('');
  const [now, setNow] = useState(() => new Date());
  const [selectedTableId, setSelectedTableId] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), ELAPSED_REFRESH_MS);
    return () => clearInterval(timer);
  }, []);

  // MOCK: ends the session in the in-memory mock data only (see api/adminApi.js).
  // Closing with undelivered orders is allowed after a warning: a design-only policy. The real rule
  // (block or allow) is decided when the server API is built.
  const handleClose = async (table) => {
    const { pending_count: pendingCount } = table.session;
    const warning = pendingCount > 0 ? `아직 전달되지 않은 주문이 ${pendingCount}건 있습니다.\n` : '';
    const confirmed = window.confirm(
      `${warning}테이블 ${table.table_id}번을 이용 완료 처리할까요?\n(개발용 mock: 서버에는 저장되지 않습니다)`,
    );
    if (!confirmed) return;

    setBusyTableId(table.table_id);
    setActionError('');
    try {
      const updated = await closeTableSession(table.table_id);
      setData((list) => list.map((item) => (item.table_id === updated.table_id ? updated : item)));
    } catch {
      setActionError(`테이블 ${table.table_id}번을 이용 완료 처리하지 못했습니다. 목록을 새로고침해 주세요.`);
    } finally {
      setBusyTableId(null);
    }
  };

  const inUse = tables?.filter((table) => table.table_status === '이용 중') ?? [];
  const visibleTables = tables?.filter((table) => filter === 'all' || table.table_status === filter) ?? [];

  return (
    <>
      <AdminPageHeader title="테이블 관리" description="테이블 이용 상태와 현재 이용 중인 세션을 확인합니다.">
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

      {status === 'loading' && <AdminStateView status="loading" message="테이블 정보를 불러오는 중입니다…" />}
      {status === 'error' && <AdminStateView status="error" message="테이블 정보를 불러오지 못했습니다." onRetry={retry} />}
      {status === 'success' && tables.length === 0 && (
        <AdminStateView status="empty" message="등록된 테이블이 없습니다." />
      )}

      {status === 'success' && tables.length > 0 && (
        <>
          <div className="admin-summary-grid">
            <SummaryCard label="전체 테이블" value={`${tables.length}개`} />
            <SummaryCard label="이용 중" value={`${inUse.length}개`} tone="accent" />
            <SummaryCard label="이용 가능" value={`${tables.length - inUse.length}개`} />
            <SummaryCard
              label="이용 중 테이블 주문 금액"
              value={formatPrice(inUse.reduce((sum, table) => sum + (table.session?.total_price ?? 0), 0))}
            />
          </div>

          <AdminTabs
            className="admin-tables__tabs"
            label="테이블 상태"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: '전체', count: tables.length },
              { value: '이용 중', label: '이용 중', count: inUse.length },
              { value: '이용 가능', label: '이용 가능', count: tables.length - inUse.length },
            ]}
          />

          {visibleTables.length === 0 ? (
            <AdminStateView status="empty" message={`${filter} 상태의 테이블이 없습니다.`} />
          ) : (
            <ul className="admin-table-grid">
              {visibleTables.map((table) => (
                <li key={table.table_id} className={`admin-table-card${table.session ? ' is-in-use' : ''}`}>
                  <div className="admin-table-card__head">
                    <h2 className="admin-table-card__number">{table.table_id}번</h2>
                    <StatusBadge status={table.table_status} />
                  </div>


                  {table.session ? (
                    <>
                      <dl className="admin-table-card__info">
                        <div>
                          <dt>이용 시작</dt>
                          <dd>
                            {formatClock(table.session.started_at)}
                            <span className="admin-table-card__elapsed">
                              {formatElapsed(table.session.started_at, now)}
                            </span>
                          </dd>
                        </div>
                        <div>
                          <dt>주문</dt>
                          <dd>
                            {table.session.order_count}건
                            {table.session.pending_count > 0 && (
                              <span className="admin-table-card__pending">미전달 {table.session.pending_count}</span>
                            )}
                          </dd>
                        </div>
                        <div>
                          <dt>주문 금액</dt>
                          <dd>{formatPrice(table.session.total_price)}</dd>
                        </div>
                      </dl>
                      <div className="admin-table-card__actions">
                        <button
                          type="button"
                          className="admin-btn admin-btn--secondary"
                          onClick={() => setSelectedTableId(table.table_id)}
                        >
                          상세 보기
                        </button>

                        <button
                          type="button"
                          className="admin-btn admin-btn--secondary"
                          disabled={busyTableId === table.table_id}
                          onClick={() => handleClose(table)}
                        >
                          {busyTableId === table.table_id
                            ? '처리 중…'
                            : '이용 완료 처리'}
                        </button>
                      </div>
                    </>
                  ) : (
                    <p className="admin-table-card__idle">손님을 기다리는 중입니다.</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      {selectedTableId !== null && (
        <AdminTableDetailDialog
          key={selectedTableId}
          tableId={selectedTableId}
          table={tables?.find(
            (item) => item.table_id === selectedTableId,
          )}
          onClose={() => setSelectedTableId(null)}
        />
      )}
    </>
  );
}

export default AdminTablesPage;
