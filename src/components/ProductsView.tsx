import React, { useMemo, useState } from 'react';
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  Treemap,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import { ProductMetric } from '../types/sales';
import {
  FALLBACK_SERIES_COLORS,
  formatCompactCurrency,
  formatCurrency,
  formatPercent,
} from '../utils/salesData';
import { ChartPanel, SegmentedControl } from './ChartPanel';

interface ProductsViewProps {
  productMetrics: ProductMetric[];
  availablePayments: string[];
  activeProduct: string;
  onSelectProduct: (product: string) => void;
  isDark: boolean;
}

interface TreemapContentProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  name?: string;
  revenue?: number;
  share?: number;
  index?: number;
  selected?: boolean;
  onClick?: () => void;
}

const CustomTreemapNode: React.FC<TreemapContentProps> = ({
  x = 0,
  y = 0,
  width = 0,
  height = 0,
  name = '',
  revenue = 0,
  share = 0,
  index = 0,
  selected = false,
  onClick,
}) => {
  if (width < 4 || height < 4) return null;
  const color = FALLBACK_SERIES_COLORS[index % FALLBACK_SERIES_COLORS.length];
  const showFull = width > 95 && height > 52;
  const showShort = width > 56 && height > 30;

  return (
    <g onClick={onClick} style={{ cursor: 'pointer' }}>
      <rect
        x={x + 1.5}
        y={y + 1.5}
        width={Math.max(0, width - 3)}
        height={Math.max(0, height - 3)}
        rx={6}
        fill={color}
        fillOpacity={selected ? 1 : 0.88}
        stroke={selected ? '#0F172A' : '#FFFFFF'}
        strokeWidth={selected ? 2.5 : 1.5}
      />
      {showFull ? (
        <>
          <text
            x={x + 10}
            y={y + 22}
            fill="#FFFFFF"
            fontSize={12}
            fontWeight={600}
            fontFamily="DM Sans, sans-serif"
          >
            {name.length > Math.floor(width / 7.5)
              ? `${name.slice(0, Math.max(6, Math.floor(width / 7.5) - 1))}…`
              : name}
          </text>
          <text
            x={x + 10}
            y={y + 40}
            fill="rgba(255,255,255,0.9)"
            fontSize={11}
            fontFamily="JetBrains Mono, monospace"
          >
            {formatCurrency(revenue, 0)} · {formatPercent(share)}
          </text>
        </>
      ) : showShort ? (
        <text
          x={x + 8}
          y={y + 20}
          fill="#FFFFFF"
          fontSize={10}
          fontWeight={600}
          fontFamily="JetBrains Mono, monospace"
        >
          {formatCurrency(revenue, 0)}
        </text>
      ) : null}
    </g>
  );
};

export const ProductsView: React.FC<ProductsViewProps> = ({
  productMetrics,
  availablePayments,
  activeProduct,
  onSelectProduct,
  isDark,
}) => {
  const [matrixMode, setMatrixMode] = useState<'revenue' | 'units'>('revenue');

  const avgUnitPrice = useMemo(() => {
    if (productMetrics.length === 0) return 0;
    return productMetrics.reduce((s, p) => s + p.unitPrice, 0) / productMetrics.length;
  }, [productMetrics]);

  const avgUnits = useMemo(() => {
    if (productMetrics.length === 0) return 0;
    return productMetrics.reduce((s, p) => s + p.units, 0) / productMetrics.length;
  }, [productMetrics]);

  const treemapData = useMemo(
    () =>
      productMetrics.map((p, idx) => ({
        name: p.shortName,
        fullName: p.product,
        size: p.revenue,
        revenue: p.revenue,
        units: p.units,
        share: p.revenueShare,
        index: idx,
      })),
    [productMetrics]
  );

  const matrixMax = useMemo(() => {
    let m = 0;
    for (const p of productMetrics) {
      for (const pm of availablePayments) {
        const val =
          matrixMode === 'revenue'
            ? p.byPayment[pm]?.revenue ?? 0
            : p.byPayment[pm]?.units ?? 0;
        if (val > m) m = val;
      }
    }
    return m;
  }, [productMetrics, availablePayments, matrixMode]);

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
      {/* Row 1: Price vs Volume Bubble Matrix + Interactive Treemap */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <ChartPanel
          className="lg:col-span-6"
          title="Price vs. Unit Volume Matrix"
          subtitle="Bubble size scales with total SKU revenue; dashed lines show catalog averages"
        >
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 14, right: 18, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis
                  type="number"
                  dataKey="unitPrice"
                  name="Unit Price"
                  tick={{ fill: tickColor, fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: gridColor }}
                  tickFormatter={(v) => `$${v}`}
                  domain={['dataMin - 10', 'dataMax + 15']}
                />
                <YAxis
                  type="number"
                  dataKey="units"
                  name="Units Sold"
                  tick={{ fill: tickColor, fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={36}
                  domain={['dataMin - 1', 'dataMax + 2']}
                />
                <ZAxis type="number" dataKey="revenue" range={[90, 560]} name="Revenue" />
                {avgUnitPrice > 0 && (
                  <ReferenceLine
                    x={avgUnitPrice}
                    stroke={isDark ? '#475569' : '#94A3B8'}
                    strokeDasharray="4 4"
                  />
                )}
                {avgUnits > 0 && (
                  <ReferenceLine
                    y={avgUnits}
                    stroke={isDark ? '#475569' : '#94A3B8'}
                    strokeDasharray="4 4"
                  />
                )}
                <Tooltip
                  cursor={{ strokeDasharray: '3 3', stroke: '#94A3B8' }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const item = payload[0].payload as ProductMetric;
                    return (
                      <div
                        className="rounded-lg border px-3 py-2 text-xs shadow-md"
                        style={tooltipStyle}
                      >
                        <div className="font-semibold mb-1">{item.product}</div>
                        <div className="font-mono tabular-nums space-y-0.5 text-slate-600 dark:text-slate-300">
                          <div>Unit price: {formatCurrency(item.unitPrice)}</div>
                          <div>Units sold: {item.units}</div>
                          <div>Revenue: {formatCurrency(item.revenue)} ({formatPercent(item.revenueShare)})</div>
                          <div>Multi-item rate: {formatPercent(item.multiItemRate)}</div>
                        </div>
                      </div>
                    );
                  }}
                />
                <Scatter
                  data={productMetrics}
                  onClick={(entry) => {
                    const prod = (entry as unknown as { payload?: ProductMetric; product?: string })
                      ?.payload?.product ?? (entry as unknown as { product?: string })?.product;
                    if (prod) {
                      onSelectProduct(activeProduct === prod ? 'all' : prod);
                    }
                  }}
                  className="cursor-pointer"
                >
                  {productMetrics.map((entry, idx) => (
                    <Cell
                      key={entry.product}
                      fill={FALLBACK_SERIES_COLORS[idx % FALLBACK_SERIES_COLORS.length]}
                      fillOpacity={
                        activeProduct !== 'all' && activeProduct !== entry.product ? 0.25 : 0.85
                      }
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </ChartPanel>

        <ChartPanel
          className="lg:col-span-6"
          title="Revenue Share Treemap"
          subtitle="Proportional tile area represents SKU revenue contribution; click a tile to filter"
        >
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <Treemap
                data={treemapData}
                dataKey="size"
                stroke="none"
                isAnimationActive={false}
                content={(props: Record<string, unknown>) => {
                  const fullName = String(props.fullName ?? '');
                  return (
                    <CustomTreemapNode
                      x={Number(props.x ?? 0)}
                      y={Number(props.y ?? 0)}
                      width={Number(props.width ?? 0)}
                      height={Number(props.height ?? 0)}
                      name={String(props.name ?? '')}
                      revenue={Number(props.revenue ?? 0)}
                      share={Number(props.share ?? 0)}
                      index={Number(props.index ?? 0)}
                      selected={activeProduct === fullName}
                      onClick={() => {
                        if (fullName) {
                          onSelectProduct(activeProduct === fullName ? 'all' : fullName);
                        }
                      }}
                    />
                  );
                }}
              >
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload as {
                      fullName: string;
                      revenue: number;
                      units: number;
                      share: number;
                    };
                    return (
                      <div
                        className="rounded-lg border px-3 py-2 text-xs shadow-md"
                        style={tooltipStyle}
                      >
                        <div className="font-semibold mb-1">{d.fullName}</div>
                        <div className="font-mono tabular-nums text-slate-600 dark:text-slate-300">
                          {formatCurrency(d.revenue)} · {d.units} units · {formatPercent(d.share)}
                        </div>
                      </div>
                    );
                  }}
                />
              </Treemap>
            </ResponsiveContainer>
          </div>
        </ChartPanel>
      </div>

      {/* Row 2: Pareto Concentration Curve */}
      <ChartPanel
        title="Revenue Concentration (Pareto Curve)"
        subtitle="Ranked SKU revenue paired with cumulative revenue percentage (80% threshold marked)"
      >
        <div className="h-[290px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={productMetrics} margin={{ top: 10, right: 16, left: 0, bottom: 26 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis
                dataKey="shortName"
                tick={{ fill: tickColor, fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: gridColor }}
                interval={0}
                angle={-22}
                textAnchor="end"
                height={54}
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
                domain={[0, 100]}
                tick={{ fill: tickColor, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}%`}
                width={42}
              />
              <ReferenceLine
                yAxisId="right"
                y={80}
                stroke="#D97706"
                strokeDasharray="4 4"
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value: unknown, name: unknown) => [
                  name === 'cumulativeShare'
                    ? formatPercent(Number(value))
                    : formatCurrency(Number(value)),
                  name === 'cumulativeShare' ? 'Cumulative Revenue %' : 'SKU Revenue',
                ]}
              />
              <Bar
                yAxisId="left"
                dataKey="revenue"
                fill="#2563EB"
                radius={[4, 4, 0, 0]}
                maxBarSize={36}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="cumulativeShare"
                stroke="#D97706"
                strokeWidth={2.25}
                dot={{ r: 3, fill: '#D97706', strokeWidth: 0 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </ChartPanel>

      {/* Row 3: Product x Payment Method Heatmap Matrix */}
      <ChartPanel
        title="Product × Payment Method Matrix"
        subtitle="Cross-tabulation of every product against payment channel; click any product row to filter"
        controls={
          <SegmentedControl<'revenue' | 'units'>
            ariaLabel="Matrix cell metric"
            value={matrixMode}
            onChange={setMatrixMode}
            options={[
              { value: 'revenue', label: 'Revenue ($)' },
              { value: 'units', label: 'Units (#)' },
            ]}
          />
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                <th className="py-2.5 pr-4 text-left font-medium">Product</th>
                <th className="py-2.5 px-3 text-right font-medium">Unit Price</th>
                {availablePayments.map((pm) => (
                  <th key={pm} className="py-2.5 px-3 text-right font-medium whitespace-nowrap">
                    {pm}
                  </th>
                ))}
                <th className="py-2.5 pl-4 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
              {productMetrics.map((prod) => {
                const isSelected = activeProduct === prod.product;
                return (
                  <tr
                    key={prod.product}
                    onClick={() =>
                      onSelectProduct(isSelected ? 'all' : prod.product)
                    }
                    className={`transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50/80 dark:bg-blue-950/50'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <td className="py-2.5 pr-4 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                      {prod.product}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-500 dark:text-slate-400">
                      {formatCurrency(prod.unitPrice)}
                    </td>
                    {availablePayments.map((pm) => {
                      const cell = prod.byPayment[pm];
                      const val =
                        matrixMode === 'revenue' ? cell?.revenue ?? 0 : cell?.units ?? 0;
                      const intensity = matrixMax > 0 ? val / matrixMax : 0;
                      const bgAlpha =
                        val === 0
                          ? 'transparent'
                          : isDark
                          ? `rgba(37, 99, 235, ${(0.12 + intensity * 0.55).toFixed(2)})`
                          : `rgba(37, 99, 235, ${(0.06 + intensity * 0.36).toFixed(2)})`;

                      return (
                        <td
                          key={pm}
                          className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-800 dark:text-slate-200"
                          style={{ backgroundColor: bgAlpha }}
                        >
                          {val === 0
                            ? '—'
                            : matrixMode === 'revenue'
                            ? formatCurrency(val, 0)
                            : val}
                        </td>
                      );
                    })}
                    <td className="py-2.5 pl-4 text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                      {matrixMode === 'revenue'
                        ? formatCurrency(prod.revenue, 0)
                        : `${prod.units} units`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </ChartPanel>
    </div>
  );
};
