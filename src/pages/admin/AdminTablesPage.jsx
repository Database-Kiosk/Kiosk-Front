import { useEffect, useRef, useState } from 'react';
import AdminPageHeader from '../../components/admin/AdminPageHeader.jsx';
import AdminStateView from '../../components/admin/AdminStateView.jsx';
import AdminLoadError from '../../components/admin/AdminLoadError.jsx';
import AdminTabs from '../../components/admin/AdminTabs.jsx';
import StatusBadge from '../../components/admin/StatusBadge.jsx';
import SummaryCard from '../../components/admin/SummaryCard.jsx';
import { closeTableSession, describeAdminError, fetchAdminTables } from '../../api/adminApi.js';
import { useAdminData } from '../../hooks/useAdminData.js';
import { formatPrice } from '../../utils/format.js';
import { formatClock, formatElapsed } from '../../utils/dateTime.js';
import AdminTableDetailDialog from '../../components/admin/AdminTableDetailDialog.jsx';
import './AdminTablesPage.css';

const ELAPSED_REFRESH_MS = 30000;

function TablePopup({
  title,
  message,
  onConfirm,
  onCancel,
}) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog.open) dialog.showModal();

    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="table-popup"
      aria-labelledby="table-popup-title"
      aria-describedby="table-popup-message"
      onCancel={(event) => {
        event.preventDefault();
        (onCancel || onConfirm)();
      }}
    >
      <h2 id="table-popup-title">{title}</h2>
      <p id="table-popup-message">{message}</p>

      <div className="table-popup__actions">
        {onCancel && (
          <button
            type="button"
            className="admin-btn admin-btn--secondary"
            onClick={onCancel}
          >
            취소
          </button>
        )}

        <button
          type="button"
          className="admin-btn admin-btn--secondary"
          onClick={onConfirm}
          autoFocus
        >
          확인
        </button>
      </div>
    </dialog>
  );
}

function AdminTablesPage() {
  const { status, data: tables, error, retry, setData } = useAdminData(fetchAdminTables);
  const [filter, setFilter] = useState('all');
  const [busyTableId, setBusyTableId] = useState(null);
  const [now, setNow] = useState(() => new Date());
  const [selectedTableId, setSelectedTableId] = useState(null);
  const [confirmTable, setConfirmTable] = useState(null);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), ELAPSED_REFRESH_MS);
    return () => clearInterval(timer);
  }, []);

  // 이용 완료 버튼을 누르면 확인 팝업 표시
  const handleClose = (table) => {
    if (busyTableId !== null || !table.session) return;

    setConfirmTable(table);
  };

  // 팝업에서 확인을 누르면 실제 API 호출
  const handleConfirmClose = async () => {
    if (!confirmTable || busyTableId !== null) return;

    const table = confirmTable;

    setConfirmTable(null);
    setBusyTableId(table.table_id);

    try {
      const updated = await closeTableSession(table.table_id);

      setData((list) =>
        list.map((item) =>
          item.table_id === updated.table_id ? updated : item,
        ),
      );

      setSelectedTableId((current) =>
        current === table.table_id ? null : current,
      );

      setNotice(`테이블 ${table.table_id}번의 이용이 종료되었습니다.`);
    } catch (error) {
      const fallback = '테이블 이용을 종료하지 못했습니다.';

      const message =
        error.status >= 400 &&
        error.status < 500 &&
        error.status !== 401
          ? error.serverMessage || fallback
          : describeAdminError(error, fallback);

      setNotice(
        error.status === undefined
          ? `${message} 목록을 새로고침해 처리 결과를 확인해 주세요.`
          : message,
      );
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
          disabled={status === 'loading' || busyTableId !== null}
        >
          새로고침
        </button>
      </AdminPageHeader>

      {status === 'loading' && <AdminStateView status="loading" message="테이블 정보를 불러오는 중입니다…" />}
      {status === 'error' && <AdminLoadError error={error} fallback="테이블 정보를 불러오지 못했습니다." onRetry={retry} />}
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
                          className="admin-btn admin-btn--secondary admin-table-card__detail"
                          onClick={() => setSelectedTableId(table.table_id)}
                        >
                          상세 보기
                          <span aria-hidden="true"></span>
                        </button>

                        <button
                          type="button"
                          className="admin-btn admin-btn--secondary admin-table-card__complete"
                          disabled={busyTableId !== null}
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
      {confirmTable && (
        <TablePopup
          title="테이블 이용 완료"
          message={`테이블 ${confirmTable.table_id}번의 이용을 완료 처리할까요?`}
          onConfirm={handleConfirmClose}
          onCancel={() => setConfirmTable(null)}
        />
      )}

      {notice && (
        <TablePopup
          title="안내"
          message={notice}
          onConfirm={() => setNotice('')}
        />
      )}
    </>
  );
}

export default AdminTablesPage;
