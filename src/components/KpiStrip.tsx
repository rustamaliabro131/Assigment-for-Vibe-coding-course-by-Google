import React from 'react';
import { DashboardKPIs } from '../types/sales';
import { formatCurrency, formatDateShort, formatPercent, shortenProductName } from '../utils/salesData';

interface KpiStripProps {
  kpis: DashboardKPIs;
}

export const KpiStrip: React.FC<KpiStripProps> = ({ kpis }) => {
  const items = [
    {
      label: 'Total Revenue',
      value: formatCurrency(kpis.totalRevenue),
      meta: `${formatCurrency(kpis.avgDailyRevenue)} / active day · ${kpis.activeDays} days`,
    },
    {
      label: 'Unique Orders',
      value: kpis.uniqueOrders.toLocaleString(),
      meta: `${kpis.totalItems.toLocaleString()} line items · ${kpis.itemsPerOrder.toFixed(2)} items / order`,
    },
    {
      label: 'Average Order Value',
      value: formatCurrency(kpis.avgOrderValue),
      meta: `Avg unit ${formatCurrency(kpis.avgItemPrice)}${
        kpis.peakDay ? ` · Peak ${formatDateShort(kpis.peakDay.date)} (${formatCurrency(kpis.peakDay.revenue, 0)})` : ''
      }`,
    },
    {
      label: 'Multi-Item Orders',
      value: `${kpis.multiItemOrders} (${formatPercent(kpis.multiItemRate)})`,
      meta: `${kpis.splitPaymentOrders} split-payment orders${
        kpis.topProduct ? ` · Top: ${shortenProductName(kpis.topProduct.name)}` : ''
      }`,
    },
  ];

  return (
    <section
      aria-label="Key sales metrics"
      className="bg-emerald-700 dark:bg-emerald-900 text-white border border-emerald-800/80 dark:border-emerald-700/80 rounded-xl grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-emerald-600/70 dark:divide-emerald-800/80"
    >
      {items.map((kpi, idx) => (
        <div
          key={kpi.label}
          className={`px-5 py-4 flex flex-col justify-between gap-1.5 min-w-0 ${
            idx >= 2
              ? 'sm:border-t xl:border-t-0 sm:border-emerald-600/70 dark:sm:border-emerald-800/80'
              : ''
          }`}
        >
          <span className="text-xs font-medium text-emerald-100">
            {kpi.label}
          </span>
          <span className="text-2xl font-mono font-semibold tracking-tight text-white tabular-nums truncate">
            {kpi.value}
          </span>
          <span className="text-xs text-emerald-100/90 truncate tabular-nums">
            {kpi.meta}
          </span>
        </div>
      ))}
    </section>
  );
};
