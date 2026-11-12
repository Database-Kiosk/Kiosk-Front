import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import CartItem from '../../components/customer/CartItem.jsx';
import BottomActionBar from '../../components/customer/BottomActionBar.jsx';
import { formatPrice } from '../../utils/format.js';

// Customer cart page. Entry URL: /order/cart?table={tableId}
// Cart state, totals and storage come from useCart (via OrderLayout).
function CartPage() {
  const { toPath, cart } = useOutletContext();
  const navigate = useNavigate();
  const isEmpty = cart.items.length === 0;

  return (
    <section className="order-section">
      <div className="order-section__head">
        <Link className="order-back" to={toPath('/order')} aria-label="메뉴로 돌아가기">
          ←
        </Link>
        <h1 className="order-section__title">장바구니</h1>
      </div>

      {isEmpty ? (
        <div className="cart-empty">
          <p className="cart-empty__title">장바구니가 비어 있어요.</p>
          <p className="cart-empty__text">메뉴를 선택해 장바구니에 담아주세요.</p>
          <Link className="order-btn order-btn--primary cart-empty__button" to={toPath('/order')}>
            메뉴 보러 가기
          </Link>
        </div>
      ) : (
        <>
          <ul className="cart-list">
            {cart.items.map((item) => (
              <li key={item.key}>
                <CartItem item={item} onQuantityChange={cart.updateQuantity} onRemove={cart.removeItem} />
              </li>
            ))}
          </ul>

          <Link className="order-btn order-btn--secondary cart-more" to={toPath('/order')}>
            + 메뉴 더 담기
          </Link>

          <dl className="cart-summary">
            <div className="cart-summary__row">
              <dt>총 수량</dt>
              <dd>{cart.totalCount}개</dd>
            </div>
            <div className="cart-summary__row cart-summary__row--total">
              <dt>총 주문 금액</dt>
              <dd>{formatPrice(cart.totalPrice)}</dd>
            </div>
          </dl>

          <BottomActionBar
            label={`${formatPrice(cart.totalPrice)} 주문하기`}
            onClick={() => navigate(toPath('/order/confirm'))}
            narrow
          />
        </>
      )}
    </section>
  );
}

export default CartPage;
