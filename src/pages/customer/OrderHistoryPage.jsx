import { Link, useOutletContext } from 'react-router-dom';
import { formatPrice } from '../../utils/format.js';
import './OrderHistoryPage.css';

// 화면 확인용 임시 데이터.
// 실제 연동 시 현재 테이블의 활성 세션에 속한 주문 조회 결과로 교체한다.
const mockOrders = [
  {
    order_id: 2,
    order_status: '접수',
    created_at: '2026-11-16T19:10:00+09:00',
    total_price: 5000,
    items: [
      {
        order_detail_id: 3,
        menu_name: '콜라',
        quantity: 2,
        unit_price: 2500,
        options: [],
      },
    ],
  },
  {
    order_id: 1,
    order_status: '조리 중',
    created_at: '2026-11-16T19:00:00+09:00',
    total_price: 20000,
    items: [
      {
        order_detail_id: 1,
        menu_name: '김치찌개',
        quantity: 2,
        unit_price: 9000,
        options: [
          {
            option_id: 1,
            option_name: '공기밥 추가',
            additional_price: 1000,
          },
        ],
      },
    ],
  },
];

const statusClasses = {
  접수: 'received',
  '조리 중': 'cooking',
  '전달 완료': 'completed',
};

function formatOrderTime(value) {
  return new Date(value).toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function getItemTotal(item) {
  const optionPrice = item.options.reduce(
    (sum, option) => sum + option.additional_price,
    0,
  );

  return (item.unit_price + optionPrice) * item.quantity;
}

function OrderHistoryPage() {
  const { tableId, toPath } = useOutletContext();

  // 주문이 없는 화면을 확인하려면 mockOrders 대신 []로 바꾸면 된다.
  const orders = mockOrders;

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

      <p className="history-description">
        테이블 {tableId}번의 이번 이용 중 주문 내역입니다.
      </p>

      <p className="history-preview">
        화면 확인용 예시입니다. 실제 주문 내역은 아직 연결되지 않았습니다.
      </p>

      {orders.length === 0 ? (
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
                      dateTime={order.created_at}
                    >
                      {formatOrderTime(order.created_at)}
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
                              {' '}({formatPrice(option.additional_price)})
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
      )}
    </section>
  );
}

export default OrderHistoryPage;