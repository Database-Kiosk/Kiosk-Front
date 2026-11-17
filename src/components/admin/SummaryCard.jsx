import './SummaryCard.css';

// Number card for summaries (sales, tables). tone: 'default' | 'accent'
function SummaryCard({ label, value, hint, tone = 'default' }) {
  return (
    <div className={`admin-summary-card admin-summary-card--${tone}`}>
      <p className="admin-summary-card__label">{label}</p>
      <p className="admin-summary-card__value">{value}</p>
      {hint && <p className="admin-summary-card__hint">{hint}</p>}
    </div>
  );
}

export default SummaryCard;
