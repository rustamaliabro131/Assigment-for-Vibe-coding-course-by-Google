export type PaymentMethod = 'Credit Card' | 'Debit Card' | 'eWallet' | 'Cash' | string;

export interface SaleRecord {
  id: string;
  orderNumber: string;
  product: string;
  price: number;
  date: string; // YYYY-MM-DD
  paymentMethod: PaymentMethod;
  monthKey: string; // YYYY-MM
  monthLabel: string; // e.g. Aug 2025
  dayOfWeekIndex: number; // 0 (Sun) - 6 (Sat)
  dayOfWeek: string; // Sun, Mon, ...
  weekKey: string; // YYYY-MM-DD of Monday
}

export interface OrderSummary {
  orderNumber: string;
  date: string;
  monthKey: string;
  items: SaleRecord[];
  itemCount: number;
  totalValue: number;
  paymentMethods: string[];
  isMultiItem: boolean;
  isSplitPayment: boolean;
}

export type BasketFilter = 'all' | 'multi' | 'single';

export interface FilterState {
  startDate: string;
  endDate: string;
  paymentMethods: string[]; // empty = all
  product: string; // 'all' or specific product
  searchQuery: string;
  basketType: BasketFilter;
  selectedDay: string | null; // exact YYYY-MM-DD from heatmap click
}

export type DashboardView =
  | 'overview'
  | 'trends'
  | 'products'
  | 'baskets'
  | 'ledger';

export interface DashboardKPIs {
  totalRevenue: number;
  totalItems: number;
  uniqueOrders: number;
  avgOrderValue: number;
  avgItemPrice: number;
  itemsPerOrder: number;
  multiItemOrders: number;
  multiItemRate: number;
  splitPaymentOrders: number;
  activeDays: number;
  avgDailyRevenue: number;
  topProduct: { name: string; revenue: number; units: number } | null;
  topPayment: { method: string; revenue: number; share: number } | null;
  peakDay: { date: string; revenue: number; items: number } | null;
}

export interface TimeSeriesPoint {
  key: string;
  label: string;
  revenue: number;
  items: number;
  orders: number;
  avgOrderValue: number;
  cumulativeRevenue: number;
  movingAvg7: number;
  byPayment: Record<string, number>;
}

export interface ProductMetric {
  product: string;
  shortName: string;
  unitPrice: number;
  units: number;
  revenue: number;
  orderCount: number;
  revenueShare: number;
  cumulativeShare: number;
  multiItemAppearances: number;
  multiItemRate: number;
  byPayment: Record<string, { revenue: number; units: number }>;
}

export interface PaymentMetric {
  method: string;
  revenue: number;
  items: number;
  orders: number;
  revenueShare: number;
  itemShare: number;
  avgItemPrice: number;
  color: string;
}

export interface WeekdayMetric {
  dayIndex: number;
  day: string;
  revenue: number;
  items: number;
  orders: number;
  avgDailyRevenue: number;
  occurrences: number;
  byPayment: Record<string, number>;
}

export interface CoPurchasePair {
  productA: string;
  productB: string;
  count: number;
  combinedRevenue: number;
  orderNumbers: string[];
}

export interface OrderValueBucket {
  range: string;
  min: number;
  max: number;
  orders: number;
  revenue: number;
  singleCount: number;
  multiCount: number;
}
