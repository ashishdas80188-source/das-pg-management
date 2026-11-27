import React, { useState } from 'react';
import {
  LayoutDashboard,
  BedDouble,
  Users,
  ReceiptIndianRupee,
  Wallet,
  TrendingDown,
  FileBarChart2,
  BellRing,
  Settings,
  LogOut,
  Menu,
  X,
  Download,
  Smartphone,
  Calendar,
} from 'lucide-react';
import { usePG } from '../../context/PGContext';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import type { AppSection } from '../../types';
import { formatMonthLabel } from '../../utils/format';
import { DasPGLogo } from '../ui/Logo';
import { Modal } from '../ui/Modal';

interface AppShellProps {
  activeSection: AppSection;
  onSelectSection: (section: AppSection) => void;
  reminderCount: number;
  children: React.ReactNode;
}

const NAV_ITEMS: {
  id: AppSection;
  label: string;
  shortLabel: string;
  icon: React.FC<{ className?: string }>;
}[] = [
  { id: 'dashboard', label: 'Dashboard', shortLabel: 'Home', icon: LayoutDashboard },
  { id: 'rooms', label: 'Rooms (1–10)', shortLabel: 'Rooms', icon: BedDouble },
  { id: 'tenants', label: 'Tenants', shortLabel: 'Tenants', icon: Users },
  { id: 'billing', label: 'Rent & Electricity', shortLabel: 'Bills', icon: ReceiptIndianRupee },
  { id: 'payments', label: 'Payments', shortLabel: 'Payments', icon: Wallet },
  { id: 'expenses', label: 'Expenses', shortLabel: 'Expenses', icon: TrendingDown },
  { id: 'reports', label: 'Reports', shortLabel: 'Reports', icon: FileBarChart2 },
  { id: 'reminders', label: 'Reminders', shortLabel: 'Alerts', icon: BellRing },
  { id: 'settings', label: 'Settings', shortLabel: 'Settings', icon: Settings },
];

export const AppShell: React.FC<AppShellProps> = ({
  activeSection,
  onSelectSection,
  reminderCount,
  children,
}) => {
  const { settings, adminProfile, logout, selectedMonth, setSelectedMonth, showToast } = usePG();
  const { canPromptNatively, isInstalled, triggerInstall } = usePWAInstall();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [installHelpOpen, setInstallHelpOpen] = useState(false);

  const handleInstallClick = async () => {
    const result = await triggerInstall();
    if (result === 'installed') {
      showToast('Das PG Management installed! Open it from your home screen.');
    } else if (result === 'manual') {
      setInstallHelpOpen(true);
    }
  };

  const bottomNavIds: AppSection[] = ['dashboard', 'rooms', 'billing', 'payments', 'reminders'];

  return (
    <div className="min-h-screen flex bg-[#f4f7fb]">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-68 lg:fixed lg:inset-y-0 bg-[#0B192C] text-white border-r border-slate-800 z-30 no-print">
        <div className="px-5 py-5 border-b border-white/10">
          <DasPGLogo size="md" lightText pgName={settings.pgName || 'DAS PG'} />
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectSection(item.id)}
                className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                  active
                    ? 'bg-emerald-500 text-[#0B192C] font-semibold shadow-sm'
                    : 'text-slate-300 hover:bg-white/8 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${active ? 'text-[#0B192C]' : 'text-emerald-400'}`} />
                  {item.label}
                </span>
                {item.id === 'reminders' && reminderCount > 0 && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                      active ? 'bg-[#0B192C] text-white' : 'bg-rose-500 text-white'
                    }`}
                  >
                    {reminderCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-white/10 space-y-2">
          {!isInstalled && (
            <button
              type="button"
              onClick={handleInstallClick}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/30 text-emerald-300 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              {canPromptNatively ? 'Install Das PG App' : 'How to Install App'}
            </button>
          )}
          <div className="flex items-center justify-between gap-2 px-2 py-1.5">
            <div className="min-w-0">
              <div className="text-xs font-semibold text-white truncate">
                {adminProfile?.name || 'Admin'}
              </div>
              <div className="text-[11px] text-slate-400 truncate">
                {adminProfile?.email || 'Owner'}
              </div>
            </div>
            <button
              type="button"
              onClick={logout}
              title="Lock / Sign Out"
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Column */}
      <div className="flex-1 lg:pl-68 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-200 px-4 sm:px-6 py-3 no-print">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2 -ml-1 rounded-xl text-[#0B192C] hover:bg-slate-100 cursor-pointer"
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="lg:hidden">
                <DasPGLogo size="sm" lightText={false} pgName={settings.pgName || 'DAS PG'} />
              </div>
              <div className="hidden lg:block">
                <h2 className="text-lg font-bold text-[#0B192C]">
                  {NAV_ITEMS.find((i) => i.id === activeSection)?.label || 'Dashboard'}
                </h2>
                <p className="text-xs text-slate-500">
                  {settings.pgName} • 10 Rooms Management ({formatMonthLabel(selectedMonth)})
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {/* Month Picker */}
              <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 rounded-xl px-2.5 py-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#0B192C] shrink-0" />
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => e.target.value && setSelectedMonth(e.target.value)}
                  className="bg-transparent text-xs sm:text-sm font-semibold text-[#0B192C] focus:outline-none cursor-pointer"
                  aria-label="Select billing month"
                />
              </div>

              {!isInstalled && (
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="lg:hidden inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#0B192C] text-emerald-400 text-xs font-semibold cursor-pointer"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Install App</span>
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 pb-24 lg:pb-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Mobile Slide-out Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden no-print">
          <div
            className="fixed inset-0 bg-[#0B192C]/60 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-72 bg-[#0B192C] text-white flex flex-col shadow-2xl z-10">
            <div className="px-4 py-4 flex items-center justify-between border-b border-white/10">
              <DasPGLogo size="sm" lightText pgName={settings.pgName || 'DAS PG'} />
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-lg text-slate-300 hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onSelectSection(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium cursor-pointer ${
                      active
                        ? 'bg-emerald-500 text-[#0B192C] font-semibold'
                        : 'text-slate-200 hover:bg-white/10'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <Icon
                        className={`w-4 h-4 ${active ? 'text-[#0B192C]' : 'text-emerald-400'}`}
                      />
                      {item.label}
                    </span>
                    {item.id === 'reminders' && reminderCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-500 text-white">
                        {reminderCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
            <div className="p-3 border-t border-white/10 space-y-2">
              {!isInstalled && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleInstallClick();
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-500 text-[#0B192C] text-xs font-bold cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  Install Das PG App
                </button>
              )}
              <button
                type="button"
                onClick={logout}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white/10 text-slate-200 text-xs font-semibold cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                Sign Out ({adminProfile?.name || 'Admin'})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-[#0B192C] border-t border-white/10 px-1 pt-1.5 pb-safe no-print">
        <div className="grid grid-cols-5 gap-1">
          {bottomNavIds.map((id) => {
            const item = NAV_ITEMS.find((n) => n.id === id)!;
            const Icon = item.icon;
            const active = activeSection === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onSelectSection(id)}
                className={`relative flex flex-col items-center justify-center py-1.5 rounded-xl text-[11px] font-medium cursor-pointer ${
                  active ? 'text-emerald-400 font-semibold' : 'text-slate-300'
                }`}
              >
                <Icon className="w-5 h-5 mb-0.5" />
                <span>{item.shortLabel}</span>
                {id === 'reminders' && reminderCount > 0 && (
                  <span className="absolute top-1 right-3 w-2 h-2 rounded-full bg-rose-500" />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Manual Install Instructions Modal */}
      <Modal
        open={installHelpOpen}
        onClose={() => setInstallHelpOpen(false)}
        title="Install Das PG App on Your Phone or PC"
        subtitle="Get a full-screen home-screen app experience"
      >
        <div className="space-y-4 text-sm text-slate-600">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="font-bold text-[#0B192C] mb-1">Android (Google Chrome)</div>
            <ol className="list-decimal list-inside space-y-1 text-xs">
              <li>Open this website in Chrome over HTTPS (or localhost).</li>
              <li>Tap the <strong>⋮ (three dots)</strong> menu at the top right.</li>
              <li>Tap <strong>Add to Home screen</strong> or <strong>Install app</strong>.</li>
              <li>Confirm <strong>Install</strong> — &quot;Das PG&quot; will appear on your home screen.</li>
            </ol>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="font-bold text-[#0B192C] mb-1">iPhone / iPad (Safari)</div>
            <ol className="list-decimal list-inside space-y-1 text-xs">
              <li>Tap the <strong>Share</strong> icon at the bottom of Safari.</li>
              <li>Scroll and tap <strong>Add to Home Screen</strong>.</li>
              <li>Tap <strong>Add</strong>.</li>
            </ol>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="font-bold text-[#0B192C] mb-1">Desktop (Chrome / Edge)</div>
            <p className="text-xs">
              Click the <strong>Install icon</strong> in the right side of the browser address bar
              and click <strong>Install</strong>.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
};
