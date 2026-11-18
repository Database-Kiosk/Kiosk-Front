import { useState } from 'react';
import AdminPageHeader from '../../components/admin/AdminPageHeader.jsx';
import AdminStateView from '../../components/admin/AdminStateView.jsx';
import AdminTabs from '../../components/admin/AdminTabs.jsx';
import SummaryCard from '../../components/admin/SummaryCard.jsx';
import { describeAdminError, fetchSalesReport } from '../../api/adminApi.js';
import { useAdminData } from '../../hooks/useAdminData.js';
import { formatPrice } from '../../utils/format.js';
import { formatDayLabel, toDbDate } from '../../utils/dateTime.js';

import './AdminSalesPage.css';

// Sales basis for this design: sum of all order totals (temporary; decided with the backend API).
const PERIODS = [
  { value: 'today', label: '오늘' },
  { value: 'week', label: '최근 7일' },
  { value: 'month', label: '최근 30일' },
  { value: 'calendarMonth', label: '월별' },
];

const MONTH_PATTERN = /^[1-9]\d{3}-(0[1-9]|1[0-2])$/;

const numberFormatter = new Intl.NumberFormat('ko-KR');

// Horizontal bar inside a table cell (no chart library). ratio: 0–1
function RatioBar({ ratio }) {
  return (
    <span className="admin-sales__bar" aria-hidden="true">
      <span className="admin-sales__bar-fill" style={{ width: `${Math.round(ratio * 100)}%` }} />
    </span>
  );
}

function AdminSalesPage() {
  const [period, setPeriod] = useState('today');
  const [selectedMonth, setSelectedMonth] = useState(
    () => toDbDate(new Date()).slice(0, 7),
  );
  const [monthInput, setMonthInput] = useState(selectedMonth);

  const isCalendarMonth = period === 'calendarMonth';
  const query = isCalendarMonth ? selectedMonth : period;
  const { status, data: report, error, retry } = useAdminData(fetchSalesReport, query);

  const summary = report?.summary;
  const maxDaily = Math.max(1, ...(report?.daily.map((day) => day.total_sales) ?? []));

  const periodLabel = isCalendarMonth
    ? `${selectedMonth.slice(0, 4)}년 ${Number(selectedMonth.slice(5))}월`
    : PERIODS.find((item) => item.value === period).label;

  const canSearchMonth = MONTH_PATTERN.test(monthInput) && monthInput !== '9999-12';

  function handleMonthSubmit(event) {
    event.preventDefault();
    if (!canSearchMonth) return;

    if (monthInput === selectedMonth) {
      retry();
      return;
    }

    setSelectedMonth(monthInput);
  }

  return (
    <>
      <AdminPageHeader title="매출 조회" description="조회 기간 내 전체 주문 금액을 집계합니다.">
        <div className="admin-sales__filters">
          <AdminTabs
            label="조회 기간"
            options={PERIODS}
            value={period}
            onChange={setPeriod}
          />

          {isCalendarMonth && (
            <form className="admin-sales__month-form" onSubmit={handleMonthSubmit}>
              <label htmlFor="sales-month">기준 월</label>
              <input
                id="sales-month"
                type="month"
                placeholder="YYYY-MM"
                value={monthInput}
                onChange={(event) => setMonthInput(event.target.value)}
                required
              />
              <button type="submit" disabled={!canSearchMonth}>
                조회
              </button>
            </form>
          )}
        </div>
      </AdminPageHeader>

      {status === 'loading' && (
        <AdminStateView status="loading" message="매출을 불러오는 중입니다…" />
      )}

      {status === 'error' && (
        <AdminStateView
          status="error"
          message={describeAdminError(error, '매출을 불러오지 못했습니다.')}
          onRetry={retry}
        />
      )}

      {status === 'success' && summary.order_count === 0 && (
        <AdminStateView
          status="empty"
          message={`조회 기간(${periodLabel})에 저장된 주문이 없습니다.`}
        />
      )}

      {status === 'success' && summary.order_count > 0 && (
        <>
          <div className="admin-summary-grid">
            <SummaryCard label={`${periodLabel} 매출`} value={formatPrice(summary.total_sales)} tone="accent" />
            <SummaryCard label="주문 수" value={`${numberFormatter.format(summary.order_count)}건`} />
            <SummaryCard label="평균 주문 금액" value={formatPrice(summary.average_order_price)} />
            <SummaryCard label="판매 수량" value={`${numberFormatter.format(summary.quantity)}개`} />
          </div>

          <div className="admin-sales__grid">
            <section className="admin-card">
              <h2 className="admin-card__title">일자별 매출</h2>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th scope="col">날짜</th>
                      <th scope="col" className="is-number">주문 수</th>
                      <th scope="col" className="is-number">매출</th>
                      <th scope="col"><span className="admin-sr-only">비율</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.daily.map((day) => (
                      <tr key={day.date}>
                        <td>{formatDayLabel(day.date)}</td>
                        <td className="is-number">{numberFormatter.format(day.order_count)}건</td>
                        <td className="is-number">{formatPrice(day.total_sales)}</td>
                        <td className="admin-sales__bar-cell"><RatioBar ratio={day.total_sales / maxDaily} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="admin-card">
              <h2 className="admin-card__title">메뉴별 판매</h2>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th scope="col">순위</th>
                      <th scope="col">메뉴</th>
                      <th scope="col" className="is-number">수량</th>
                      <th scope="col" className="is-number">매출</th>
                      <th scope="col" className="is-number">비중</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.menus.map((menu, index) => {
                      const share = summary.total_sales > 0 ? menu.total_sales / summary.total_sales : 0;
                      return (
                        <tr key={menu.menu_id}>
                          <td>{index + 1}</td>
                          <td>
                            <span className="admin-sales__menu">{menu.menu_name}</span>
                            <span className="admin-sales__category">{menu.category_name}</span>
                          </td>
                          <td className="is-number">{numberFormatter.format(menu.quantity)}</td>
                          <td className="is-number">{formatPrice(menu.total_sales)}</td>
                          <td className="is-number">{(share * 100).toFixed(1)}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </>
      )}
    </>
  );
}

export default AdminSalesPage;
