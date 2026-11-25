import React, { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { OrderSummary, SaleRecord } from '../types/sales';
import { formatCurrency } from '../utils/salesData';
import { ChartPanel, SegmentedControl } from './ChartPanel';

interface LedgerViewProps {
  records: SaleRecord[];
  orders: OrderSummary[];
}

type LedgerMode = 'items' | 'orders';
type ItemSortKey = 'date' | 'orderNumber' | 'product' | 'paymentMethod' | 'price';
type OrderSortKey = 'date' | 'orderNumber' | 'itemCount' | 'totalValue';

export const LedgerView: React.FC<LedgerViewProps> = ({ records, orders }) => {
  const [mode, setMode] = useState<LedgerMode>('items');
  const [itemSort, setItemSort] = useState<{ key: ItemSortKey; dir: 'asc' | 'desc' }>({
    key: 'date',
    dir: 'desc',
  });
  const [orderSort, setOrderSort] = useState<{ key: OrderSortKey; dir: 'asc' | 'desc' }>({
    key: 'date',
    dir: 'desc',
  });

  const sortedItems = useMemo(() => {
    const copy = [...records];
    const mult = itemSort.dir === 'asc' ? 1 : -1;
    copy.sort((a, b) => {
      if (itemSort.key === 'price') return (a.price - b.price) * mult;
      return a[itemSort.key].localeCompare(b[itemSort.key]) * mult;
    });
    return copy;
  }, [records, itemSort]);

  const sortedOrders = useMemo(() => {
    const copy = [...orders];
    const mult = orderSort.dir === 'asc' ? 1 : -1;
    copy.sort((a, b) => {
      if (orderSort.key === 'totalValue') return (a.totalValue - b.totalValue) * mult;
      if (orderSort.key === 'itemCount') return (a.itemCount - b.itemCount) * mult;
      return a[orderSort.key].localeCompare(b[orderSort.key]) * mult;
    });
    return copy;
  }, [orders, orderSort]);

  const toggleItemSort = (key: ItemSortKey) => {
    setItemSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' }
    );
  };

  const toggleOrderSort = (key: OrderSortKey) => {
    setOrderSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' }
    );
  };

  const renderSortIcon = (active: boolean, dir: 'asc' | 'desc') => {
    if (!active) return <ArrowUpDown className="w-3 h-3 text-slate-400" />;
    return dir === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-blue-600 dark:text-blue-400" />
    ) : (
      <ArrowDown className="w-3 h-3 text-blue-600 dark:text-blue-400" />
    );
  };

  const totalRevenue = records.reduce((s, r) => s + r.price, 0);

  return (
    <ChartPanel
      title="Sales Transaction Ledger"
      subtitle="Sortable, high-density view of the active filtered dataset — toggle between individual line items and grouped orders"
      controls={
        <SegmentedControl<LedgerMode>
          ariaLabel="Ledger grouping mode"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'items', label: `Line Items (${records.length})` },
            { value: 'orders', label: `Grouped Orders (${orders.length})` },
          ]}
        />
      }
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2 tabular-nums">
          <span>
            {records.length} line items across {orders.length} unique orders
          </span>
          <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
            Filtered Total: {formatCurrency(totalRevenue)}
          </span>
        </div>
      }
    >
      <div className="overflow-x-auto max-h-[580px] overflow-y-auto">
        {mode === 'items' ? (
          <table className="w-full text-xs border-collapse">
            <thead className="sticky top-0 bg-white dark:bg-slate-900 z-10 border-b border-slate-200 dark:border-slate-800">
              <tr className="text-slate-500 dark:text-slate-400">
                <th className="py-2.5 pr-4 text-left font-medium">
                  <button
                    type="button"
                    onClick={() => toggleItemSort('orderNumber')}
                    className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
                  >
                    Order Number
                    {renderSortIcon(itemSort.key === 'orderNumber', itemSort.dir)}
                  </button>
                </th>
                <th className="py-2.5 px-3 text-left font-medium">
                  <button
                    type="button"
                    onClick={() => toggleItemSort('date')}
                    className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
                  >
                    Date
                    {renderSortIcon(itemSort.key === 'date', itemSort.dir)}
                  </button>
                </th>
                <th className="py-2.5 px-3 text-left font-medium">
                  <button
                    type="button"
                    onClick={() => toggleItemSort('product')}
                    className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
                  >
                    Product
                    {renderSortIcon(itemSort.key === 'product', itemSort.dir)}
                  </button>
                </th>
                <th className="py-2.5 px-3 text-left font-medium">
                  <button
                    type="button"
                    onClick={() => toggleItemSort('paymentMethod')}
                    className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
                  >
                    Payment Method
                    {renderSortIcon(itemSort.key === 'paymentMethod', itemSort.dir)}
                  </button>
                </th>
                <th className="py-2.5 pl-3 text-right font-medium">
                  <button
                    type="button"
                    onClick={() => toggleItemSort('price')}
                    className="inline-flex items-center justify-end gap-1 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer ml-auto"
                  >
                    Price
                    {renderSortIcon(itemSort.key === 'price', itemSort.dir)}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
              {sortedItems.map((row) => (
                <tr
                  key={row.id}
                  className="h-10 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="py-2 pr-4 font-mono tabular-nums font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                    {row.orderNumber}
                  </td>
                  <td className="py-2 px-3 font-mono tabular-nums text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {row.date} · {row.dayOfWeek}
                  </td>
                  <td className="py-2 px-3 text-slate-800 dark:text-slate-200">{row.product}</td>
                  <td className="py-2 px-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                    {row.paymentMethod}
                  </td>
                  <td className="py-2 pl-3 text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                    {formatCurrency(row.price)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-xs border-collapse">
            <thead className="sticky top-0 bg-white dark:bg-slate-900 z-10 border-b border-slate-200 dark:border-slate-800">
              <tr className="text-slate-500 dark:text-slate-400">
                <th className="py-2.5 pr-4 text-left font-medium">
                  <button
                    type="button"
                    onClick={() => toggleOrderSort('orderNumber')}
                    className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
                  >
                    Order Number
                    {renderSortIcon(orderSort.key === 'orderNumber', orderSort.dir)}
                  </button>
                </th>
                <th className="py-2.5 px-3 text-left font-medium">
                  <button
                    type="button"
                    onClick={() => toggleOrderSort('date')}
                    className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
                  >
                    Date
                    {renderSortIcon(orderSort.key === 'date', orderSort.dir)}
                  </button>
                </th>
                <th className="py-2.5 px-3 text-left font-medium">Products in Basket</th>
                <th className="py-2.5 px-3 text-left font-medium">Payment</th>
                <th className="py-2.5 px-3 text-right font-medium">
                  <button
                    type="button"
                    onClick={() => toggleOrderSort('itemCount')}
                    className="inline-flex items-center justify-end gap-1 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer ml-auto"
                  >
                    Items
                    {renderSortIcon(orderSort.key === 'itemCount', orderSort.dir)}
                  </button>
                </th>
                <th className="py-2.5 pl-3 text-right font-medium">
                  <button
                    type="button"
                    onClick={() => toggleOrderSort('totalValue')}
                    className="inline-flex items-center justify-end gap-1 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer ml-auto"
                  >
                    Order Total
                    {renderSortIcon(orderSort.key === 'totalValue', orderSort.dir)}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
              {sortedOrders.map((order) => (
                <tr
                  key={order.orderNumber}
                  className="h-10 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="py-2 pr-4 font-mono tabular-nums font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                    {order.orderNumber}
                  </td>
                  <td className="py-2 px-3 font-mono tabular-nums text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {order.date}
                  </td>
                  <td className="py-2 px-3 text-slate-800 dark:text-slate-200">
                    {order.items.map((it) => it.product).join(' · ')}
                  </td>
                  <td className="py-2 px-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                    {order.paymentMethods.join(' + ')}
                  </td>
                  <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300">
                    {order.itemCount}
                  </td>
                  <td className="py-2 pl-3 text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                    {formatCurrency(order.totalValue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </ChartPanel>
  );
};
