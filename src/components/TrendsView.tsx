import React, { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { SaleRecord, WeekdayMetric } from '../types/sales';
import {
  buildTimeSeries,
  enumerateDateRange,
  formatCompactCurrency,
  formatCurrency,
  formatDateFull,
  formatDateShort,
  getPaymentColor,
  WEEKDAY_NAMES,
} from '../utils/salesData';
import { ChartPanel, SegmentedControl } from './ChartPanel';

interface TrendsViewProps {
  records: SaleRecord[];
  allRecords: SaleRecord[];
  weekdayMetrics: WeekdayMetric[];
  availablePayments: string[];
  selectedDay: string | null;
  onSelectDay: (day: string | null) => void;
  isDark: boolean;
}

export const TrendsView: React.FC<TrendsViewProps> = ({
  records,
  allRecords,
  weekdayMetrics,
  availablePayments,
  selectedDay,
  onSelectDay,
  isDark,
}) => {
  const [granularity, setGranularity] = useState<'day' | 'week' | 'month'>('week');
  const [heatmapMetric, setHeatmapMetric] = useState<'revenue' | 'items'>('revenue');

  const timeSeries = useMemo(
    () => buildTimeSeries(records, granularity, availablePayments),
    [records, granularity, availablePayments]
  );

  // Build calendar heatmap from the full date range of the filtered records (or allRecords if day-filtered)
  const calendarData = useMemo(() => {
    const source = selectedDay ? allRecords : records;
    if (source.length === 0) return { months: [], maxVal: 0, dayMap: new Map() };

    const dayMap = new Map<
      string,
      { revenue: number; items: number; orders: Set<string>; records: SaleRecord[] }
    >();
    let minD = source[0].date;
    let maxD = source[0].date;

    for (const r of source) {
      if (r.date < minD) minD = r.date;
      if (r.date > maxD) maxD = r.date;
      let entry = dayMap.get(r.date);
      if (!entry) {
        entry = { revenue: 0, items: 0, orders: new Set(), records: [] };
        dayMap.set(r.date, entry);
      }
      entry.revenue += r.price;
      entry.items += 1;
      entry.orders.add(r.orderNumber);
      entry.records.push(r);
    }

    const allDates = enumerateDateRange(minD, maxD);
    const monthBuckets = new Map<string, { label: string; dates: string[] }>();
    let maxVal = 0;

    for (const d of allDates) {
      const mk = d.slice(0, 7);
      const [y, m] = mk.split('-').map(Number);
      const label = new Date(Date.UTC(y, m - 1, 1)).toLocaleString('en-US', {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      });
      if (!monthBuckets.has(mk)) {
        monthBuckets.set(mk, { label, dates: [] });
      }
      monthBuckets.get(mk)!.dates.push(d);

      const stat = dayMap.get(d);
      if (stat) {
        const val = heatmapMetric === 'revenue' ? stat.revenue : stat.items;
        if (val > maxVal) maxVal = val;
      }
    }

    return {
      months: Array.from(monthBuckets.entries()).map(([key, val]) => ({ key, ...val })),
      maxVal,
      dayMap,
    };
  }, [records, allRecords, selectedDay, heatmapMetric]);

  const weekdayStacked = useMemo(
    () => weekdayMetrics.map((w) => ({ ...w, ...w.byPayment })),
    [weekdayMetrics]
  );

  const selectedDayRecords = useMemo(() => {
    if (!selectedDay) return [];
    return allRecords.filter((r) => r.date === selectedDay);
  }, [allRecords, selectedDay]);

  const gridColor = isDark ? '#1E293B' : '#E2E8F0';
  const tickColor = isDark ? '#94A3B8' : '#64748B';
  const tooltipStyle = {
    backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
    borderColor: isDark ? '#334155' : '#E2E8F0',
    borderRadius: '8px',
    fontSize: '12px',
    color: isDark ? '#F1F5F9' : '#0F172A',
  };

  const getIntensityClass = (val: number, maxVal: number, isSelected: boolean) => {
    if (isSelected) {
      return 'bg-blue-600 text-white ring-2 ring-blue-600 ring-offset-2 ring-offset-white dark:ring-offset-slate-900';
    }
    if (val <= 0 || maxVal <= 0) {
      return 'bg-slate-100 dark:bg-slate-800/70 text-slate-400 dark:text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800';
    }
    const ratio = val / maxVal;
    if (ratio < 0.25) return 'bg-blue-100 dark:bg-blue-950/80 text-blue-900 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-900';
    if (ratio < 0.5) return 'bg-blue-300 dark:bg-blue-800/80 text-slate-900 dark:text-blue-100 hover:bg-blue-400 dark:hover:bg-blue-700';
    if (ratio < 0.75) return 'bg-blue-500 text-white hover:bg-blue-600';
    return 'bg-blue-700 dark:bg-blue-500 text-white hover:bg-blue-800';
  };

  return (
    <div className="space-y-5">
      {/* Calendar Heatmap */}
      <ChartPanel
        title="Daily Sales Calendar Heatmap"
        subtitle="Click any day to isolate its orders across the entire dashboard"
        controls={
          <>
            <SegmentedControl<'revenue' | 'items'>
              ariaLabel="Calendar heatmap metric"
              value={heatmapMetric}
              onChange={setHeatmapMetric}
              options={[
                { value: 'revenue', label: 'Revenue' },
                { value: 'items', label: 'Items Sold' },
              ]}
            />
            {selectedDay && (
              <button
                type="button"
                onClick={() => onSelectDay(null)}
                className="px-2.5 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-950 transition-colors cursor-pointer"
              >
                Clear day ({formatDateShort(selectedDay)})
              </button>
            )}
          </>
        }
        footer={
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>Intensity scales relative to peak day ({heatmapMetric === 'revenue' ? formatCurrency(calendarData.maxVal) : `${calendarData.maxVal} items`})</span>
            <div className="flex items-center gap-1.5">
              <span>Low</span>
              <span className="w-3.5 h-3.5 rounded-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700" />
              <span className="w-3.5 h-3.5 rounded-xs bg-blue-100 dark:bg-blue-950" />
              <span className="w-3.5 h-3.5 rounded-xs bg-blue-300 dark:bg-blue-800" />
              <span className="w-3.5 h-3.5 rounded-xs bg-blue-500" />
              <span className="w-3.5 h-3.5 rounded-xs bg-blue-700 dark:bg-blue-500" />
              <span>Peak</span>
            </div>
          </div>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {calendarData.months.map((month) => {
            const firstDate = month.dates[0];
            const [y, m, d] = firstDate.split('-').map(Number);
            const firstWeekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
            const leadingBlanks = firstWeekday === 0 ? 6 : firstWeekday - 1; // Monday first

            return (
              <div key={month.key} className="space-y-2.5">
                <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {month.label}
                </h3>
                <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-slate-400 dark:text-slate-500">
                  {[1, 2, 3, 4, 5, 6, 0].map((idx) => (
                    <span key={idx}>{WEEKDAY_NAMES[idx].slice(0, 2)}</span>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1.5">
                  {Array.from({ length: leadingBlanks }).map((_, i) => (
                    <div key={`blank-${i}`} className="h-9" />
                  ))}
                  {month.dates.map((isoDate) => {
                    const dayNum = Number(isoDate.slice(8, 10));
                    const stat = calendarData.dayMap.get(isoDate);
                    const val = stat
                      ? heatmapMetric === 'revenue'
                        ? stat.revenue
                        : stat.items
                      : 0;
                    const isSelected = selectedDay === isoDate;

                    return (
                      <button
                        key={isoDate}
                        type="button"
                        onClick={() => onSelectDay(isSelected ? null : isoDate)}
                        title={`${formatDateFull(isoDate)}: ${
                          stat
                            ? `${formatCurrency(stat.revenue)} · ${stat.items} items · ${stat.orders.size} orders`
                            : 'No sales'
                        }`}
                        className={`h-9 rounded-md flex flex-col items-center justify-center transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-600 ${getIntensityClass(
                          val,
                          calendarData.maxVal,
                          isSelected
                        )}`}
                      >
                        <span className="text-[11px] font-mono font-medium leading-none tabular-nums">
                          {dayNum}
                        </span>
                        {stat && (
                          <span className="text-[9px] font-mono opacity-85 leading-none mt-1 tabular-nums">
                            {heatmapMetric === 'revenue' ? `$${Math.round(stat.revenue)}` : `${stat.items}x`}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Inline day inspector when a day is clicked */}
        {selectedDay && (
          <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Transactions on {formatDateFull(selectedDay)}
              </h3>
              <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                {selectedDayRecords.length} items ·{' '}
                {formatCurrency(selectedDayRecords.reduce((s, r) => s + r.price, 0))}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                    <th className="py-1.5 text-left font-medium">Order</th>
                    <th className="py-1.5 text-left font-medium">Product</th>
                    <th className="py-1.5 text-left font-medium">Payment</th>
                    <th className="py-1.5 text-right font-medium">Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                  {selectedDayRecords.map((rec) => (
                    <tr key={rec.id} className="text-slate-700 dark:text-slate-300">
                      <td className="py-2 font-mono tabular-nums font-medium">{rec.orderNumber}</td>
                      <td className="py-2">{rec.product}</td>
                      <td className="py-2">{rec.paymentMethod}</td>
                      <td className="py-2 text-right font-mono tabular-nums font-medium text-slate-900 dark:text-slate-100">
                        {formatCurrency(rec.price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </ChartPanel>

      {/* Dual-Axis Revenue vs Order Volume + Day of Week Stacked by Payment */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartPanel
          title="Revenue vs. Average Order Value"
          subtitle="Compare total revenue bars against average order ticket trend line"
          controls={
            <SegmentedControl<'day' | 'week' | 'month'>
              ariaLabel="Comparison granularity"
              value={granularity}
              onChange={setGranularity}
              options={[
                { value: 'day', label: 'Daily' },
                { value: 'week', label: 'Weekly' },
                { value: 'month', label: 'Monthly' },
              ]}
            />
          }
        >
          <div className="h-[290px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={timeSeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: tickColor, fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: gridColor }}
                  minTickGap={16}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fill: tickColor, fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => formatCompactCurrency(Number(v))}
                  width={52}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fill: tickColor, fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `$${Math.round(Number(v))}`}
                  width={44}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: unknown, name: unknown) => [
                    formatCurrency(Number(value)),
                    name === 'avgOrderValue' ? 'Avg Order Value' : 'Total Revenue',
                  ]}
                />
                <Bar
                  yAxisId="left"
                  dataKey="revenue"
                  fill="#2563EB"
                  fillOpacity={0.85}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={36}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="avgOrderValue"
                  stroke="#D97706"
                  strokeWidth={2.25}
                  dot={{ r: 3, fill: '#D97706', strokeWidth: 0 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </ChartPanel>

        <ChartPanel
          title="Weekday Revenue by Payment Channel"
          subtitle="Stacked payment distribution across each day of the week"
        >
          <div className="h-[290px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekdayStacked} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis
                  dataKey="day"
                  tick={{ fill: tickColor, fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: gridColor }}
                />
                <YAxis
                  tick={{ fill: tickColor, fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => formatCompactCurrency(Number(v))}
                  width={52}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: unknown, name: unknown) => [formatCurrency(Number(value)), String(name)]}
                />
                {availablePayments.map((pm, idx) => (
                  <Bar
                    key={pm}
                    dataKey={pm}
                    stackId="wk"
                    fill={getPaymentColor(pm, idx)}
                    maxBarSize={42}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartPanel>
      </div>
    </div>
  );
};
