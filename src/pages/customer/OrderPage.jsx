import { useSearchParams } from 'react-router-dom';

// Customer order page. Entry URL: /order?table={tableId}
function OrderPage() {
  const [searchParams] = useSearchParams();
  const tableParam = searchParams.get('table');
  const tableId = Number(tableParam);
  const isValidTable = tableParam !== null && Number.isInteger(tableId) && tableId > 0;

  return (
    <main className="page">
      <h1>주문하기</h1>
      {isValidTable ? (
        <p className="table-number">테이블 {tableId}번</p>
      ) : (
        <p className="muted">테이블 번호가 올바르지 않습니다. QR 코드를 다시 확인해 주세요.</p>
      )}
    </main>
  );
}

export default OrderPage;
