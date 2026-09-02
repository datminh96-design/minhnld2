import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { Transaction, TransactionType, DateFilterPreset, ExpenseCategory } from '../../types';
import { formatCurrency, formatDateVN, getDayOfWeek } from '../../lib/utils';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';
import { 
  Wallet, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Plus, 
  Search, 
  Filter, 
  Edit3, 
  Trash2, 
  PieChart as PieIcon, 
  BarChart3, 
  TrendingDown, 
  TrendingUp, 
  Layers, 
  Calendar,
  DollarSign
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  AreaChart,
  Area,
} from 'recharts';

const PIE_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#10B981', '#06B6D4', 
  '#6366F1', '#8B5CF6', '#EC4899', '#14B8A6', '#84CC16', '#64748B'
];

export const ExpensesView: React.FC = () => {
  const { 
    transactions, 
    categories, 
    userSettings, 
    saveTransaction, 
    deleteTransaction,
    saveCategory,
    deleteCategory,
    addToast 
  } = useData();

  // Filter States
  const [filterPreset, setFilterPreset] = useState<DateFilterPreset>('month');
  const [customStartDate, setCustomStartDate] = useState<string>('2026-09-01');
  const [customEndDate, setCustomEndDate] = useState<string>('2026-09-30');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [viewTab, setViewTab] = useState<'list' | 'analytics' | 'categories'>('list');

  // Transaction Modal State
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  // Tx Form States
  const [formType, setFormType] = useState<TransactionType>('expense');
  const [formDate, setFormDate] = useState<string>('2026-09-01');
  const [formCategoryId, setFormCategoryId] = useState<string>('');
  const [formCategoryName, setFormCategoryName] = useState<string>('Ăn uống');
  const [formAmount, setFormAmount] = useState<string>('');
  const [formNote, setFormNote] = useState<string>('');

  // Category Modal State
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<TransactionType>('expense');
  const [newCatColor, setNewCatColor] = useState('#10B981');

  // Date Filtering logic
  const filteredTransactions = useMemo(() => {
    // Current simulated date reference: 2026-09-01
    const refDate = new Date('2026-09-30');

    return transactions.filter((tx) => {
      const txDate = new Date(tx.transaction_date);

      // 1. Date Preset Filter
      let passDate = true;
      if (filterPreset === 'today') {
        passDate = tx.transaction_date === '2026-09-20'; // simulate active today
      } else if (filterPreset === 'week') {
        passDate = tx.transaction_date >= '2026-09-14' && tx.transaction_date <= '2026-09-20';
      } else if (filterPreset === 'month') {
        passDate = tx.transaction_date.startsWith('2026-09');
      } else if (filterPreset === '3months') {
        passDate = tx.transaction_date >= '2026-07-01' && tx.transaction_date <= '2026-09-30';
      } else if (filterPreset === '6months') {
        passDate = tx.transaction_date >= '2026-04-01' && tx.transaction_date <= '2026-09-30';
      } else if (filterPreset === '1year') {
        passDate = tx.transaction_date >= '2026-01-01' && tx.transaction_date <= '2026-12-31';
      } else if (filterPreset === 'custom') {
        passDate = tx.transaction_date >= customStartDate && tx.transaction_date <= customEndDate;
      }

      if (!passDate) return false;

      // 2. Type Filter
      if (typeFilter !== 'all' && tx.transaction_type !== typeFilter) return false;

      // 3. Category Filter
      if (selectedCategoryFilter !== 'all' && tx.category_name !== selectedCategoryFilter) return false;

      // 4. Search Filter
      if (searchTerm) {
        const matchNote = tx.note && tx.note.toLowerCase().includes(searchTerm.toLowerCase());
        const matchCat = tx.category_name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchDate = tx.transaction_date.includes(searchTerm);
        if (!matchNote && !matchCat && !matchDate) return false;
      }

      return true;
    }).sort((a, b) => b.transaction_date.localeCompare(a.transaction_date));
  }, [transactions, filterPreset, customStartDate, customEndDate, typeFilter, selectedCategoryFilter, searchTerm]);

  // Summary Metrics
  const summary = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;

    filteredTransactions.forEach((tx) => {
      if (tx.transaction_type === 'income') {
        totalIncome += tx.amount;
      } else {
        totalExpense += tx.amount;
      }
    });

    const balance = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? (balance / totalIncome) * 100 : 0;

    return {
      totalIncome,
      totalExpense,
      balance,
      savingsRate,
      count: filteredTransactions.length,
    };
  }, [filteredTransactions]);

  // Chart 1: Expense by Category (Pie Data)
  const categoryPieData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredTransactions
      .filter((t) => t.transaction_type === 'expense')
      .forEach((t) => {
        map[t.category_name] = (map[t.category_name] || 0) + t.amount;
      });

    return Object.entries(map).map(([name, value]) => ({
      name,
      value,
    })).sort((a, b) => b.value - a.value);
  }, [filteredTransactions]);

  // Chart 2: Income vs Expense Monthly / Timeline Data
  const monthlyComparisonData = useMemo(() => {
    const monthlyMap: Record<string, { income: number; expense: number }> = {
      '05/26': { income: 55000000, expense: 22000000 },
      '06/26': { income: 62000000, expense: 26500000 },
      '07/26': { income: 58000000, expense: 24000000 },
      '08/26': { income: 68000000, expense: 29000000 },
      '09/26': { income: summary.totalIncome, expense: summary.totalExpense },
    };

    return Object.entries(monthlyMap).map(([month, data]) => ({
      month,
      ThuNhap: data.income,
      ChiTieu: data.expense,
      SoDu: data.income - data.expense,
    }));
  }, [summary]);

  // Chart 3: Expense Trend Timeline
  const expenseTrendData = useMemo(() => {
    const dailyMap: Record<string, number> = {};
    filteredTransactions
      .filter((t) => t.transaction_type === 'expense')
      .forEach((t) => {
        const day = t.transaction_date.substring(5); // 'MM-DD'
        dailyMap[day] = (dailyMap[day] || 0) + t.amount;
      });

    return Object.entries(dailyMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([day, amount]) => ({
        day,
        amount,
      }));
  }, [filteredTransactions]);

  // Open Create Tx Modal
  const handleOpenAddTxModal = (type: TransactionType = 'expense') => {
    setEditingTx(null);
    setFormType(type);
    setFormDate(new Date().toISOString().substring(0, 10));
    const availCats = categories.filter((c) => c.type === type);
    const defaultCat = availCats[0]?.name || (type === 'income' ? 'Lương' : 'Ăn uống');
    setFormCategoryName(defaultCat);
    setFormAmount('');
    setFormNote('');
    setIsTxModalOpen(true);
  };

  // Open Edit Tx Modal
  const handleOpenEditTxModal = (tx: Transaction) => {
    setEditingTx(tx);
    setFormType(tx.transaction_type);
    setFormDate(tx.transaction_date);
    setFormCategoryName(tx.category_name);
    setFormAmount(tx.amount.toString());
    setFormNote(tx.note || '');
    setIsTxModalOpen(true);
  };

  // Save Tx Form
  const handleSaveTxForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(formAmount.replace(/,/g, ''));
    if (isNaN(numAmount) || numAmount <= 0) {
      addToast('Vui lòng nhập số tiền hợp lệ lớn hơn 0', 'warning');
      return;
    }

    const matchedCat = categories.find((c) => c.name === formCategoryName && c.type === formType);

    await saveTransaction({
      id: editingTx ? editingTx.id : undefined,
      transaction_date: formDate,
      transaction_type: formType,
      category_id: matchedCat?.id,
      category_name: formCategoryName,
      amount: numAmount,
      note: formNote,
    });

    setIsTxModalOpen(false);
  };

  // Save New Category
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    await saveCategory({
      name: newCatName.trim(),
      type: newCatType,
      color: newCatColor,
    });

    setNewCatName('');
    setIsCatModalOpen(false);
  };

  const availableCategoriesForForm = categories.filter((c) => c.type === formType);

  return (
    <div className="space-y-6 pb-12">
      {/* 3 Main Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Income */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Tổng Thu Nhập</p>
            <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 font-display">
              {formatCurrency(summary.totalIncome, userSettings.currency)}
            </h3>
            <span className="text-[11px] text-slate-400 mt-0.5 inline-block">
              {filteredTransactions.filter(t => t.transaction_type === 'income').length} khoản thu
            </span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
            <ArrowDownLeft className="w-6 h-6" />
          </div>
        </div>

        {/* Total Expense */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Tổng Chi Tiêu</p>
            <h3 className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1 font-display">
              {formatCurrency(summary.totalExpense, userSettings.currency)}
            </h3>
            <span className="text-[11px] text-slate-400 mt-0.5 inline-block">
              {filteredTransactions.filter(t => t.transaction_type === 'expense').length} khoản chi
            </span>
          </div>
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
            <ArrowUpRight className="w-6 h-6" />
          </div>
        </div>

        {/* Balance */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Số Dư Tích Lũy</p>
            <h3 className={`text-2xl font-bold mt-1 font-display ${summary.balance >= 0 ? 'text-slate-900 dark:text-white' : 'text-rose-600'}`}>
              {formatCurrency(summary.balance, userSettings.currency)}
            </h3>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5 inline-block">
              Tỷ lệ tiết kiệm: {summary.savingsRate.toFixed(1)}%
            </span>
          </div>
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
            <Wallet className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter and View Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        {/* Preset Range Selector & Tabs */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Date Presets */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            {[
              { id: 'today', label: 'Hôm nay' },
              { id: 'week', label: 'Tuần này' },
              { id: 'month', label: 'Tháng này' },
              { id: '3months', label: '3 tháng' },
              { id: '6months', label: '6 tháng' },
              { id: '1year', label: '1 năm' },
              { id: 'custom', label: 'Tùy chỉnh' },
            ].map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => setFilterPreset(preset.id as DateFilterPreset)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  filterPreset === preset.id
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* View Tab Switcher & Add Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setViewTab('list')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  viewTab === 'list'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Danh Sách
              </button>
              <button
                type="button"
                onClick={() => setViewTab('analytics')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  viewTab === 'analytics'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Biểu Đồ Phân Tích
              </button>
              <button
                type="button"
                onClick={() => setViewTab('categories')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  viewTab === 'categories'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Danh Mục
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleOpenAddTxModal('income')}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs shadow-xs transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> + Thu Nhập
            </button>
            <button
              type="button"
              onClick={() => handleOpenAddTxModal('expense')}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-semibold text-xs shadow-xs transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> + Chi Tiêu
            </button>
          </div>
        </div>

        {/* Custom Date Range Picker if selected */}
        {filterPreset === 'custom' && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Từ ngày:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs"
            />
            <span className="font-semibold text-slate-700 dark:text-slate-300">Đến ngày:</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs"
            />
          </div>
        )}

        {/* Secondary filters: Type, Category, Search */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm kiếm giao dịch, ghi chú..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none"
            >
              <option value="all">Tất cả loại giao dịch</option>
              <option value="income">🟢 Thu nhập</option>
              <option value="expense">🔴 Chi tiêu</option>
            </select>
          </div>

          <div>
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none"
            >
              <option value="all">Tất cả danh mục</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.type === 'income' ? '🟢' : '🔴'} {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {viewTab === 'list' && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            {filteredTransactions.length === 0 ? (
              <EmptyState
                icon={Wallet}
                title="Chưa có giao dịch"
                description="Không tìm thấy giao dịch nào phù hợp với bộ lọc hiện tại."
                action={
                  <button
                    type="button"
                    onClick={() => handleOpenAddTxModal('expense')}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs shadow-xs"
                  >
                    + Thêm Giao Dịch Đầu Tiên
                  </button>
                }
              />
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                    <th className="py-3 px-4">Ngày</th>
                    <th className="py-3 px-3">Loại</th>
                    <th className="py-3 px-4">Danh mục</th>
                    <th className="py-3 px-4">Ghi chú</th>
                    <th className="py-3 px-4 text-right">Số tiền</th>
                    <th className="py-3 px-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredTransactions.map((tx) => {
                    const isIncome = tx.transaction_type === 'income';
                    return (
                      <tr
                        key={tx.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                          {formatDateVN(tx.transaction_date)}
                          <span className="text-[10px] text-slate-400 font-normal ml-1.5">
                            ({getDayOfWeek(tx.transaction_date)})
                          </span>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                              isIncome
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                                : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                            }`}
                          >
                            {isIncome ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                            {isIncome ? 'Thu nhập' : 'Chi tiêu'}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">
                          {tx.category_name}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400 max-w-sm truncate">
                          {tx.note || '--'}
                        </td>
                        <td
                          className={`py-3 px-4 text-right font-bold font-display text-sm whitespace-nowrap ${
                            isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {isIncome ? '+' : '-'}{formatCurrency(tx.amount, userSettings.currency)}
                        </td>
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditTxModal(tx)}
                              className="p-1 rounded-lg text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              title="Chỉnh sửa"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteTransaction(tx.id)}
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                              title="Xóa"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {viewTab === 'analytics' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Chart 1: Pie Chart Expenses by Category */}
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white font-display mb-1">
              Phân Bổ Chi Tiêu Theo Danh Mục
            </h3>
            <p className="text-xs text-slate-400 mb-4">Tỷ trọng các khoản chi trong khoảng thời gian đã chọn</p>

            {categoryPieData.length === 0 ? (
              <p className="text-xs text-slate-400 py-12 text-center">Chưa có dữ liệu chi tiêu</p>
            ) : (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryPieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      innerRadius={45}
                      paddingAngle={3}
                    >
                      {categoryPieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val: number) => formatCurrency(val, userSettings.currency)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Chart 2: Monthly Comparison Bar Chart */}
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white font-display mb-1">
              Thu Nhập vs Chi Tiêu Các Tháng
            </h3>
            <p className="text-xs text-slate-400 mb-4">So sánh dòng tiền thu - chi và mức thặng dư</p>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyComparisonData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.15)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(val) => formatCurrency(val, userSettings.currency, true)} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={70} />
                  <Tooltip formatter={(val: number) => formatCurrency(val, userSettings.currency)} />
                  <Legend />
                  <Bar dataKey="ThuNhap" fill="#10B981" radius={[4, 4, 0, 0]} name="Thu nhập" />
                  <Bar dataKey="ChiTieu" fill="#EF4444" radius={[4, 4, 0, 0]} name="Chi tiêu" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 3: Expense Trend Line */}
          <div className="lg:col-span-2 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white font-display mb-1">
              Xu Hướng Chi Tiêu Theo Thời Gian
            </h3>
            <p className="text-xs text-slate-400 mb-4">Diễn biến các ngày có phát sinh chi tiêu trong kỳ</p>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={expenseTrendData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="expTrend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.15)" />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(val) => formatCurrency(val, userSettings.currency, true)} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={70} />
                  <Tooltip formatter={(val: number) => formatCurrency(val, userSettings.currency)} />
                  <Area type="monotone" dataKey="amount" stroke="#EF4444" strokeWidth={2.5} fillOpacity={1} fill="url(#expTrend)" name="Chi tiêu" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {viewTab === 'categories' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white font-display">
                Danh Sách Danh Mục Thu & Chi
              </h3>
              <p className="text-xs text-slate-400">Tùy biến các danh mục phù hợp với thói quen tài chính của bạn</p>
            </div>
            <button
              type="button"
              onClick={() => setIsCatModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs"
            >
              <Plus className="w-4 h-4" /> + Tạo Danh Mục Mới
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Income categories */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <ArrowDownLeft className="w-4 h-4" /> Danh Mục Thu Nhập ({categories.filter(c => c.type === 'income').length})
              </h4>
              <div className="grid grid-cols-2 gap-2.5">
                {categories.filter(c => c.type === 'income').map((cat) => (
                  <div
                    key={cat.id}
                    className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between text-xs"
                  >
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{cat.name}</span>
                    {!cat.is_default && (
                      <button
                        type="button"
                        onClick={() => deleteCategory(cat.id)}
                        className="text-slate-400 hover:text-rose-500 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Expense categories */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                <ArrowUpRight className="w-4 h-4" /> Danh Mục Chi Tiêu ({categories.filter(c => c.type === 'expense').length})
              </h4>
              <div className="grid grid-cols-2 gap-2.5">
                {categories.filter(c => c.type === 'expense').map((cat) => (
                  <div
                    key={cat.id}
                    className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between text-xs"
                  >
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{cat.name}</span>
                    {!cat.is_default && (
                      <button
                        type="button"
                        onClick={() => deleteCategory(cat.id)}
                        className="text-slate-400 hover:text-rose-500 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Add / Edit Transaction */}
      <Modal
        isOpen={isTxModalOpen}
        onClose={() => setIsTxModalOpen(false)}
        title={editingTx ? 'Chỉnh Sửa Giao Dịch' : formType === 'income' ? 'Thêm Khoản Thu Nhập' : 'Thêm Khoản Chi Tiêu'}
        subtitle="Quản lý dòng tiền tài chính cá nhân"
        maxWidth="md"
      >
        <form onSubmit={handleSaveTxForm} className="space-y-4">
          {/* Type Toggle */}
          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => {
                setFormType('income');
                const incCats = categories.filter(c => c.type === 'income');
                setFormCategoryName(incCats[0]?.name || 'Lương');
              }}
              className={`py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                formType === 'income'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5" /> Thu Nhập
            </button>
            <button
              type="button"
              onClick={() => {
                setFormType('expense');
                const expCats = categories.filter(c => c.type === 'expense');
                setFormCategoryName(expCats[0]?.name || 'Ăn uống');
              }}
              className={`py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                formType === 'expense'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" /> Chi Tiêu
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Ngày giao dịch
              </label>
              <input
                type="date"
                required
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Danh mục
              </label>
              <select
                value={formCategoryName}
                onChange={(e) => setFormCategoryName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {availableCategoriesForForm.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Số tiền ({userSettings.currency})
            </label>
            <input
              type="number"
              required
              min="0"
              step="any"
              placeholder="VD: 500000"
              value={formAmount}
              onChange={(e) => setFormAmount(e.target.value)}
              className="w-full px-3 py-2 text-sm font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {formAmount && !isNaN(Number(formAmount)) && (
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-semibold">
                Hiển thị: {formatCurrency(Number(formAmount), userSettings.currency)}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Ghi chú
            </label>
            <textarea
              rows={2}
              value={formNote}
              onChange={(e) => setFormNote(e.target.value)}
              placeholder="Chi tiết giao dịch..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsTxModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium"
            >
              Hủy
            </button>
            <button
              type="submit"
              className={`px-4 py-2 rounded-xl text-white text-xs font-semibold shadow-xs ${
                formType === 'income' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              Lưu Giao Dịch
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Add Category */}
      <Modal
        isOpen={isCatModalOpen}
        onClose={() => setIsCatModalOpen(false)}
        title="Tạo Danh Mục Mới"
        subtitle="Phân loại thu nhập hoặc chi tiêu"
        maxWidth="sm"
      >
        <form onSubmit={handleSaveCategory} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Loại danh mục
            </label>
            <select
              value={newCatType}
              onChange={(e) => setNewCatType(e.target.value as TransactionType)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="expense">Chi tiêu</option>
              <option value="income">Thu nhập</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Tên danh mục
            </label>
            <input
              type="text"
              required
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="VD: Trả góp, Thú cưng, Bảo hiểm..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsCatModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
            >
              Tạo Danh Mục
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
