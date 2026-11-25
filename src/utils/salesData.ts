import {
  CoPurchasePair,
  DashboardKPIs,
  FilterState,
  OrderSummary,
  OrderValueBucket,
  PaymentMetric,
  ProductMetric,
  SaleRecord,
  TimeSeriesPoint,
  WeekdayMetric,
} from '../types/sales';

export const DEFAULT_CSV_PATH = '/assets/aistudio/Sales_data_-_Sheet1_5e94d700.csv';

export const PAYMENT_COLORS: Record<string, string> = {
  'Credit Card': '#2563EB', // Cobalt
  'Debit Card': '#0D9488', // Teal
  eWallet: '#D97706', // Amber
  Cash: '#64748B', // Slate
};

export const FALLBACK_SERIES_COLORS = [
  '#2563EB',
  '#0D9488',
  '#D97706',
  '#475569',
  '#4F46E5',
  '#0284C7',
  '#059669',
  '#B45309',
  '#334155',
  '#1D4ED8',
  '#0F766E',
  '#64748B',
];

export const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const WEEKDAY_ORDER_MON_FIRST = [1, 2, 3, 4, 5, 6, 0];

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function getPaymentColor(method: string, index = 0): string {
  return PAYMENT_COLORS[method] ?? FALLBACK_SERIES_COLORS[index % FALLBACK_SERIES_COLORS.length];
}

export function formatCurrency(value: number, decimals = 2): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatCompactCurrency(value: number): string {
  if (Math.abs(value) >= 10000) {
    return `$${(value / 1000).toFixed(1)}k`;
  }
  return formatCurrency(value, 0);
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatDateShort(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return isoDate;
  return `${MONTH_NAMES[m - 1]} ${d}`;
}

export function formatDateFull(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return isoDate;
  return `${MONTH_NAMES[m - 1]} ${d}, ${y}`;
}

export function shortenProductName(name: string): string {
  return name
    .replace('Flannel-Lined Canvas Work Pants', 'Flannel Work Pants')
    .replace('Technical Performance Joggers', 'Tech Joggers')
    .replace('Double-Pleated Khaki Trousers', 'Double-Pleated Khaki')
    .replace('Relaxed Fit Corduroy Trousers', 'Corduroy Trousers')
    .replace('Tailored Wool Dress Trousers', 'Wool Dress Trousers')
    .replace('Premium Tailored Trousers', 'Premium Tailored')
    .replace('Multi-Pocket Cargo Shorts', 'Cargo Shorts')
    .replace('Drawstring Linen Trousers', 'Linen Trousers')
    .replace('Striped Seersucker Trousers', 'Seersucker Trousers')
    .replace('Slim-Fit Denim Jeans', 'Slim-Fit Jeans')
    .replace('Classic Denim Overalls', 'Denim Overalls')
    .replace('Classic Fit Chinos', 'Classic Chinos');
}

function getMondayKey(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const day = dt.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  dt.setUTCDate(dt.getUTCDate() + diff);
  return dt.toISOString().slice(0, 10);
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

export function parseSalesCsv(csvText: string): SaleRecord[] {
  const lines = csvText
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    throw new Error('CSV file must include a header row and at least one data row.');
  }

  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase().trim());

  const findCol = (candidates: string[], fallbackIndex: number): number => {
    const idx = headers.findIndex((h) => candidates.some((c) => h.includes(c)));
    return idx !== -1 ? idx : fallbackIndex;
  };

  const orderIdx = findCol(['order', 'id', 'invoice'], 0);
  const productIdx = findCol(['product', 'item', 'sku', 'name'], 1);
  const priceIdx = findCol(['price', 'amount', 'revenue', 'total', 'cost'], 2);
  const dateIdx = findCol(['date', 'day', 'time'], 3);
  const paymentIdx = findCol(['payment', 'method', 'tender', 'channel'], 4);

  const records: SaleRecord[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    if (cols.length < 4) continue;

    const orderNumber = cols[orderIdx] || `ROW-${i}`;
    const product = cols[productIdx] || 'Unknown Product';
    const rawPrice = (cols[priceIdx] || '0').replace(/[^0-9.-]/g, '');
    const price = Number.parseFloat(rawPrice);
    const date = (cols[dateIdx] || '').slice(0, 10);
    const paymentMethod = cols[paymentIdx] || 'Other';

    if (!Number.isFinite(price) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      continue;
    }

    const [y, m, d] = date.split('-').map(Number);
    const utcDate = new Date(Date.UTC(y, m - 1, d));
    const dayOfWeekIndex = utcDate.getUTCDay();
    const monthKey = `${y}-${String(m).padStart(2, '0')}`;
    const monthLabel = `${MONTH_NAMES[m - 1]} ${y}`;

    records.push({
      id: `${orderNumber}-${i}`,
      orderNumber,
      product,
      price,
      date,
      paymentMethod,
      monthKey,
      monthLabel,
      dayOfWeekIndex,
      dayOfWeek: WEEKDAY_NAMES[dayOfWeekIndex],
      weekKey: getMondayKey(date),
    });
  }

  if (records.length === 0) {
    throw new Error('No valid sales records could be parsed from the CSV file.');
  }

  return records.sort((a, b) => a.date.localeCompare(b.date) || a.orderNumber.localeCompare(b.orderNumber));
}

export function buildOrderSummaries(records: SaleRecord[]): OrderSummary[] {
  const map = new Map<string, SaleRecord[]>();
  for (const r of records) {
    const existing = map.get(r.orderNumber);
    if (existing) {
      existing.push(r);
    } else {
      map.set(r.orderNumber, [r]);
    }
  }

  const summaries: OrderSummary[] = [];
  for (const [orderNumber, items] of map.entries()) {
    const paymentSet = Array.from(new Set(items.map((it) => it.paymentMethod)));
    summaries.push({
      orderNumber,
      date: items[0].date,
      monthKey: items[0].monthKey,
      items,
      itemCount: items.length,
      totalValue: items.reduce((sum, it) => sum + it.price, 0),
      paymentMethods: paymentSet,
      isMultiItem: items.length > 1,
      isSplitPayment: paymentSet.length > 1,
    });
  }

  return summaries.sort((a, b) => a.date.localeCompare(b.date) || a.orderNumber.localeCompare(b.orderNumber));
}

export function filterSalesRecords(
  allRecords: SaleRecord[],
  filters: FilterState,
  allOrderCountMap: Map<string, number>
): SaleRecord[] {
  const q = filters.searchQuery.trim().toLowerCase();

  return allRecords.filter((r) => {
    if (filters.selectedDay && r.date !== filters.selectedDay) return false;
    if (filters.startDate && r.date < filters.startDate) return false;
    if (filters.endDate && r.date > filters.endDate) return false;
    if (filters.paymentMethods.length > 0 && !filters.paymentMethods.includes(r.paymentMethod)) {
      return false;
    }
    if (filters.product !== 'all' && r.product !== filters.product) return false;

    const orderItemCount = allOrderCountMap.get(r.orderNumber) ?? 1;
    if (filters.basketType === 'multi' && orderItemCount < 2) return false;
    if (filters.basketType === 'single' && orderItemCount !== 1) return false;

    if (q) {
      const hay = `${r.orderNumber} ${r.product} ${r.paymentMethod} ${r.date}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }

    return true;
  });
}

export function computeKPIs(records: SaleRecord[]): DashboardKPIs {
  const totalRevenue = records.reduce((s, r) => s + r.price, 0);
  const totalItems = records.length;
  const orders = buildOrderSummaries(records);
  const uniqueOrders = orders.length;
  const avgOrderValue = uniqueOrders > 0 ? totalRevenue / uniqueOrders : 0;
  const avgItemPrice = totalItems > 0 ? totalRevenue / totalItems : 0;
  const itemsPerOrder = uniqueOrders > 0 ? totalItems / uniqueOrders : 0;
  const multiItemOrders = orders.filter((o) => o.isMultiItem).length;
  const multiItemRate = uniqueOrders > 0 ? (multiItemOrders / uniqueOrders) * 100 : 0;
  const splitPaymentOrders = orders.filter((o) => o.isSplitPayment).length;

  const dayMap = new Map<string, { revenue: number; items: number }>();
  const productMap = new Map<string, { revenue: number; units: number }>();
  const paymentMap = new Map<string, number>();

  for (const r of records) {
    const d = dayMap.get(r.date) ?? { revenue: 0, items: 0 };
    d.revenue += r.price;
    d.items += 1;
    dayMap.set(r.date, d);

    const p = productMap.get(r.product) ?? { revenue: 0, units: 0 };
    p.revenue += r.price;
    p.units += 1;
    productMap.set(r.product, p);

    paymentMap.set(r.paymentMethod, (paymentMap.get(r.paymentMethod) ?? 0) + r.price);
  }

  const activeDays = dayMap.size;
  const avgDailyRevenue = activeDays > 0 ? totalRevenue / activeDays : 0;

  let topProduct: DashboardKPIs['topProduct'] = null;
  for (const [name, stats] of productMap.entries()) {
    if (!topProduct || stats.revenue > topProduct.revenue) {
      topProduct = { name, revenue: stats.revenue, units: stats.units };
    }
  }

  let topPayment: DashboardKPIs['topPayment'] = null;
  for (const [method, revenue] of paymentMap.entries()) {
    if (!topPayment || revenue > topPayment.revenue) {
      topPayment = {
        method,
        revenue,
        share: totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0,
      };
    }
  }

  let peakDay: DashboardKPIs['peakDay'] = null;
  for (const [date, stats] of dayMap.entries()) {
    if (!peakDay || stats.revenue > peakDay.revenue) {
      peakDay = { date, revenue: stats.revenue, items: stats.items };
    }
  }

  return {
    totalRevenue,
    totalItems,
    uniqueOrders,
    avgOrderValue,
    avgItemPrice,
    itemsPerOrder,
    multiItemOrders,
    multiItemRate,
    splitPaymentOrders,
    activeDays,
    avgDailyRevenue,
    topProduct,
    topPayment,
    peakDay,
  };
}

export function enumerateDateRange(startDate: string, endDate: string): string[] {
  if (!startDate || !endDate || startDate > endDate) return [];
  const dates: string[] = [];
  const [sy, sm, sd] = startDate.split('-').map(Number);
  const [ey, em, ed] = endDate.split('-').map(Number);
  const current = new Date(Date.UTC(sy, sm - 1, sd));
  const end = new Date(Date.UTC(ey, em - 1, ed));

  let guard = 0;
  while (current <= end && guard < 400) {
    dates.push(current.toISOString().slice(0, 10));
    current.setUTCDate(current.getUTCDate() + 1);
    guard++;
  }
  return dates;
}

export function buildTimeSeries(
  records: SaleRecord[],
  granularity: 'day' | 'week' | 'month',
  paymentMethods: string[]
): TimeSeriesPoint[] {
  if (records.length === 0) return [];

  const buckets = new Map<
    string,
    {
      label: string;
      revenue: number;
      items: number;
      orders: Set<string>;
      byPayment: Record<string, number>;
    }
  >();

  const initPaymentObj = () => {
    const obj: Record<string, number> = {};
    for (const pm of paymentMethods) obj[pm] = 0;
    return obj;
  };

  if (granularity === 'day') {
    const sortedDates = records.map((r) => r.date).sort();
    const allDates = enumerateDateRange(sortedDates[0], sortedDates[sortedDates.length - 1]);
    for (const d of allDates) {
      buckets.set(d, {
        label: formatDateShort(d),
        revenue: 0,
        items: 0,
        orders: new Set<string>(),
        byPayment: initPaymentObj(),
      });
    }
  }

  for (const r of records) {
    let key = r.date;
    let label = formatDateShort(r.date);
    if (granularity === 'week') {
      key = r.weekKey;
      label = `Wk ${formatDateShort(r.weekKey)}`;
    } else if (granularity === 'month') {
      key = r.monthKey;
      label = r.monthLabel;
    }

    let entry = buckets.get(key);
    if (!entry) {
      entry = {
        label,
        revenue: 0,
        items: 0,
        orders: new Set<string>(),
        byPayment: initPaymentObj(),
      };
      buckets.set(key, entry);
    }

    entry.revenue += r.price;
    entry.items += 1;
    entry.orders.add(r.orderNumber);
    entry.byPayment[r.paymentMethod] = (entry.byPayment[r.paymentMethod] ?? 0) + r.price;
  }

  const sortedKeys = Array.from(buckets.keys()).sort();
  let cumulative = 0;
  const result: TimeSeriesPoint[] = [];

  for (let i = 0; i < sortedKeys.length; i++) {
    const key = sortedKeys[i];
    const b = buckets.get(key)!;
    cumulative += b.revenue;
    const orderCount = b.orders.size;

    const windowStart = Math.max(0, i - 6);
    let windowSum = 0;
    for (let j = windowStart; j <= i; j++) {
      windowSum += buckets.get(sortedKeys[j])!.revenue;
    }
    const movingAvg7 = windowSum / (i - windowStart + 1);

    result.push({
      key,
      label: b.label,
      revenue: b.revenue,
      items: b.items,
      orders: orderCount,
      avgOrderValue: orderCount > 0 ? b.revenue / orderCount : 0,
      cumulativeRevenue: cumulative,
      movingAvg7: Number(movingAvg7.toFixed(2)),
      byPayment: b.byPayment,
    });
  }

  return result;
}

export function buildProductMetrics(records: SaleRecord[]): ProductMetric[] {
  const totalRevenue = records.reduce((s, r) => s + r.price, 0);
  const orderCountByNumber = new Map<string, number>();
  for (const r of records) {
    orderCountByNumber.set(r.orderNumber, (orderCountByNumber.get(r.orderNumber) ?? 0) + 1);
  }

  const map = new Map<
    string,
    {
      units: number;
      revenue: number;
      orders: Set<string>;
      multiAppearances: number;
      byPayment: Record<string, { revenue: number; units: number }>;
    }
  >();

  for (const r of records) {
    let entry = map.get(r.product);
    if (!entry) {
      entry = {
        units: 0,
        revenue: 0,
        orders: new Set(),
        multiAppearances: 0,
        byPayment: {},
      };
      map.set(r.product, entry);
    }
    entry.units += 1;
    entry.revenue += r.price;
    entry.orders.add(r.orderNumber);
    if ((orderCountByNumber.get(r.orderNumber) ?? 1) > 1) {
      entry.multiAppearances += 1;
    }
    if (!entry.byPayment[r.paymentMethod]) {
      entry.byPayment[r.paymentMethod] = { revenue: 0, units: 0 };
    }
    entry.byPayment[r.paymentMethod].revenue += r.price;
    entry.byPayment[r.paymentMethod].units += 1;
  }

  const sorted = Array.from(map.entries())
    .map(([product, stats]) => ({
      product,
      shortName: shortenProductName(product),
      unitPrice: stats.units > 0 ? stats.revenue / stats.units : 0,
      units: stats.units,
      revenue: stats.revenue,
      orderCount: stats.orders.size,
      revenueShare: totalRevenue > 0 ? (stats.revenue / totalRevenue) * 100 : 0,
      cumulativeShare: 0,
      multiItemAppearances: stats.multiAppearances,
      multiItemRate: stats.units > 0 ? (stats.multiAppearances / stats.units) * 100 : 0,
      byPayment: stats.byPayment,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  let runningShare = 0;
  for (const item of sorted) {
    runningShare += item.revenueShare;
    item.cumulativeShare = Math.min(100, Number(runningShare.toFixed(1)));
  }

  return sorted;
}

export function buildPaymentMetrics(records: SaleRecord[]): PaymentMetric[] {
  const totalRevenue = records.reduce((s, r) => s + r.price, 0);
  const totalItems = records.length;

  const map = new Map<string, { revenue: number; items: number; orders: Set<string> }>();
  for (const r of records) {
    const entry = map.get(r.paymentMethod) ?? { revenue: 0, items: 0, orders: new Set<string>() };
    entry.revenue += r.price;
    entry.items += 1;
    entry.orders.add(r.orderNumber);
    map.set(r.paymentMethod, entry);
  }

  return Array.from(map.entries())
    .map(([method, stats], idx) => ({
      method,
      revenue: stats.revenue,
      items: stats.items,
      orders: stats.orders.size,
      revenueShare: totalRevenue > 0 ? (stats.revenue / totalRevenue) * 100 : 0,
      itemShare: totalItems > 0 ? (stats.items / totalItems) * 100 : 0,
      avgItemPrice: stats.items > 0 ? stats.revenue / stats.items : 0,
      color: getPaymentColor(method, idx),
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

export function buildWeekdayMetrics(
  records: SaleRecord[],
  paymentMethods: string[]
): WeekdayMetric[] {
  const byIndex = new Map<
    number,
    {
      revenue: number;
      items: number;
      orders: Set<string>;
      dates: Set<string>;
      byPayment: Record<string, number>;
    }
  >();

  for (const idx of WEEKDAY_ORDER_MON_FIRST) {
    const byPayment: Record<string, number> = {};
    for (const pm of paymentMethods) byPayment[pm] = 0;
    byIndex.set(idx, {
      revenue: 0,
      items: 0,
      orders: new Set(),
      dates: new Set(),
      byPayment,
    });
  }

  for (const r of records) {
    const entry = byIndex.get(r.dayOfWeekIndex)!;
    entry.revenue += r.price;
    entry.items += 1;
    entry.orders.add(r.orderNumber);
    entry.dates.add(r.date);
    entry.byPayment[r.paymentMethod] = (entry.byPayment[r.paymentMethod] ?? 0) + r.price;
  }

  return WEEKDAY_ORDER_MON_FIRST.map((dayIndex) => {
    const e = byIndex.get(dayIndex)!;
    const occurrences = e.dates.size;
    return {
      dayIndex,
      day: WEEKDAY_NAMES[dayIndex],
      revenue: e.revenue,
      items: e.items,
      orders: e.orders.size,
      occurrences,
      avgDailyRevenue: occurrences > 0 ? e.revenue / occurrences : 0,
      byPayment: e.byPayment,
    };
  });
}

export function buildCoPurchasePairs(orders: OrderSummary[]): CoPurchasePair[] {
  const pairMap = new Map<string, CoPurchasePair>();

  for (const order of orders) {
    if (order.items.length < 2) continue;
    for (let i = 0; i < order.items.length; i++) {
      for (let j = i + 1; j < order.items.length; j++) {
        const [a, b] = [order.items[i].product, order.items[j].product].sort();
        const key = `${a}|||${b}`;
        const existing = pairMap.get(key);
        if (existing) {
          existing.count += 1;
          existing.combinedRevenue += order.items[i].price + order.items[j].price;
          existing.orderNumbers.push(order.orderNumber);
        } else {
          pairMap.set(key, {
            productA: a,
            productB: b,
            count: 1,
            combinedRevenue: order.items[i].price + order.items[j].price,
            orderNumbers: [order.orderNumber],
          });
        }
      }
    }
  }

  return Array.from(pairMap.values()).sort(
    (a, b) => b.count - a.count || b.combinedRevenue - a.combinedRevenue
  );
}

export function buildOrderValueDistribution(orders: OrderSummary[]): OrderValueBucket[] {
  const defs = [
    { range: '$50–$79', min: 50, max: 79.99 },
    { range: '$80–$99', min: 80, max: 99.99 },
    { range: '$100–$139', min: 100, max: 139.99 },
    { range: '$140–$169', min: 140, max: 169.99 },
    { range: '$170–$199', min: 170, max: 199.99 },
    { range: '$200+', min: 200, max: Infinity },
  ];

  const buckets: OrderValueBucket[] = defs.map((d) => ({
    ...d,
    orders: 0,
    revenue: 0,
    singleCount: 0,
    multiCount: 0,
  }));

  for (const o of orders) {
    const bucket = buckets.find((b) => o.totalValue >= b.min && o.totalValue <= b.max) ?? buckets[buckets.length - 1];
    bucket.orders += 1;
    bucket.revenue += o.totalValue;
    if (o.isMultiItem) {
      bucket.multiCount += 1;
    } else {
      bucket.singleCount += 1;
    }
  }

  return buckets;
}

export function exportSalesCsv(records: SaleRecord[], filename = 'filtered-sales-data.csv'): void {
  const header = 'Order Number,Product,Price,Date,Payment Method';
  const rows = records.map((r) => {
    const escapedProduct = r.product.includes(',') ? `"${r.product.replace(/"/g, '""')}"` : r.product;
    return `${r.orderNumber},${escapedProduct},$${r.price.toFixed(2)},${r.date},${r.paymentMethod}`;
  });
  const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
