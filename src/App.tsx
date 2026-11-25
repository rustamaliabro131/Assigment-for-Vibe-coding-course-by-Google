import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart3,
  CalendarRange,
  Download,
  Layers,
  Menu,
  Moon,
  RotateCcw,
  ShoppingBag,
  Sun,
  Table2,
  Upload,
  X,
} from 'lucide-react';
import { BasketsView } from './components/BasketsView';
import { FilterBar } from './components/FilterBar';
import { KpiStrip } from './components/KpiStrip';
import { LedgerView } from './components/LedgerView';
import { OverviewView } from './components/OverviewView';
import { ProductsView } from './components/ProductsView';
import { TrendsView } from './components/TrendsView';
import { DashboardView, FilterState, SaleRecord } from './types/sales';
import {
  buildOrderSummaries,
  buildPaymentMetrics,
  buildProductMetrics,
  buildWeekdayMetrics,
  computeKPIs,
  DEFAULT_CSV_PATH,
  exportSalesCsv,
  filterSalesRecords,
  parseSalesCsv,
} from './utils/salesData';

const NAV_ITEMS: { id: DashboardView; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'trends', label: 'Time & Trends', icon: CalendarRange },
  { id: 'products', label: 'Product Lab', icon: Layers },
  { id: 'baskets', label: 'Orders & Baskets', icon: ShoppingBag },
  { id: 'ledger', label: 'Data Ledger', icon: Table2 },
];

export default function App() {
  const [records, setRecords] = useState<SaleRecord[]>([]);
  const [isCustomDataset, setIsCustomDataset] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<DashboardView>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [filters, setFilters] = useState<FilterState>({
    startDate: '',
    endDate: '',
    paymentMethods: [],
    product: 'all',
    searchQuery: '',
    basketType: 'all',
    selectedDay: null,
  });

  // Sync dark mode class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) root.classList.add('dark');
    else root.classList.remove('dark');
  }, [isDark]);

  const applyLoadedRecords = useCallback((parsed: SaleRecord[], custom: boolean) => {
    setRecords(parsed);
    setIsCustomDataset(custom);
    const minD = parsed[0]?.date ?? '';
    const maxD = parsed[parsed.length - 1]?.date ?? '';
    setFilters({
      startDate: minD,
      endDate: maxD,
      paymentMethods: [],
      product: 'all',
      searchQuery: '',
      basketType: 'all',
      selectedDay: null,
    });
  }, []);

  const loadDefaultDataset = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(DEFAULT_CSV_PATH);
      if (!response.ok) {
        throw new Error(`Unable to load sales dataset (HTTP ${response.status}).`);
      }
      const csvText = await response.text();
      const parsed = parseSalesCsv(csvText);
      applyLoadedRecords(parsed, false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sales CSV.');
    } finally {
      setLoading(false);
    }
  }, [applyLoadedRecords]);

  useEffect(() => {
    loadDefaultDataset();
  }, [loadDefaultDataset]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result ?? '');
        const parsed = parseSalesCsv(text);
        setError(null);
        applyLoadedRecords(parsed, true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not parse uploaded CSV.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Derive dataset metadata
  const { minDate, maxDate, availableProducts, availablePayments, availableMonths, allOrderCountMap } =
    useMemo(() => {
      const products = Array.from(new Set(records.map((r) => r.product))).sort();
      const paymentOrder = ['Credit Card', 'Debit Card', 'eWallet', 'Cash'];
      const paymentsSet = Array.from(new Set(records.map((r) => r.paymentMethod)));
      paymentsSet.sort((a, b) => {
        const ia = paymentOrder.indexOf(a);
        const ib = paymentOrder.indexOf(b);
        if (ia !== -1 && ib !== -1) return ia - ib;
        if (ia !== -1) return -1;
        if (ib !== -1) return 1;
        return a.localeCompare(b);
      });

      const monthMap = new Map<string, { label: string; start: string; end: string }>();
      const orderCounts = new Map<string, number>();

      for (const r of records) {
        orderCounts.set(r.orderNumber, (orderCounts.get(r.orderNumber) ?? 0) + 1);
        const existing = monthMap.get(r.monthKey);
        if (!existing) {
          monthMap.set(r.monthKey, {
            label: r.monthLabel.split(' ')[0],
            start: r.date,
            end: r.date,
          });
        } else {
          if (r.date < existing.start) existing.start = r.date;
          if (r.date > existing.end) existing.end = r.date;
        }
      }

      const months = Array.from(monthMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, val]) => ({ key, ...val }));

      return {
        minDate: records[0]?.date ?? '',
        maxDate: records[records.length - 1]?.date ?? '',
        availableProducts: products,
        availablePayments: paymentsSet,
        availableMonths: months,
        allOrderCountMap: orderCounts,
      };
    }, [records]);

  const filteredRecords = useMemo(
    () => filterSalesRecords(records, filters, allOrderCountMap),
    [records, filters, allOrderCountMap]
  );

  const filteredOrders = useMemo(() => buildOrderSummaries(filteredRecords), [filteredRecords]);
  const kpis = useMemo(() => computeKPIs(filteredRecords), [filteredRecords]);
  const productMetrics = useMemo(() => buildProductMetrics(filteredRecords), [filteredRecords]);
  const paymentMetrics = useMemo(() => buildPaymentMetrics(filteredRecords), [filteredRecords]);
  const weekdayMetrics = useMemo(
    () => buildWeekdayMetrics(filteredRecords, availablePayments),
    [filteredRecords, availablePayments]
  );

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.startDate && filters.startDate !== minDate) count++;
    if (filters.endDate && filters.endDate !== maxDate) count++;
    if (filters.paymentMethods.length > 0) count++;
    if (filters.product !== 'all') count++;
    if (filters.searchQuery.trim() !== '') count++;
    if (filters.basketType !== 'all') count++;
    if (filters.selectedDay) count++;
    return count;
  }, [filters, minDate, maxDate]);

  const handleResetFilters = () => {
    setFilters({
      startDate: minDate,
      endDate: maxDate,
      paymentMethods: [],
      product: 'all',
      searchQuery: '',
      basketType: 'all',
      selectedDay: null,
    });
  };

  const handleTogglePayment = (method: string) => {
    setFilters((prev) => {
      const exists = prev.paymentMethods.includes(method);
      return {
        ...prev,
        paymentMethods: exists
          ? prev.paymentMethods.filter((m) => m !== method)
          : [...prev.paymentMethods, method],
      };
    });
  };

  const handleSelectProduct = (product: string) => {
    setFilters((prev) => ({ ...prev, product }));
  };

  const handleSelectDay = (day: string | null) => {
    setFilters((prev) => ({ ...prev, selectedDay: day }));
  };

  const currentNav = NAV_ITEMS.find((n) => n.id === activeView) ?? NAV_ITEMS[0];

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Brand Wordmark */}
      <div className="h-14 px-5 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 shrink-0">
        <span className="text-[16px] font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0">
          Sales Analytics
        </span>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(false)}
          aria-label="Close navigation menu"
          className="lg:hidden p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 rounded-md cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation Views */}
      <nav aria-label="Dashboard views" className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = item.id === activeView;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setActiveView(item.id);
                setMobileMenuOpen(false);
              }}
              aria-current={active ? 'page' : undefined}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-600 ${
                active
                  ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Upload Action */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 shrink-0">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleFileUpload}
          className="hidden"
          aria-label="Upload CSV dataset"
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 shrink-0" />
            Upload Your Own CSV
          </button>
          {isCustomDataset && (
            <button
              type="button"
              onClick={loadDefaultDataset}
              title="Restore attached sales dataset"
              className="inline-flex items-center justify-center p-2 text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex">
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-60 lg:fixed lg:inset-y-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Slide-Over Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/50"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative w-64 max-w-[80vw] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-10 flex flex-col">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main Content Workspace */}
      <div className="flex-1 lg:pl-60 flex flex-col min-w-0">
        {/* Top Bar Contract: Breadcrumb on Left, Primary Actions on Right */}
        <header className="sticky top-0 z-20 h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-1.5 -ml-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 rounded-md cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0 truncate">
              <span className="text-slate-500 dark:text-slate-400 whitespace-nowrap">
                Sales Analytics
              </span>
              <span className="text-slate-300 dark:text-slate-600" aria-hidden="true">
                /
              </span>
              <h1 className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                {currentNav.label}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsDark((d) => !d)}
              aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
              className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              type="button"
              disabled={filteredRecords.length === 0}
              onClick={() =>
                exportSalesCsv(
                  filteredRecords,
                  `threadline-sales-${activeView}-${filteredRecords.length}-rows.csv`
                )
              }
              className="h-9 inline-flex items-center gap-1.5 px-3.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-45 disabled:pointer-events-none rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          </div>
        </header>

        {/* Main Scrollable Canvas */}
        <main className="flex-1 p-4 sm:p-6 max-w-[1400px] w-full mx-auto space-y-5">
          {loading ? (
            <div className="space-y-5" aria-busy="true" aria-label="Loading sales dataset">
              <div className="h-24 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl animate-pulse" />
              <div className="h-24 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl animate-pulse" />
              <div className="h-[360px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl animate-pulse" />
            </div>
          ) : error ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center space-y-3">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Dataset could not be loaded
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                {error}
              </p>
              <button
                type="button"
                onClick={loadDefaultDataset}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Retry loading dataset
              </button>
            </div>
          ) : (
            <>
              <FilterBar
                filters={filters}
                onChange={setFilters}
                onReset={handleResetFilters}
                availableProducts={availableProducts}
                availablePayments={availablePayments}
                availableMonths={availableMonths}
                minDate={minDate}
                maxDate={maxDate}
                activeFilterCount={activeFilterCount}
                filteredCount={filteredRecords.length}
                totalCount={records.length}
              />

              <KpiStrip kpis={kpis} />

              {filteredRecords.length === 0 ? (
                <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-16 px-6 text-center space-y-3">
                  <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    No sales match these filters
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                    Try widening the date range, clearing the product selection, or resetting all active filters to restore all {records.length} line items.
                  </p>
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset all filters
                  </button>
                </section>
              ) : (
                <>
                  {activeView === 'overview' && (
                    <OverviewView
                      records={filteredRecords}
                      productMetrics={productMetrics}
                      paymentMetrics={paymentMetrics}
                      weekdayMetrics={weekdayMetrics}
                      availablePayments={availablePayments}
                      activeProduct={filters.product}
                      activePayments={filters.paymentMethods}
                      onSelectProduct={handleSelectProduct}
                      onTogglePayment={handleTogglePayment}
                      isDark={isDark}
                    />
                  )}

                  {activeView === 'trends' && (
                    <TrendsView
                      records={filteredRecords}
                      allRecords={records}
                      weekdayMetrics={weekdayMetrics}
                      availablePayments={availablePayments}
                      selectedDay={filters.selectedDay}
                      onSelectDay={handleSelectDay}
                      isDark={isDark}
                    />
                  )}

                  {activeView === 'products' && (
                    <ProductsView
                      productMetrics={productMetrics}
                      availablePayments={availablePayments}
                      activeProduct={filters.product}
                      onSelectProduct={handleSelectProduct}
                      isDark={isDark}
                    />
                  )}

                  {activeView === 'baskets' && (
                    <BasketsView
                      orders={filteredOrders}
                      paymentMetrics={paymentMetrics}
                      isDark={isDark}
                    />
                  )}

                  {activeView === 'ledger' && (
                    <LedgerView records={filteredRecords} orders={filteredOrders} />
                  )}
                </>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
