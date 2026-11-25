import React, { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  PaymentMetric,
  ProductMetric,
  SaleRecord,
  WeekdayMetric,
} from '../types/sales';
import {
  buildTimeSeries,
  formatCompactCurrency,
  formatCurrency,
  formatPercent,
  getPaymentColor,
} from '../utils/salesData';
import { ChartPanel, SegmentedControl } from './ChartPanel';

interface OverviewViewProps {
  records: SaleRecord[];
  productMetrics: ProductMetric[];
  paymentMetrics: PaymentMetric[];
  weekdayMetrics: WeekdayMetric[];
  availablePayments: string[];
  activeProduct: string;
  activePayments: string[];
  onSelectProduct: (product: string) => void;
  onTogglePayment: (method: string) => void;
  isDark: boolean;
}

type TrendChartType = 'area' | 'bar' | 'cumulative' | 'stacked';
type Granularity = 'day' | 'week' | 'month';
type ProductMetricMode = 'revenue' | 'units' | 'unitPrice';
type PaymentViewMode = 'donut' | 'bar' | 'avg';
type WeekdayMode = 'revenue' | 'avgDailyRevenue' | 'orders';

export const OverviewView: React.FC<OverviewViewProps> = ({
  records,
  productMetrics,
  paymentMetrics,
  weekdayMetrics,
  availablePayments,
  activeProduct,
  activePayments,
  onSelectProduct,
  onTogglePayment,
  isDark,
}) => {
  const [trendType, setTrendType] = useState<TrendChartType>('area');
  const [granularity, setGranularity] = useState<Granularity>('day');
  const [showMovingAvg, setShowMovingAvg] = useState(true);
  const [productMode, setProductMode] = useState<ProductMetricMode>('revenue');
  const [paymentMode, setPaymentMode] = useState<PaymentViewMode>('donut');
  const [weekdayMode, setWeekdayMode] = useState<WeekdayMode>('revenue');

  const timeSeries = useMemo(
    () => buildTimeSeries(records, granularity, availablePayments),
    [records, granularity, availablePayments]
  );

  const stackedSeriesData = useMemo(() => {
    return timeSeries.map((pt) => ({
      ...pt,
      ...pt.byPayment,
    }));
  }, [timeSeries]);

  const sortedProducts = useMemo(() => {
    const copy = [...productMetrics];
    if (productMode === 'units') copy.sort((a, b) => b.units - a.units || b.revenue - a.revenue);
    else if (productMode === 'unitPrice') copy.sort((a, b) => b.unitPrice - a.unitPrice);
    else copy.sort((a, b) => b.revenue - a.revenue);
    return copy;
  }, [productMetrics, productMode]);

  const gridColor = isDark ? '#1E293B' : '#E2E8F0';
  const tickColor = isDark ? '#94A3B8' : '#64748B';
  const tooltipStyle = {
    backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
    borderColor: isDark ? '#334155' : '#E2E8F0',
    borderRadius: '8px',
    fontSize: '12px',
    color: isDark ? '#F1F5F9' : '#0F172A',
    boxShadow: '0 4px 16px rgba(15, 23, 42, 0.08)',
  };

  const totalPaymentRevenue = paymentMetrics.reduce((s, p) => s + p.revenue, 0);

  return (
    <div className="space-y-5">
      {/* Primary Focal Anchor: Revenue Trajectory */}
      <ChartPanel
        title="Revenue Trajectory"
        subtitle={`Click modes to inspect ${granularity === 'day' ? 'daily' : granularity === 'week' ? 'weekly' : 'monthly'} sales velocity, cumulative growth, or payment channel composition`}
        controls={
          <>
            <SegmentedControl<Granularity>
              ariaLabel="Time granularity"
              value={granularity}
              onChange={setGranularity}
              options={[
                { value: 'day', label: 'Daily' },
                { value: 'week', label: 'Weekly' },
                { value: 'month', label: 'Monthly' },
              ]}
            />
            <SegmentedControl<TrendChartType>
              ariaLabel="Chart visualization mode"
              value={trendType}
              onChange={setTrendType}
              options={[
                { value: 'area', label: 'Area' },
                { value: 'bar', label: 'Bar' },
                { value: 'cumulative', label: 'Cumulative' },
                { value: 'stacked', label: 'By Payment' },
              ]}
            />
            {trendType === 'area' && granularity === 'day' && (
              <button
                type="button"
                onClick={() => setShowMovingAvg((prev) => !prev)}
                aria-pressed={showMovingAvg}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  showMovingAvg
                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                }`}
              >
                7d Moving Avg
              </button>
            )}
          </>
        }
      >
        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            {trendType === 'area' ? (
              <ComposedChart data={timeSeries} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: tickColor, fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: gridColor }}
                  minTickGap={24}
                />
                <YAxis
                  tick={{ fill: tickColor, fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => formatCompactCurrency(Number(v))}
                  width={56}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: unknown, name: unknown) => [
                    formatCurrency(Number(value)),
                    name === 'movingAvg7' ? '7-Day Moving Avg' : 'Revenue',
                  ]}
                  labelFormatter={(label, payload) => {
                    const row = payload?.[0]?.payload;
                    return row
                      ? `${label} · ${row.orders} order${row.orders === 1 ? '' : 's'} · ${row.items} item${row.items === 1 ? '' : 's'}`
                      : String(label);
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#2563EB"
                  strokeWidth={2}
                  fill="url(#revGradient)"
                  activeDot={{ r: 4, fill: '#2563EB', strokeWidth: 0 }}
                />
                {showMovingAvg && granularity === 'day' && (
                  <Line
                    type="monotone"
                    dataKey="movingAvg7"
                    stroke="#D97706"
                    strokeWidth={2}
                    dot={false}
                    strokeDasharray="4 4"
                  />
                )}
              </ComposedChart>
            ) : trendType === 'bar' ? (
              <BarChart data={timeSeries} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: tickColor, fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: gridColor }}
                  minTickGap={20}
                />
                <YAxis
                  tick={{ fill: tickColor, fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => formatCompactCurrency(Number(v))}
                  width={56}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: unknown) => [formatCurrency(Number(value)), 'Revenue']}
                  labelFormatter={(label, payload) => {
                    const row = payload?.[0]?.payload;
                    return row ? `${label} · ${row.orders} orders · ${row.items} items` : String(label);
                  }}
                />
                <Bar dataKey="revenue" fill="#2563EB" radius={[4, 4, 0, 0]} maxBarSize={36} />
              </BarChart>
            ) : trendType === 'cumulative' ? (
              <AreaChart data={timeSeries} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="cumGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0D9488" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="#0D9488" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: tickColor, fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: gridColor }}
                  minTickGap={24}
                />
                <YAxis
                  tick={{ fill: tickColor, fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => formatCompactCurrency(Number(v))}
                  width={58}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: unknown) => [formatCurrency(Number(value)), 'Cumulative Revenue']}
                />
                <Area
                  type="monotone"
                  dataKey="cumulativeRevenue"
                  stroke="#0D9488"
                  strokeWidth={2.25}
                  fill="url(#cumGradient)"
                />
              </AreaChart>
            ) : (
              <BarChart data={stackedSeriesData} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: tickColor, fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: gridColor }}
                  minTickGap={20}
                />
                <YAxis
                  tick={{ fill: tickColor, fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => formatCompactCurrency(Number(v))}
                  width={56}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: unknown, name: unknown) => [formatCurrency(Number(value)), String(name)]}
                />
                {availablePayments.map((pm, idx) => (
                  <Bar
                    key={pm}
                    dataKey={pm}
                    stackId="payment"
                    fill={getPaymentColor(pm, idx)}
                    maxBarSize={40}
                  />
                ))}
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </ChartPanel>

      {/* Secondary 2-Column Row: Product Ranking + Payment Method Mix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <ChartPanel
          className="lg:col-span-7"
          title="Product Performance"
          subtitle="Click any bar to cross-filter the entire dashboard by that product"
          controls={
            <SegmentedControl<ProductMetricMode>
              ariaLabel="Product metric mode"
              value={productMode}
              onChange={setProductMode}
              options={[
                { value: 'revenue', label: 'Revenue' },
                { value: 'units', label: 'Units' },
                { value: 'unitPrice', label: 'Unit Price' },
              ]}
            />
          }
          footer={
            activeProduct !== 'all' ? (
              <div className="flex items-center justify-between">
                <span>Filtered to: {activeProduct}</span>
                <button
                  type="button"
                  onClick={() => onSelectProduct('all')}
                  className="text-blue-600 dark:text-blue-400 font-medium hover:underline cursor-pointer"
                >
                  Clear product filter
                </button>
              </div>
            ) : (
              <span>
                {productMetrics.length} active SKUs · Top performer accounts for{' '}
                <span className="font-mono tabular-nums font-medium text-slate-700 dark:text-slate-300">
                  {productMetrics[0] ? formatPercent(productMetrics[0].revenueShare) : '0%'}
                </span>{' '}
                of filtered revenue
              </span>
            )
          }
        >
          <div className="h-[340px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={sortedProducts}
                layout="vertical"
                margin={{ top: 4, right: 16, left: 6, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fill: tickColor, fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: gridColor }}
                  tickFormatter={(v) =>
                    productMode === 'units' ? String(v) : formatCompactCurrency(Number(v))
                  }
                />
                <YAxis
                  type="category"
                  dataKey="shortName"
                  width={138}
                  tick={{ fill: tickColor, fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: unknown) => {
                    const num = Number(value);
                    if (productMode === 'units') return [`${num} units`, 'Units Sold'];
                    if (productMode === 'unitPrice') return [formatCurrency(num), 'Unit Price'];
                    return [formatCurrency(num), 'Total Revenue'];
                  }}
                  labelFormatter={(_, payload) => {
                    const row = payload?.[0]?.payload as ProductMetric | undefined;
                    return row
                      ? `${row.product} (${row.units} units · ${formatPercent(row.revenueShare)})`
                      : '';
                  }}
                />
                <Bar
                  dataKey={productMode}
                  radius={[0, 4, 4, 0]}
                  barSize={18}
                  onClick={(entry) => {
                    const prod = (entry as unknown as { payload?: ProductMetric; product?: string })
                      ?.payload?.product ?? (entry as unknown as { product?: string })?.product;
                    if (!prod) return;
                    onSelectProduct(activeProduct === prod ? 'all' : prod);
                  }}
                  className="cursor-pointer"
                >
                  {sortedProducts.map((entry) => {
                    const isSelected = activeProduct === entry.product;
                    const isDimmed = activeProduct !== 'all' && !isSelected;
                    return (
                      <Cell
                        key={entry.product}
                        fill={
                          isSelected
                            ? '#1D4ED8'
                            : productMode === 'units'
                            ? '#0D9488'
                            : productMode === 'unitPrice'
                            ? '#D97706'
                            : '#2563EB'
                        }
                        fillOpacity={isDimmed ? 0.28 : 0.92}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartPanel>

        <ChartPanel
          className="lg:col-span-5"
          title="Payment Method Mix"
          subtitle="Click any payment method to toggle cross-filtering"
          controls={
            <SegmentedControl<PaymentViewMode>
              ariaLabel="Payment visualization mode"
              value={paymentMode}
              onChange={setPaymentMode}
              options={[
                { value: 'donut', label: 'Donut' },
                { value: 'bar', label: 'Share' },
                { value: 'avg', label: 'Avg Item' },
              ]}
            />
          }
        >
          <div className="flex flex-col h-full justify-between gap-4">
            <div className="h-[210px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                {paymentMode === 'donut' ? (
                  <PieChart>
                    <Pie
                      data={paymentMetrics}
                      dataKey="revenue"
                      nameKey="method"
                      cx="50%"
                      cy="50%"
                      innerRadius={58}
                      outerRadius={88}
                      paddingAngle={2}
                      onClick={(entry) => {
                        const method =
                          (entry as unknown as { payload?: PaymentMetric; method?: string })?.payload?.method ??
                          (entry as unknown as { method?: string })?.method;
                        if (method) onTogglePayment(method);
                      }}
                      className="cursor-pointer"
                    >
                      {paymentMetrics.map((entry) => {
                        const isDimmed =
                          activePayments.length > 0 && !activePayments.includes(entry.method);
                        return (
                          <Cell
                            key={entry.method}
                            fill={entry.color}
                            fillOpacity={isDimmed ? 0.3 : 1}
                            stroke={isDark ? '#0F172A' : '#FFFFFF'}
                            strokeWidth={2}
                          />
                        );
                      })}
                    </Pie>
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value: unknown, name: unknown) => [
                        `${formatCurrency(Number(value))} (${
                          totalPaymentRevenue > 0
                            ? formatPercent((Number(value) / totalPaymentRevenue) * 100)
                            : '0%'
                        })`,
                        String(name),
                      ]}
                    />
                  </PieChart>
                ) : (
                  <BarChart
                    data={paymentMetrics}
                    margin={{ top: 10, right: 12, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                    <XAxis
                      dataKey="method"
                      tick={{ fill: tickColor, fontSize: 11 }}
                      tickLine={false}
                      axisLine={{ stroke: gridColor }}
                    />
                    <YAxis
                      tick={{ fill: tickColor, fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) =>
                        paymentMode === 'avg' ? formatCurrency(Number(v), 0) : `${Number(v).toFixed(0)}%`
                      }
                      width={48}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value: unknown) => [
                        paymentMode === 'avg'
                          ? formatCurrency(Number(value))
                          : formatPercent(Number(value)),
                        paymentMode === 'avg' ? 'Avg Item Price' : 'Revenue Share',
                      ]}
                    />
                    <Bar
                      dataKey={paymentMode === 'avg' ? 'avgItemPrice' : 'revenueShare'}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={44}
                      onClick={(entry) => {
                        const method =
                          (entry as unknown as { payload?: PaymentMetric; method?: string })?.payload?.method ??
                          (entry as unknown as { method?: string })?.method;
                        if (method) onTogglePayment(method);
                      }}
                      className="cursor-pointer"
                    >
                      {paymentMetrics.map((entry) => (
                        <Cell key={entry.method} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>

            {/* Clean tabular legend table (clickable rows) */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800/80 border-t border-slate-100 dark:border-slate-800/80">
              {paymentMetrics.map((pm) => {
                const selected = activePayments.includes(pm.method);
                return (
                  <button
                    key={pm.method}
                    type="button"
                    onClick={() => onTogglePayment(pm.method)}
                    className={`w-full py-2 px-1.5 flex items-center justify-between text-xs transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded cursor-pointer ${
                      selected ? 'bg-blue-50/70 dark:bg-blue-950/40' : ''
                    }`}
                  >
                    <span className="flex items-center gap-2 font-medium text-slate-800 dark:text-slate-200">
                      <span
                        className="w-2.5 h-2.5 rounded-xs shrink-0"
                        style={{ backgroundColor: pm.color }}
                        aria-hidden="true"
                      />
                      {pm.method}
                    </span>
                    <span className="font-mono tabular-nums text-slate-600 dark:text-slate-300 flex items-center gap-3">
                      <span>{pm.items} items</span>
                      <span className="w-12 text-right">{formatPercent(pm.revenueShare)}</span>
                      <span className="w-20 text-right font-semibold text-slate-900 dark:text-slate-100">
                        {formatCurrency(pm.revenue)}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </ChartPanel>
      </div>

      {/* Tertiary Full-Width Row: Day-of-Week Cadence */}
      <ChartPanel
        title="Weekly Sales Cadence"
        subtitle="Compare total revenue, average revenue per active weekday, and order volume across Monday through Sunday"
        controls={
          <SegmentedControl<WeekdayMode>
            ariaLabel="Weekday metric"
            value={weekdayMode}
            onChange={setWeekdayMode}
            options={[
              { value: 'revenue', label: 'Total Revenue' },
              { value: 'avgDailyRevenue', label: 'Avg / Day' },
              { value: 'orders', label: 'Orders' },
            ]}
          />
        }
      >
        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weekdayMetrics} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis
                dataKey="day"
                tick={{ fill: tickColor, fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: gridColor }}
              />
              <YAxis
                tick={{ fill: tickColor, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) =>
                  weekdayMode === 'orders' ? String(v) : formatCompactCurrency(Number(v))
                }
                width={52}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value: unknown) => {
                  const num = Number(value);
                  if (weekdayMode === 'orders') return [`${num} orders`, 'Unique Orders'];
                  if (weekdayMode === 'avgDailyRevenue')
                    return [formatCurrency(num), 'Avg Revenue / Active Day'];
                  return [formatCurrency(num), 'Total Revenue'];
                }}
                labelFormatter={(day, payload) => {
                  const row = payload?.[0]?.payload as WeekdayMetric | undefined;
                  return row
                    ? `${day} · ${row.occurrences} active day${row.occurrences === 1 ? '' : 's'} · ${row.items} items`
                    : String(day);
                }}
              />
              <Bar
                dataKey={weekdayMode}
                fill={weekdayMode === 'orders' ? '#0D9488' : '#2563EB'}
                radius={[4, 4, 0, 0]}
                maxBarSize={48}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartPanel>
    </div>
  );
};
