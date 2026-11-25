import React from 'react';
import { RotateCcw, Search, X } from 'lucide-react';
import { BasketFilter, FilterState } from '../types/sales';
import { formatDateFull } from '../utils/salesData';
import { SegmentedControl } from './ChartPanel';

interface FilterBarProps {
  filters: FilterState;
  onChange: (next: FilterState) => void;
  onReset: () => void;
  availableProducts: string[];
  availablePayments: string[];
  availableMonths: { key: string; label: string; start: string; end: string }[];
  minDate: string;
  maxDate: string;
  activeFilterCount: number;
  filteredCount: number;
  totalCount: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onChange,
  onReset,
  availableProducts,
  availablePayments,
  availableMonths,
  minDate,
  maxDate,
  activeFilterCount,
  filteredCount,
  totalCount,
}) => {
  const togglePayment = (method: string) => {
    const exists = filters.paymentMethods.includes(method);
    const nextPayments = exists
      ? filters.paymentMethods.filter((m) => m !== method)
      : [...filters.paymentMethods, method];
    onChange({ ...filters, paymentMethods: nextPayments });
  };

  const applyMonthPreset = (start: string, end: string) => {
    onChange({
      ...filters,
      startDate: start,
      endDate: end,
      selectedDay: null,
    });
  };

  const activePreset = (() => {
    if (filters.selectedDay) return 'day';
    if (filters.startDate === minDate && filters.endDate === maxDate) return 'all';
    const match = availableMonths.find(
      (m) => m.start === filters.startDate && m.end === filters.endDate
    );
    return match ? match.key : 'custom';
  })();

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3.5 space-y-3">
      {/* Row 1: Date range presets + exact dates + search */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div
            role="group"
            aria-label="Date range quick filter"
            className="inline-flex items-center gap-0.5 p-0.5 bg-slate-100 dark:bg-slate-800/90 rounded-lg border border-slate-200/80 dark:border-slate-700/80"
          >
            <button
              type="button"
              onClick={() => applyMonthPreset(minDate, maxDate)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activePreset === 'all'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              All dates
            </button>
            {availableMonths.map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => applyMonthPreset(m.start, m.end)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activePreset === m.key
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <input
              type="date"
              aria-label="Start date"
              value={filters.startDate}
              min={minDate}
              max={filters.endDate || maxDate}
              onChange={(e) =>
                onChange({ ...filters, startDate: e.target.value, selectedDay: null })
              }
              className="px-2.5 py-1.5 text-xs font-mono tabular-nums bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-md text-slate-800 dark:text-slate-200 focus-visible:outline-2 focus-visible:outline-blue-600"
            />
            <span aria-hidden="true">–</span>
            <input
              type="date"
              aria-label="End date"
              value={filters.endDate}
              min={filters.startDate || minDate}
              max={maxDate}
              onChange={(e) =>
                onChange({ ...filters, endDate: e.target.value, selectedDay: null })
              }
              className="px-2.5 py-1.5 text-xs font-mono tabular-nums bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-md text-slate-800 dark:text-slate-200 focus-visible:outline-2 focus-visible:outline-blue-600"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={filters.searchQuery}
              onChange={(e) => onChange({ ...filters, searchQuery: e.target.value })}
              placeholder="Search order or product..."
              aria-label="Search sales records"
              className="w-52 pl-8 pr-7 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus-visible:outline-2 focus-visible:outline-blue-600"
            />
            {filters.searchQuery && (
              <button
                type="button"
                onClick={() => onChange({ ...filters, searchQuery: '' })}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-950 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset filters
            </button>
          )}
        </div>
      </div>

      {/* Row 2: Payment toggles + Product selector + Basket type */}
      <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Filter by payment method">
            <button
              type="button"
              onClick={() => onChange({ ...filters, paymentMethods: [] })}
              className={`h-8 px-2.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                filters.paymentMethods.length === 0
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              All payments
            </button>
            {availablePayments.map((method) => {
              const selected = filters.paymentMethods.includes(method);
              return (
                <button
                  key={method}
                  type="button"
                  onClick={() => togglePayment(method)}
                  aria-pressed={selected}
                  className={`h-8 px-2.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    selected
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  {method}
                </button>
              );
            })}
          </div>

          <select
            aria-label="Filter by product"
            value={filters.product}
            onChange={(e) => onChange({ ...filters, product: e.target.value })}
            className="h-8 max-w-[230px] px-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-md text-slate-800 dark:text-slate-200 focus-visible:outline-2 focus-visible:outline-blue-600 cursor-pointer"
          >
            <option value="all">All products ({availableProducts.length})</option>
            {availableProducts.map((prod) => (
              <option key={prod} value={prod}>
                {prod}
              </option>
            ))}
          </select>

          <SegmentedControl<BasketFilter>
            ariaLabel="Filter by basket size"
            value={filters.basketType}
            onChange={(basketType) => onChange({ ...filters, basketType })}
            options={[
              { value: 'all', label: 'All orders' },
              { value: 'single', label: 'Single-item' },
              { value: 'multi', label: 'Multi-item' },
            ]}
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap shrink-0">
          {filters.selectedDay && (
            <>
              <button
                type="button"
                onClick={() => onChange({ ...filters, selectedDay: null })}
                className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium hover:underline cursor-pointer"
              >
                Day: {formatDateFull(filters.selectedDay)}
                <X className="w-3 h-3" />
              </button>
              <span aria-hidden="true">·</span>
            </>
          )}
          <span>
            Showing <strong className="font-mono font-semibold text-slate-800 dark:text-slate-200">{filteredCount}</strong> of{' '}
            <span className="font-mono">{totalCount}</span> line items
          </span>
        </div>
      </div>
    </div>
  );
};
