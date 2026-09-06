import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Sidebar, NavTab } from './Sidebar';
import { Header } from './Header';
import { ToastContainer } from '../ui/Toast';
import { useData } from '../../context/DataContext';

const DashboardView = lazy(() => import('../../features/dashboard/DashboardView').then(m => ({ default: m.DashboardView })));
const WorkView = lazy(() => import('../../features/work/WorkView').then(m => ({ default: m.WorkView })));
const ExpensesView = lazy(() => import('../../features/expenses/ExpensesView').then(m => ({ default: m.ExpensesView })));
const InvestmentsView = lazy(() => import('../../features/investments/InvestmentsView').then(m => ({ default: m.InvestmentsView })));
const ReportsView = lazy(() => import('../../features/reports/ReportsView').then(m => ({ default: m.ReportsView })));
const SettingsView = lazy(() => import('../../features/settings/SettingsView').then(m => ({ default: m.SettingsView })));
const AuthModal = lazy(() => import('../../features/auth/AuthModal').then(m => ({ default: m.AuthModal })));

export const AppLayout: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTab>(() => {
    if (typeof window !== 'undefined') {
      const savedTab = localStorage.getItem('activeTab');
      if (savedTab && ['dashboard', 'work', 'expenses', 'investments', 'reports', 'settings'].includes(savedTab)) {
        return savedTab as NavTab;
      }
    }
    return 'dashboard';
  });

  useEffect(() => {
    localStorage.setItem('activeTab', activeTab);
  }, [activeTab]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isOpenMobile, setIsOpenMobile] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const { toasts, removeToast } = useData();

  // Quick Action routing
  const handleQuickAction = (action: 'add-work' | 'add-transaction' | 'add-investment') => {
    switch (action) {
      case 'add-work':
        setActiveTab('work');
        break;
      case 'add-transaction':
        setActiveTab('expenses');
        break;
      case 'add-investment':
        setActiveTab('investments');
        break;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* Toast Notification Layer */}

      {/* Supabase Auth Modal */}
      {isAuthModalOpen && (
        <Suspense fallback={null}>
          <AuthModal
            isOpen={isAuthModalOpen}
            onClose={() => setIsAuthModalOpen(false)}
          />
        </Suspense>
      )}

      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        isOpenMobile={isOpenMobile}
        setIsOpenMobile={setIsOpenMobile}
        openAuthModal={() => setIsAuthModalOpen(true)}
      />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ${
          isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-72'
        }`}
      >
        {/* Top Header */}
        <Header
          activeTab={activeTab}
          setIsOpenMobile={setIsOpenMobile}
          openAuthModal={() => setIsAuthModalOpen(true)}
          onQuickAction={handleQuickAction}
        />

        {/* Page Views */}
        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto animate-in fade-in duration-200">
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-24 min-h-[300px]">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs font-medium text-slate-400">Đang tải giao diện...</span>
                </div>
              </div>
            }
          >
            {activeTab === 'dashboard' && (
              <DashboardView
                onNavigateTab={(tab) => setActiveTab(tab)}
                onQuickAction={handleQuickAction}
              />
            )}

            {activeTab === 'work' && <WorkView />}

            {activeTab === 'expenses' && <ExpensesView />}

            {activeTab === 'investments' && <InvestmentsView />}

            {activeTab === 'reports' && <ReportsView />}

            {activeTab === 'settings' && <SettingsView />}
          </Suspense>
        </main>
      </div>

      <ToastContainer />
    </div>
  );
};
