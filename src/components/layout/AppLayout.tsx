import React, { useState } from 'react';
import { Sidebar, NavTab } from './Sidebar';
import { Header } from './Header';
import { DashboardView } from '../../features/dashboard/DashboardView';
import { WorkView } from '../../features/work/WorkView';
import { ExpensesView } from '../../features/expenses/ExpensesView';
import { InvestmentsView } from '../../features/investments/InvestmentsView';
import { ReportsView } from '../../features/reports/ReportsView';
import { SettingsView } from '../../features/settings/SettingsView';
import { AuthModal } from '../../features/auth/AuthModal';
import { ToastContainer } from '../ui/Toast';
import { useData } from '../../context/DataContext';

export const AppLayout: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
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
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      {/* Supabase Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

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
        </main>
      </div>
    </div>
  );
};
