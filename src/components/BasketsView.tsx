import React, { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { OrderSummary, PaymentMetric } from '../types/sales';
import {
  buildCoPurchasePairs,
  buildOrderValueDistribution,
  formatCurrency,
  formatDateShort,
  formatPercent,
  shortenProductName,
} from '../utils/salesData';
import { ChartPanel, SegmentedControl } from './ChartPanel';

interface BasketsViewProps {
  orders: OrderSummary[];
  paymentMetrics: PaymentMetric[];
  isDark: boolean;
}

export const BasketsView: React.FC<BasketsViewProps> = ({
  orders,
  paymentMetrics,
  isDark,
}) => {
  const [distMetric, setDistMetric] = useState<'orders' | 'revenue'>('orders');

  const distribution = useMemo(() => buildOrderValueDistribution(orders), [orders]);
  const coPurchasePairs = useMemo(() => buildCoPurchasePairs(orders), [orders]);
  const splitPaymentOrders = useMemo(
    () => orders.filter((o) => o.isSplitPayment),
    [orders]
  );

  // Payment profile radar normalized 0-100 across Revenue, Item Count, Order Count, Avg Ticket
  const radarData = useMemo(() => {
    if (paymentMetrics.length === 0) return [];
    const maxRev = Math.max(...paymentMetrics.map((p) => p.revenue), 1);
    const maxItems = Math.max(...paymentMetrics.map((p) => p.items), 1);
    const maxOrders = Math.max(...paymentMetrics.map((p) => p.orders), 1);
    const maxAvg = Math.max(...paymentMetrics.map((p) => p.avgItemPrice), 1);

    const dims = [
      { metric: 'Revenue', getter: (p: PaymentMetric) => (p.revenue / maxRev) * 100 },
      { metric: 'Items', getter: (p: PaymentMetric) => (p.items / maxItems) * 100 },
      { metric: 'Orders', getter: (p: PaymentMetric) => (p.orders / maxOrders) * 100 },
      { metric: 'Avg Price', getter: (p: PaymentMetric) => (p.avgItemPrice / maxAvg) * 100 },
    ];

    return dims.map((d) => {
      const row: Record<string, string | number> = { metric: d.metric };
      for (const p of paymentMetrics) {
        row[p.method] = Math.round(d.getter(p));
      }
      return row;
    });
  }, [paymentMetrics]);

  const singleOrders = orders.filter((o) => !o.isMultiItem);
  const multiOrders = orders.filter((o) => o.isMultiItem);
  const singleAvg =
    singleOrders.length > 0
      ? singleOrders.reduce((s, o) => s + o.totalValue, 0) / singleOrders.length
      : 0;
  const multiAvg =
    multiOrders.length > 0
      ? multiOrders.reduce((s, o) => s + o.totalValue, 0) / multiOrders.length
      : 0;

  const gridColor = isDark ? '#1E293B' : '#E2E8F0';
  const tickColor = isDark ? '#94A3B8' : '#64748B';
  const tooltipStyle = {
    backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
    borderColor: isDark ? '#334155' : '#E2E8F0',
    borderRadius: '8px',
    fontSize: '12px',
    color: isDark ? '#F1F5F9' : '#0F172A',
  };

  return (
    <div className="space-y-5">
      {/* Row 1: Order Value Distribution + Payment Profile Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <ChartPanel
          className="lg:col-span-7"
          title="Order Value Distribution"
          subtitle="Stacked single-item vs. multi-item order counts across total basket brackets"
          controls={
            <SegmentedControl<'orders' | 'revenue'>
              ariaLabel="Distribution metric"
              value={distMetric}
              onChange={setDistMetric}
              options={[
                { value: 'orders', label: 'Order Count' },
                { value: 'revenue', label: 'Bracket Revenue' },
              ]}
            />
          }
          footer={
            <div className="flex flex-wrap items-center justify-between gap-2 tabular-nums">
              <span>
                Single-item avg:{' '}
                <strong className="font-mono text-slate-800 dark:text-slate-200">
                  {formatCurrency(singleAvg)}
                </strong>{' '}
                ({singleOrders.length} orders)
              </span>
              <span>
                Multi-item avg:{' '}
                <strong className="font-mono text-slate-800 dark:text-slate-200">
                  {formatCurrency(multiAvg)}
                </strong>{' '}
                ({multiOrders.length} orders)
              </span>
            </div>
          }
        >
          <div className="h-[290px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              {distMetric === 'orders' ? (
                <BarChart data={distribution} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                  <XAxis
                    dataKey="range"
                    tick={{ fill: tickColor, fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: gridColor }}
                  />
                  <YAxis
                    tick={{ fill: tickColor, fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={36}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: unknown, name: unknown) => [
                      `${value} orders`,
                      name === 'singleCount' ? 'Single-Item Orders' : 'Multi-Item Orders',
                    ]}
                  />
                  <Bar
                    dataKey="singleCount"
                    stackId="basket"
                    fill="#2563EB"
                    maxBarSize={46}
                    name="singleCount"
                  />
                  <Bar
                    dataKey="multiCount"
                    stackId="basket"
                    fill="#0D9488"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={46}
                    name="multiCount"
                  />
                </BarChart>
              ) : (
                <BarChart data={distribution} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                  <XAxis
                    dataKey="range"
                    tick={{ fill: tickColor, fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: gridColor }}
                  />
                  <YAxis
                    tick={{ fill: tickColor, fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `$${v}`}
                    width={48}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: unknown) => [formatCurrency(Number(value)), 'Bracket Revenue']}
                  />
                  <Bar dataKey="revenue" fill="#2563EB" radius={[4, 4, 0, 0]} maxBarSize={46} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </ChartPanel>

        <ChartPanel
          className="lg:col-span-5"
          title="Payment Channel Profile"
          subtitle="Relative index (0–100) comparing channels across revenue, volume, orders, and avg item price"
        >
          <div className="h-[290px] w-full flex flex-col justify-between">
            <div className="h-[235px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="74%" data={radarData}>
                  <PolarGrid stroke={gridColor} />
                  <PolarAngleAxis
                    dataKey="metric"
                    tick={{ fill: tickColor, fontSize: 11 }}
                  />
                  <PolarRadiusAxis
                    angle={30}
                    domain={[0, 100]}
                    tick={false}
                    axisLine={false}
                  />
                  <Tooltip contentStyle={tooltipStyle} />
                  {paymentMetrics.map((pm) => (
                    <Radar
                      key={pm.method}
                      name={pm.method}
                      dataKey={pm.method}
                      stroke={pm.color}
                      fill={pm.color}
                      fillOpacity={0.14}
                      strokeWidth={2}
                    />
                  ))}
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-600 dark:text-slate-300">
              {paymentMetrics.map((pm) => (
                <span key={pm.method} className="inline-flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-xs"
                    style={{ backgroundColor: pm.color }}
                  />
                  {pm.method}
                </span>
              ))}
            </div>
          </div>
        </ChartPanel>
      </div>

      {/* Row 2: Product Co-Purchase Pairs + Split-Payment Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <ChartPanel
          className="lg:col-span-7"
          title="Frequently Co-Purchased Products"
          subtitle="Exact product pairs appearing together within multi-item orders"
        >
          {coPurchasePairs.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 dark:text-slate-400">
              No multi-item product pairs match the current filter selection.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                    <th className="py-2 text-left font-medium">Product Pair</th>
                    <th className="py-2 text-left font-medium">Orders</th>
                    <th className="py-2 text-right font-medium">Pairings</th>
                    <th className="py-2 text-right font-medium">Combined Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                  {coPurchasePairs.map((pair) => (
                    <tr
                      key={`${pair.productA}-${pair.productB}`}
                      className="text-slate-700 dark:text-slate-300"
                    >
                      <td className="py-2.5 pr-3">
                        <span className="font-medium text-slate-900 dark:text-slate-100">
                          {shortenProductName(pair.productA)}
                        </span>
                        <span className="mx-1.5 text-slate-400">+</span>
                        <span className="font-medium text-slate-900 dark:text-slate-100">
                          {shortenProductName(pair.productB)}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                        {pair.orderNumbers.join(', ')}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono tabular-nums font-medium">
                        {pair.count}×
                      </td>
                      <td className="py-2.5 pl-2 text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                        {formatCurrency(pair.combinedRevenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ChartPanel>

        <ChartPanel
          className="lg:col-span-5"
          title="Split-Payment Orders"
          subtitle="Multi-item orders paid using two different payment methods"
          footer={
            <span className="tabular-nums">
              {splitPaymentOrders.length} of {multiOrders.length} multi-item orders (
              {multiOrders.length > 0
                ? formatPercent((splitPaymentOrders.length / multiOrders.length) * 100)
                : '0%'}
              ) used split payment
            </span>
          }
        >
          {splitPaymentOrders.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 dark:text-slate-400">
              No split-payment orders in the current filtered view.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                    <th className="py-2 text-left font-medium">Order</th>
                    <th className="py-2 text-left font-medium">Date</th>
                    <th className="py-2 text-left font-medium">Methods</th>
                    <th className="py-2 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                  {splitPaymentOrders.map((o) => (
                    <tr key={o.orderNumber} className="text-slate-700 dark:text-slate-300">
                      <td className="py-2.5 font-mono tabular-nums font-medium text-slate-900 dark:text-slate-100">
                        {o.orderNumber}
                      </td>
                      <td className="py-2.5 font-mono tabular-nums text-slate-500 dark:text-slate-400">
                        {formatDateShort(o.date)}
                      </td>
                      <td className="py-2.5 text-slate-600 dark:text-slate-300">
                        {o.paymentMethods.join(' + ')}
                      </td>
                      <td className="py-2.5 text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                        {formatCurrency(o.totalValue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ChartPanel>
      </div>
    </div>
  );
};
