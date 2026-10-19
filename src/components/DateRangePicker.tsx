import React, { useState, useRef, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown, 
  Check, 
  Clock, 
  CalendarRange,
  RotateCcw
} from 'lucide-react';

export type DateFilterMode = 'month' | 'year';

export interface DateFilterValue {
  mode: DateFilterMode;
  year: number;
  month: number; // 1-12
}

export interface DateRangePickerProps {
  value: DateFilterValue;
  onChange: (newValue: DateFilterValue) => void;
  availableYears?: number[];
  className?: string;
}

const MONTH_NAMES = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4',
  'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8',
  'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
];

const MONTH_SHORT = [
  'T1', 'T2', 'T3', 'T4',
  'T5', 'T6', 'T7', 'T8',
  'T9', 'T10', 'T11', 'T12'
];

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  value,
  onChange,
  availableYears,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const now = new Date();
  const currentRealYear = now.getFullYear();
  const currentRealMonth = now.getMonth() + 1;

  // Internal year state for the month-grid browser
  const [browsingYear, setBrowsingYear] = useState<number>(value.year);

  // Sync browsing year when prop changes
  useEffect(() => {
    setBrowsingYear(value.year);
  }, [value.year]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Generate available years list
  const yearsList = React.useMemo(() => {
    if (availableYears && availableYears.length > 0) {
      return Array.from(new Set([...availableYears, currentRealYear])).sort((a, b) => b - a);
    }
    const years: number[] = [];
    for (let y = currentRealYear + 1; y >= currentRealYear - 5; y--) {
      years.push(y);
    }
    return years;
  }, [availableYears, currentRealYear]);

  // Quick navigation step buttons (previous / next)
  const handleStep = (direction: 'prev' | 'next') => {
    if (value.mode === 'year') {
      const newYear = direction === 'prev' ? value.year - 1 : value.year + 1;
      onChange({
        ...value,
        year: newYear,
      });
    } else {
      if (direction === 'prev') {
        if (value.month === 1) {
          onChange({
            mode: 'month',
            year: value.year - 1,
            month: 12,
          });
        } else {
          onChange({
            mode: 'month',
            year: value.year,
            month: value.month - 1,
          });
        }
      } else {
        if (value.month === 12) {
          onChange({
            mode: 'month',
            year: value.year + 1,
            month: 1,
          });
        } else {
          onChange({
            mode: 'month',
            year: value.year,
            month: value.month + 1,
          });
        }
      }
    }
  };

  // Format label for button
  const displayLabel = value.mode === 'year' 
    ? `Cả Năm ${value.year}` 
    : `Tháng ${value.month}/${value.year}`;

  return (
    <div ref={containerRef} className={`relative inline-flex items-center ${className}`}>
      {/* Control Container */}
      <div className="inline-flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1 shadow-2xs">
        {/* Step Previous Button */}
        <button
          type="button"
          onClick={() => handleStep('prev')}
          title={value.mode === 'year' ? `Năm ${value.year - 1}` : 'Tháng trước'}
          className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Main Trigger Popover Button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 px-3 py-1 text-xs font-bold font-display rounded-lg transition-all cursor-pointer ${
            isOpen 
              ? 'bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400' 
              : 'text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/60'
          }`}
        >
          <CalendarIcon className="w-3.5 h-3.5 text-emerald-500" />
          <span>{displayLabel}</span>
          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Step Next Button */}
        <button
          type="button"
          onClick={() => handleStep('next')}
          title={value.mode === 'year' ? `Năm ${value.year + 1}` : 'Tháng sau'}
          className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Jump Shortcuts */}
      <div className="hidden sm:flex items-center gap-1.5 ml-2">
        <button
          type="button"
          onClick={() => {
            onChange({ mode: 'month', year: currentRealYear, month: currentRealMonth });
          }}
          className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
            value.mode === 'month' && value.year === currentRealYear && value.month === currentRealMonth
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Tháng này
        </button>
        <button
          type="button"
          onClick={() => {
            onChange({ mode: 'year', year: currentRealYear, month: currentRealMonth });
          }}
          className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
            value.mode === 'year' && value.year === currentRealYear
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Năm {currentRealYear}
        </button>
      </div>

      {/* =========================================================================
          POPOVER PANEL
          ========================================================================= */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-2 z-50 w-80 sm:w-96 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-4 animate-in fade-in zoom-in-95 duration-150">
          {/* Header Mode Tabs */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl mb-3 text-xs">
            <button
              type="button"
              onClick={() => {
                onChange({ ...value, mode: 'month' });
              }}
              className={`flex-1 py-1.5 font-bold rounded-lg transition-all cursor-pointer text-center ${
                value.mode === 'month'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Lọc Theo Tháng
            </button>
            <button
              type="button"
              onClick={() => {
                onChange({ ...value, mode: 'year' });
              }}
              className={`flex-1 py-1.5 font-bold rounded-lg transition-all cursor-pointer text-center ${
                value.mode === 'year'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Lọc Theo Năm
            </button>
          </div>

          {/* TAB 1: MONTH SELECTION VIEW */}
          {value.mode === 'month' && (
            <div className="space-y-3">
              {/* Year Navigation Bar */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setBrowsingYear(y => y - 1)}
                  className="p-1 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="text-sm font-extrabold text-slate-800 dark:text-slate-100 font-display">
                  Năm {browsingYear}
                </div>
                <button
                  type="button"
                  onClick={() => setBrowsingYear(y => y + 1)}
                  className="p-1 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* 12 Months Grid */}
              <div className="grid grid-cols-3 gap-2">
                {MONTH_NAMES.map((name, index) => {
                  const mNum = index + 1;
                  const isSelected = value.mode === 'month' && value.year === browsingYear && value.month === mNum;
                  const isCurrentMonth = browsingYear === currentRealYear && mNum === currentRealMonth;

                  return (
                    <button
                      key={mNum}
                      type="button"
                      onClick={() => {
                        onChange({
                          mode: 'month',
                          year: browsingYear,
                          month: mNum,
                        });
                        setIsOpen(false);
                      }}
                      className={`relative py-2 px-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex flex-col items-center justify-center ${
                        isSelected
                          ? 'bg-emerald-600 text-white shadow-xs font-bold'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80'
                      }`}
                    >
                      <span>{name}</span>
                      {isCurrentMonth && !isSelected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-0.5" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Quarter Fast-Select row */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span className="font-medium">Quý:</span>
                <div className="flex items-center gap-1.5">
                  {[
                    { label: 'Q1 (T1-3)', m: 3 },
                    { label: 'Q2 (T4-6)', m: 6 },
                    { label: 'Q3 (T7-9)', m: 9 },
                    { label: 'Q4 (T10-12)', m: 12 },
                  ].map((q) => (
                    <button
                      key={q.label}
                      type="button"
                      onClick={() => {
                        onChange({
                          mode: 'month',
                          year: browsingYear,
                          month: q.m,
                        });
                        setIsOpen(false);
                      }}
                      className="px-2 py-0.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-all font-medium"
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: YEAR SELECTION VIEW */}
          {value.mode === 'year' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Chọn năm để xem toàn bộ 12 tháng dữ liệu tài chính và báo cáo tổng kết năm:
              </p>

              <div className="grid grid-cols-3 gap-2">
                {yearsList.map((y) => {
                  const isSelected = value.mode === 'year' && value.year === y;
                  const isThisYear = y === currentRealYear;

                  return (
                    <button
                      key={y}
                      type="button"
                      onClick={() => {
                        onChange({
                          mode: 'year',
                          year: y,
                          month: value.month,
                        });
                        setIsOpen(false);
                      }}
                      className={`py-3 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center ${
                        isSelected
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-slate-100 dark:border-slate-800'
                      }`}
                    >
                      <span className="text-sm font-display">{y}</span>
                      {isThisYear && (
                        <span className={`text-[10px] mt-0.5 ${isSelected ? 'text-emerald-100' : 'text-emerald-600 dark:text-emerald-400'}`}>
                          Năm nay
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Fast presets for Years */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => {
                    onChange({ mode: 'year', year: currentRealYear, month: currentRealMonth });
                    setIsOpen(false);
                  }}
                  className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
                >
                  Năm hiện tại ({currentRealYear})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onChange({ mode: 'year', year: currentRealYear - 1, month: 12 });
                    setIsOpen(false);
                  }}
                  className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                >
                  Năm trước ({currentRealYear - 1})
                </button>
              </div>
            </div>
          )}

          {/* Footer Close */}
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                onChange({
                  mode: 'month',
                  year: currentRealYear,
                  month: currentRealMonth,
                });
                setIsOpen(false);
              }}
              className="text-[11px] text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" /> Về hiện tại
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
