// Order / table status badge. Order colors match the customer order history (OrderHistoryPage.css).
const STATUS_TONES = {
  접수: 'received',
  '조리 중': 'cooking',
  '전달 완료': 'completed',
  '이용 중': 'in-use',
  '이용 가능': 'available',
};

function StatusBadge({ status }) {
  return <span className={`admin-badge admin-badge--${STATUS_TONES[status] ?? 'neutral'}`}>{status}</span>;
}

export default StatusBadge;
