import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';
import {
  PieChart as PieIcon,
  Tag,
  TrendingDown,
  ShoppingBag,
  Plus,
  ArrowUpRight,
  Filter,
  Sparkles,
  Layers,
  ChevronRight
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { formatCurrency, formatPercent, isInvestmentTransaction } from '../lib/utils';
import { Transaction, ExpenseCategory } from '../types';
import { DEFAULT_EXPENSE_CATEGORIES } from '../lib/seedData';

export interface CategorySpendingPieChartProps {
  className?: string;
  transactions?: Transaction[];
  categories?: ExpenseCategory[];
  title?: string;
  subtitle?: string;
  selectedPeriodLabel?: string;
  onQuickAddExpense?: () => void;
  onSelectCategory?: (categoryName: string) => void;
}

// Fallback curated palette if category has no custom color
const FALLBACK_PALETTE = [
  '#EF4444', // Red
  '#F97316', // Orange
  '#F59E0B', // Amber
  '#10B981', // Emerald
  '#06B6D4', // Cyan
  '#6366F1', // Indigo
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#14B8A6', // Teal
  '#3B82F6', // Blue
  '#84CC16', // Lime
  '#64748B', // Slate
];

// Safe context hook fallback
const useSafeDataContext = () => {
  try {
    return useData();
  } catch {
    return null;
  }
};

export const CategorySpendingPieChart: React.FC<CategorySpendingPieChartProps> = ({
  className = '',
  transactions: propTransactions,
  categories: propCategories,
  title = 'Phân Bổ Chi Tiêu Theo Danh Mục',
  subtitle = 'Tỷ trọng chi tiêu theo từng nhóm danh mục trong khoảng thời gian đã chọn',
  selectedPeriodLabel,
  onQuickAddExpense,
  onSelectCategory,
}) => {
  const contextData = useSafeDataContext();
  const transactions = propTransactions || contextData?.transactions || [];
  const categories = propCategories || contextData?.categories || DEFAULT_EXPENSE_CATEGORIES;
  const currency = contextData?.userSettings?.currency || 'VND';

  // Category view filter: All expenses vs Living expenses vs Investments
  const [filterType, setFilterType] = useState<'all' | 'living' | 'investment'>('all');
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // Build category color map
  const categoryColorMap = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((c) => {
      if (c.name && c.color) {
        map.set(c.name.toLowerCase().trim(), c.color);
      }
    });
    DEFAULT_EXPENSE_CATEGORIES.forEach((c) => {
      const key = c.name.toLowerCase().trim();
      if (!map.has(key) && c.color) {
        map.set(key, c.color);
      }
    });
    return map;
  }, [categories]);

  // Aggregate spending by category
  const { chartData, totalSpending, totalTxCount } = useMemo(() => {
    const categoryTotals: Record<string, { amount: number; count: number; name: string }> = {};

    transactions.forEach((t) => {
      const isInv = isInvestmentTransaction(t);
      const isExpense = t.transaction_type === 'expense';
      const isInvType = t.transaction_type === 'investment' || isInv;

      let include = false;
      if (filterType === 'all') {
        include = isExpense || isInvType;
      } else if (filterType === 'living') {
        include = isExpense && !isInv;
      } else if (filterType === 'investment') {
        include = isInvType;
      }

      if (include) {
        const catName = t.category_name?.trim() || 'Khác';
        const amt = Number(t.amount) || 0;
        if (amt > 0) {
          if (!categoryTotals[catName]) {
            categoryTotals[catName] = { amount: 0, count: 0, name: catName };
          }
          categoryTotals[catName].amount += amt;
          categoryTotals[catName].count += 1;
        }
      }
    });

    const entries = Object.values(categoryTotals);
    const sum = entries.reduce((acc, curr) => acc + curr.amount, 0);
    const txCount = entries.reduce((acc, curr) => acc + curr.count, 0);

    // Sort descending by amount
    entries.sort((a, b) => b.amount - a.amount);

    const dataWithColors = entries.map((item, index) => {
      const color =
        categoryColorMap.get(item.name.toLowerCase().trim()) ||
        FALLBACK_PALETTE[index % FALLBACK_PALETTE.length];
      const percentage = sum > 0 ? (item.amount / sum) * 100 : 0;

      return {
        ...item,
        value: item.amount,
        percentage,
        color,
      };
    });

    return {
      chartData: dataWithColors,
      totalSpending: sum,
      totalTxCount: txCount,
    };
  }, [transactions, filterType, categoryColorMap]);

  // Active slice for hover state
  const activeDataPoint = activeIndex !== null && chartData[activeIndex] ? chartData[activeIndex] : null;

  // Custom Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || payload.length === 0) return null;
    const item = payload[0]?.payload;
    if (!item) return null;

    return (
      <div className="bg-slate-900/95 dark:bg-slate-950/95 border border-slate-700/60 shadow-xl rounded-xl p-3 text-xs text-white backdrop-blur-md min-w-[190px]">
        <div className="flex items-center gap-2 pb-2 mb-2 border-b border-slate-800">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
          <span className="font-bold text-slate-100 truncate">{item.name}</span>
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Số tiền:</span>
            <span className="font-mono font-bold text-slate-100">
              {formatCurrency(item.value, currency)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Tỷ trọng:</span>
            <span className="font-mono font-bold text-emerald-400">
              {item.percentage.toFixed(1)}%
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Số giao dịch:</span>
            <span className="font-mono">{item.count}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs ${className}`}>
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
            <PieIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-white font-display">
                {title}
              </h3>
              {selectedPeriodLabel && (
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  · {selectedPeriodLabel}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {subtitle}
            </p>
          </div>
        </div>

        {/* Category Type Filter Buttons */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-xs">
          <button
            type="button"
            onClick={() => {
              setFilterType('all');
              setActiveIndex(null);
            }}
            className={`px-2.5 py-1 font-semibold rounded-lg transition-all cursor-pointer ${
              filterType === 'all'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Tất Cả
          </button>
          <button
            type="button"
            onClick={() => {
              setFilterType('living');
              setActiveIndex(null);
            }}
            className={`px-2.5 py-1 font-semibold rounded-lg transition-all cursor-pointer ${
              filterType === 'living'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Sinh Hoạt
          </button>
          <button
            type="button"
            onClick={() => {
              setFilterType('investment');
              setActiveIndex(null);
            }}
            className={`px-2.5 py-1 font-semibold rounded-lg transition-all cursor-pointer ${
              filterType === 'investment'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Tích Lũy
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {chartData.length === 0 ? (
        <div className="py-12 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-3">
            <PieIcon className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
            Chưa có chi tiêu nào trong danh mục này
          </p>
          <p className="text-xs text-slate-400 max-w-sm mt-1">
            Các khoản chi tiêu được ghi nhận sẽ tự động phân loại và trực quan hóa tỷ trọng tại đây.
          </p>
          {onQuickAddExpense && (
            <button
              type="button"
              onClick={onQuickAddExpense}
              className="mt-4 px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Thêm khoản chi tiêu
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center pt-4">
          {/* Donut Chart Visualization (5 cols on lg) */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center relative">
            <div className="relative w-64 h-64 sm:w-72 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip content={<CustomTooltip />} />
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius="60%"
                    outerRadius="85%"
                    paddingAngle={3}
                    cornerRadius={4}
                    onMouseEnter={(_, index) => setActiveIndex(index)}
                    onMouseLeave={() => setActiveIndex(null)}
                    onClick={(entry) => {
                      if (onSelectCategory && entry?.name) {
                        onSelectCategory(entry.name);
                      }
                    }}
                    cursor="pointer"
                  >
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${entry.name}-${index}`}
                        fill={entry.color}
                        stroke="none"
                        opacity={activeIndex === null || activeIndex === index ? 1 : 0.4}
                        className="transition-opacity duration-200"
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              {/* Donut Hole Center Summary */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
                {activeDataPoint ? (
                  <>
                    <span className="text-[11px] font-semibold text-slate-400 truncate max-w-[150px]">
                      {activeDataPoint.name}
                    </span>
                    <span className="text-lg sm:text-xl font-extrabold font-mono text-slate-900 dark:text-white mt-0.5">
                      {formatCurrency(activeDataPoint.value, currency, true)}
                    </span>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                      {activeDataPoint.percentage.toFixed(1)}%
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-[11px] font-semibold text-slate-400">
                      Tổng chi tiêu
                    </span>
                    <span className="text-lg sm:text-xl font-extrabold font-mono text-slate-900 dark:text-white mt-0.5">
                      {formatCurrency(totalSpending, currency, true)}
                    </span>
                    <span className="text-[11px] text-slate-400 mt-0.5">
                      {totalTxCount} giao dịch
                    </span>
                  </>
                )}
              </div>
            </div>
            <p className="text-[11px] text-slate-400 text-center mt-1">
              Di chuột vào từng phần bánh để xem chi tiết
            </p>
          </div>

          {/* Category Breakdown & Progress Ranking (7 cols on lg) */}
          <div className="lg:col-span-7 space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
            <div className="flex items-center justify-between text-xs text-slate-500 pb-1 border-b border-slate-100 dark:border-slate-800">
              <span className="font-semibold">Danh mục ({chartData.length})</span>
              <span className="font-semibold">Chi tiêu / Tỷ lệ</span>
            </div>

            {chartData.map((item, index) => {
              const isHovered = activeIndex === index;

              return (
                <div
                  key={item.name}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                  onClick={() => {
                    if (onSelectCategory) onSelectCategory(item.name);
                  }}
                  className={`p-2 rounded-xl transition-all cursor-pointer ${
                    isHovered
                      ? 'bg-slate-100/80 dark:bg-slate-800/80 shadow-2xs'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                        {item.name}
                      </span>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        ({item.count} gd)
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-right shrink-0">
                      <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                        {formatCurrency(item.amount, currency, true)}
                      </span>
                      <span className="font-mono text-xs font-semibold text-slate-500 w-11 text-right">
                        {item.percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* Horizontal Progress bar */}
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${item.percentage}%`,
                        backgroundColor: item.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer Insight Note */}
      {chartData.length > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-purple-500" />
            <span>
              Nhóm chi tiêu lớn nhất: <strong>{chartData[0].name}</strong> ({formatCurrency(chartData[0].amount, currency, true)} - {chartData[0].percentage.toFixed(1)}% tổng chi).
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            {chartData.length > 3
              ? `Top 3 danh mục chiếm ${chartData.slice(0, 3).reduce((acc, c) => acc + c.percentage, 0).toFixed(0)}% chi tiêu`
              : ''}
          </span>
        </div>
      )}
    </div>
  );
};
