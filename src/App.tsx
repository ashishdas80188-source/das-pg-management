import React, { useMemo, useState } from 'react';
import { AuthGate } from './components/auth/AuthGate';
import { BillingView } from './components/billing/BillingView';
import { DashboardView } from './components/dashboard/DashboardView';
import { ExpensesView } from './components/expenses/ExpensesView';
import { AppShell } from './components/layout/AppShell';
import { PaymentsView } from './components/payments/PaymentsView';
import { RemindersView } from './components/reminders/RemindersView';
import { ReportsView } from './components/reports/ReportsView';
import { RoomsView } from './components/rooms/RoomsView';
import { SettingsView } from './components/settings/SettingsView';
import { TenantsView } from './components/tenants/TenantsView';
import { ToastContainer } from './components/ui/Toast';
import { PGProvider, usePG } from './context/PGContext';
import type { AppSection } from './types';

const AppRouter: React.FC = () => {
  const { isLoading, authStatus, bills } = usePG();
  const [activeSection, setActiveSection] = useState<AppSection>('dashboard');

  const reminderCount = useMemo(
    () => bills.filter((b) => b.remainingDue > 0).length,
    [bills]
  );

  if (isLoading || authStatus === 'loading') {
    return (
      <div className="min-h-screen bg-[#0B192C] flex items-center justify-center text-white">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-300">Loading Das PG Management...</p>
        </div>
      </div>
    );
  }

  if (authStatus !== 'authenticated') {
    return <AuthGate />;
  }

  return (
    <AppShell
      activeSection={activeSection}
      onSelectSection={setActiveSection}
      reminderCount={reminderCount}
    >
      {activeSection === 'dashboard' && <DashboardView onNavigate={setActiveSection} />}
      {activeSection === 'rooms' && <RoomsView />}
      {activeSection === 'tenants' && <TenantsView />}
      {activeSection === 'billing' && <BillingView />}
      {activeSection === 'payments' && <PaymentsView />}
      {activeSection === 'expenses' && <ExpensesView />}
      {activeSection === 'reports' && <ReportsView />}
      {activeSection === 'reminders' && <RemindersView onNavigate={setActiveSection} />}
      {activeSection === 'settings' && <SettingsView />}
    </AppShell>
  );
};

export function App() {
  return (
    <PGProvider>
      <AppRouter />
      <ToastContainer />
    </PGProvider>
  );
}

export default App;
