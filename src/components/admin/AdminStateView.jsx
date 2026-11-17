import './AdminStateView.css';

// Loading / empty / error message for admin screens.
// status: 'loading' | 'empty' | 'error'. `onRetry` adds a retry button to the error state.
// `children` = an optional action for the empty state (e.g. "메뉴 추가").
const DEFAULT_MESSAGES = {
  loading: '불러오는 중입니다…',
  empty: '표시할 내용이 없습니다.',
  error: '데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.',
};

function AdminStateView({ status, message, onRetry, children }) {
  const text = message ?? DEFAULT_MESSAGES[status];

  if (status === 'loading') {
    return (
      <div className="admin-state admin-state--loading" role="status">
        <span className="admin-state__spinner" aria-hidden="true" />
        <p className="admin-state__text">{text}</p>
      </div>
    );
  }

  return (
    <div className={`admin-state admin-state--${status}`} role={status === 'error' ? 'alert' : undefined}>
      <p className="admin-state__text">{text}</p>
      {status === 'error' && onRetry && (
        <button type="button" className="admin-btn admin-btn--secondary" onClick={onRetry}>
          다시 시도
        </button>
      )}
      {children}
    </div>
  );
}

export default AdminStateView;
