
import { useEffect, useRef } from 'react';
import {
  describeAdminError,
  fetchAdminTableOrders,
} from '../../api/adminApi.js';
import { useAdminData } from '../../hooks/useAdminData.js';
import StatusBadge from './StatusBadge.jsx';
import { formatPrice } from '../../utils/format.js';
import { formatDateTime, parseDbDateTime } from '../../utils/dateTime.js';
import './AdminTableDetailDialog.css';



// '2026-11-19 12:30:05' → '11월 19일 (목) 12:30'. Parsed by the shared helper (new Date() does not parse
// this format the same way in every browser). No or invalid date → '—' as before.
function formatDate(value) {
  return parseDbDateTime(value) ? formatDateTime(value) : '—';
}

function AdminTableDetailDialog({ tableId, table, onClose }) {
  const dialogRef = useRef(null);

  const {
    status,
    data: history,
    error,
    retry,
  } = useAdminData(fetchAdminTableOrders, tableId);

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = 'hidden';

    if (!dialog.open) {
      dialog.showModal();
    }

    return () => {
      document.body.style.overflow = previousOverflow;

      if (dialog.open) {
        dialog.close();
      }
    };
  }, []);

  const orders = history?.orders ?? [];
  const session = table?.session;
  const tableStatus =
    table?.table_status ?? (session ? '이용 중' : '이용 가능');
  const totalPrice = history?.total_price ?? 0;
  const pendingCount = orders.filter(
    (order) => order.order_status !== '전달 완료',
  ).length;

  return (
    <dialog
      ref={dialogRef}
      className="table-detail"
      aria-labelledby="table-detail-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="table-detail__layout">
        <header className="table-detail__header">
          <div>
            <p className="table-detail__eyebrow">TABLE INFORMATION</p>
            <h2 id="table-detail-title">테이블 {tableId} 상세</h2>
          </div>
        </header>

        <div className="table-detail__body" aria-busy={status === 'loading'}>
          {status === 'loading' && (
            <p className="table-detail__message" role="status">
              테이블 정보를 불러오는 중입니다…
            </p>
          )}

          {status === 'error' && (
            <div className="table-detail__message" role="alert">
              <p>
                {describeAdminError(
                  error,
                  '테이블 정보를 불러오지 못했습니다.',
                )}
              </p>
              <button
                type="button"
                className="admin-btn admin-btn--secondary"
                onClick={retry}
              >
                다시 시도
              </button>
            </div>
          )}

          {status === 'success' && (
            <>
              <dl className="table-detail__info">
                <div>
                  <dt>테이블</dt>
                  <dd>{tableId}번</dd>
                </div>

                <div>
                  <dt>이용 상태</dt>
                  <dd>
                    <StatusBadge status={tableStatus} />
                  </dd>
                </div>

                <div>
                  <dt>이용 시작</dt>
                  <dd>{formatDate(session?.started_at)}</dd>
                </div>

                <div>
                  <dt>주문 건수</dt>
                  <dd>
                    {orders.length}건
                    {pendingCount > 0 && (
                      <span className="table-detail__pending">
                        미전달 {pendingCount}건
                      </span>
                    )}
                  </dd>
                </div>
              </dl>

              <section
                className="table-detail__orders"
                aria-labelledby="table-detail-orders-title"
              >
                <h3 id="table-detail-orders-title">현재 주문 내역</h3>

                {orders.length === 0 ? (
                  <div className="table-detail__empty">
                    <strong>
                      {session
                        ? '아직 주문 내역이 없습니다.'
                        : '현재 이용 중인 손님이 없습니다.'}
                    </strong>
                    <p>
                      {session
                        ? '주문이 접수되면 이곳에 표시됩니다.'
                        : '첫 주문이 접수되면 테이블 이용이 시작됩니다.'}
                    </p>
                  </div>
                ) : (
                  <div className="table-detail__order-list">
                    {orders.map((order) => (
                      <article
                        key={order.order_id}
                        className="table-detail__order"
                      >
                        <header className="table-detail__order-header">
                          <div>
                            <h4>주문 #{order.order_id}</h4>
                            <p>{formatDate(order.order_time)}</p>
                          </div>
                          <StatusBadge status={order.order_status} />
                        </header>

                        <ul className="table-detail__items">
                          {(order.items ?? []).map((item, index) => {
                            const options = item.options ?? [];
                            const unitPrice = Number(item.unit_price);
                            const optionPrice = options.reduce(
                              (sum, option) =>
                                sum + Number(option.extra_price),
                              0,
                            );
                            const priceWithOptions = unitPrice + optionPrice;
                            const subtotal =
                              priceWithOptions * Number(item.quantity);

                            return (
                              <li
                                key={item.order_detail_id ?? index}
                                className="table-detail__item"
                              >
                                <div className="table-detail__row">
                                  <strong>{item.menu_name}</strong>
                                  <strong>{formatPrice(unitPrice)}</strong>
                                </div>

                                {options.length > 0 && (
                                  <ul className="table-detail__options">
                                    {options.map((option, optionIndex) => (
                                      <li
                                        key={option.option_id ?? optionIndex}
                                        className="table-detail__row"
                                      >
                                        <span>+ {option.option_name}</span>
                                        <span>
                                          +{formatPrice(
                                            Number(option.extra_price),
                                          )}
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                )}

                                <div className="table-detail__row table-detail__quantity">
                                  <span>
                                    {formatPrice(priceWithOptions)} ×{' '}
                                    {item.quantity}개
                                  </span>
                                  <strong>{formatPrice(subtotal)}</strong>
                                </div>
                              </li>
                            );
                          })}
                        </ul>

                        <div className="table-detail__order-total">
                          <span>주문 금액</span>
                          <strong>
                            {formatPrice(Number(order.total_price))}
                          </strong>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>

              <div className="table-detail__total">
                <span>누적 주문 총액</span>
                <strong>{formatPrice(Number(totalPrice))}</strong>
              </div>
            </>
          )}
        </div>

        <footer className="table-detail__footer">
          <button
            type="button"
            className="admin-btn admin-btn--secondary table-detail__close"
            onClick={onClose}
            autoFocus
          >
            닫기
          </button>
        </footer>
      </div>
    </dialog>
  );
}

export default AdminTableDetailDialog;