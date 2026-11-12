const numberFormatter = new Intl.NumberFormat('ko-KR');

// 12000 -> "12,000원"
export function formatPrice(amount) {
  return `${numberFormatter.format(amount)}원`;
}

// Option additional price: 0 -> "무료", 1500 -> "+1,500원"
export function formatOptionPrice(amount) {
  return amount > 0 ? `+${formatPrice(amount)}` : '무료';
}
