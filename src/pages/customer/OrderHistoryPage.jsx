import { Link, useOutletContext } from 'react-router-dom';
import { formatPrice } from '../../utils/format.js';
import './OrderHistoryPage.css';

import { useEffect, useState } from 'react';
import { fetchTableOrders } from '../../api/orderApi.js';
import {
  parseDbDateTime,
  toDateTimeAttr,
} from '../../utils/dateTime.js';


const statusClasses = {
  접수: 'received',
  '조리 중': 'cooking',
  '전달 완료': 'completed',
};

function formatOrderTime(value) {
  const date = parseDbDateTime(value);
  if (!date) return '-';

  return date.toLocaleString('ko-KR', {
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function getItemTotal(item) {
  const optionPrice = item.options.reduce(
    (sum, option) => sum + option.extra_price,
    0,
  );

  return (item.unit_price + optionPrice) * item.quantity;
}

function OrderHistoryPage() {
  const { tableId, toPath } = useOutletContext();

  const [history, setHistory] = useState({
    tableId: null,
    status: 'loading',
    orders: [],
    message: '',
  });

  useEffect(() => {
    let stopped = false;
    let refreshTimer;
    let controller;

    const loadHistory = async () => {
      if (stopped) return;

      controller = new AbortController();
      let timedOut = false;

      const timeoutTimer = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, 15000);

      try {
        const data = await fetchTableOrders(tableId, {
          signal: controller.signal,
        });

        if (stopped) return;

        setHistory({
          tableId,
          status: 'success',
          orders: data.orders,
          message: '',
        });
      } catch (error) {
        if (stopped) return;

        const message = timedOut
          ? '서버 응답이 늦어지고 있습니다. 잠시 후 다시 확인합니다.'
          : error.message || '주문 내역을 불러오지 못했습니다.';

        setHistory((previous) => {
          // 자동 갱신에 실패해도 이미 조회한 주문 내역은 유지한다.
          if (
            previous.tableId === tableId &&
            previous.status === 'success'
          ) {
            return {
              ...previous,
              message,
            };
          }

          return {
            tableId,
            status: 'error',
            orders: [],
            message,
          };
        });
      } finally {
        clearTimeout(timeoutTimer);

        // 앞선 요청이 끝난 뒤 다음 요청을 예약한다.
        if (!stopped) {
          refreshTimer = setTimeout(loadHistory, 5000);
        }
      }
    };

    loadHistory();

    return () => {
      stopped = true;
      clearTimeout(refreshTimer);
      controller?.abort();
    };
  }, [tableId]);

  const isCurrentTable = history.tableId === tableId;
  const status = isCurrentTable ? history.status : 'loading';
  const orders = isCurrentTable ? history.orders : [];

  const totalPrice = orders.reduce(
    (sum, order) => sum + order.total_price,
    0,
  );

  return (
    <section className="order-section">
      <div className="order-section__head">
        <Link
          className="order-back"
          to={toPath('/order')}
          aria-label="메뉴 화면으로 돌아가기"
        >
          ←
        </Link>

        <h1 className="order-section__title">주문 내역</h1>
      </div>

      

      {status === 'loading' && (
        <p role="status">주문 내역을 불러오는 중입니다.</p>
      )}

      {status === 'error' && (
        <p role="alert">
          {history.message} 잠시 후 자동으로 다시 시도합니다.
        </p>
      )}
      
      {status === 'success' && history.message && (
        <p role="status">
          {history.message} 현재 표시된 주문 내역은 마지막 조회 결과입니다.
        </p>
      )}

      {status === 'success' && (orders.length === 0 ? (
        <div className="history-empty">
          <p>아직 주문 내역이 없습니다.</p>

          <Link
            className="order-btn order-btn--primary"
            to={toPath('/order')}
          >
            메뉴 보러 가기
          </Link>
        </div>
      ) : (
        <>
          <ul className="history-list">
            {orders.map((order) => (
              <li key={order.order_id} className="history-card">
                <div className="history-card__head">
                  <div>
                    <h2 className="history-card__title">
                      주문 #{order.order_id}
                    </h2>

                    <time
                      className="history-card__time"
                      dateTime={toDateTimeAttr(order.order_time)}
                    >
                      {formatOrderTime(order.order_time)}
                    </time>
                  </div>

                  <span
                    className={`history-status history-status--${
                      statusClasses[order.order_status] ?? 'received'
                    }`}
                  >
                    {order.order_status}
                  </span>
                </div>

                <ul className="history-items">
                  {order.items.map((item) => (
                    <li
                      key={item.order_detail_id}
                      className="history-item"
                    >
                      <div className="history-item__row">
                        <span className="history-item__name">
                          {item.menu_name}
                          <span className="history-item__quantity">
                            {' '}× {item.quantity}
                          </span>
                        </span>

                        <strong>
                          {formatPrice(getItemTotal(item))}
                        </strong>
                      </div>

                      {item.options.length > 0 && (
                        <ul className="history-options">
                          {item.options.map((option) => (
                            <li key={option.option_id}>
                              + {option.option_name}
                              {' '}({formatPrice(option.extra_price)})
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>

                <div className="history-card__total">
                  <span>주문 금액</span>
                  <strong>{formatPrice(order.total_price)}</strong>
                </div>
              </li>
            ))}
          </ul>

          <div className="history-summary">
            <span>총 주문 금액</span>
            <strong>{formatPrice(totalPrice)}</strong>
          </div>

          <div className="order-actions">
            <Link
              className="order-btn order-btn--primary"
              to={toPath('/order')}
            >
              추가 주문하기
            </Link>
          </div>
        </>
      ))}
    </section>
  );
}

export default OrderHistoryPage;