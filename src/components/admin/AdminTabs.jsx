import './AdminTabs.css';

// Segmented filter buttons (order status, table status, menu category, sales period).
// options: [{ value, label, count? }]
function AdminTabs({ label, options, value, onChange, className = '' }) {
  return (
    <div className={`admin-tabs ${className}`.trim()} role="group" aria-label={label}>
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            className={`admin-tabs__tab${isActive ? ' is-active' : ''}`}
            aria-pressed={isActive}
            onClick={() => onChange(option.value)}
          >
            {option.label}
            {option.count !== undefined && <span className="admin-tabs__count">{option.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

export default AdminTabs;
