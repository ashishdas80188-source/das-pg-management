import React, { useMemo } from 'react';
import {
  BedDouble,
  DoorOpen,
  DoorClosed,
  Users,
  IndianRupee,
  Zap,
  CheckCircle2,
  AlertCircle,
  TrendingDown,
  Wallet,
  Plus,
  BellRing,
  ArrowRight,
  MessageCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import { usePG } from '../../context/PGContext';
import type { AppSection } from '../../types';
import {
  buildWhatsAppReminderUrl,
  formatINR,
  formatMonthLabel,
  formatShortMonth,
  getRecentMonthKeys,
} from '../../utils/format';
import { StatusBadge } from '../ui/StatusBadge';

interface DashboardViewProps {
  onNavigate: (section: AppSection) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const { rooms, tenants, bills, payments, expenses, selectedMonth, settings } = usePG();

  const stats = useMemo(() => {
    const totalRooms = rooms.length; // 10
    const occupiedRooms = rooms.filter((r) => r.status === 'occupied').length;
    const vacantRooms = totalRooms - occupiedRooms;
    const activeTenants = tenants.filter((t) => t.status === 'active').length;

    const monthBills = bills.filter((b) => b.billingMonth === selectedMonth);
    const totalMonthlyRent = monthBills.reduce((s, b) => s + b.rentAmount, 0);
    const totalElectricity = monthBills.reduce((s, b) => s + b.electricityBill, 0);

    const monthPayments = payments.filter((p) => p.billingMonth === selectedMonth);
    const totalCollected = monthPayments.reduce((s, p) => s + p.amount, 0);

    // Outstanding due across selected month bills (or total unpaid across all current bills)
    const totalOutstanding = bills.reduce((s, b) => s + b.remainingDue, 0);
    const monthOutstanding = monthBills.reduce((s, b) => s + b.remainingDue, 0);

    const monthExpenses = expenses
      .filter((e) => e.date.startsWith(selectedMonth))
      .reduce((s, e) => s + e.amount, 0);

    const netIncome = totalCollected - monthExpenses;

    return {
      totalRooms,
      occupiedRooms,
      vacantRooms,
      activeTenants,
      totalMonthlyRent,
      totalElectricity,
      totalCollected,
      totalOutstanding,
      monthOutstanding,
      monthExpenses,
      netIncome,
    };
  }, [rooms, tenants, bills, payments, expenses, selectedMonth]);

  const monthlyChartData = useMemo(() => {
    const monthKeys = getRecentMonthKeys(6, selectedMonth);
    return monthKeys.map((key) => {
      const mCollected = payments
        .filter((p) => p.billingMonth === key)
        .reduce((s, p) => s + p.amount, 0);
      const mExpenses = expenses
        .filter((e) => e.date.startsWith(key))
        .reduce((s, e) => s + e.amount, 0);
      const mBills = bills.filter((b) => b.billingMonth === key);
      const mBilled = mBills.reduce((s, b) => s + b.rentAmount + b.electricityBill + b.otherCharges, 0);
      const mDue = mBills.reduce((s, b) => s + b.remainingDue, 0);

      return {
        month: formatShortMonth(key),
        Income: mCollected,
        Expenses: mExpenses,
        Net: mCollected - mExpenses,
        Billed: mBilled,
        Collected: mCollected,
        Due: mDue,
      };
    });
  }, [payments, expenses, bills, selectedMonth]);

  const occupancyPieData = useMemo(
    () => [
      { name: 'Occupied', value: stats.occupiedRooms, color: '#0B192C' },
      { name: 'Vacant', value: stats.vacantRooms, color: '#10B981' },
    ],
    [stats.occupiedRooms, stats.vacantRooms]
  );

  const pendingBills = useMemo(
    () =>
      bills
        .filter((b) => b.remainingDue > 0)
        .sort((a, b) => b.remainingDue - a.remainingDue)
        .slice(0, 5),
    [bills]
  );

  const vacantRoomsList = useMemo(
    () => rooms.filter((r) => r.status === 'vacant'),
    [rooms]
  );

  const kpiCards = [
    {
      label: 'Total Rooms',
      value: String(stats.totalRooms),
      sub: 'Room 1 to Room 10',
      icon: BedDouble,
      accent: 'bg-[#0B192C] text-white',
    },
    {
      label: 'Occupied Rooms',
      value: String(stats.occupiedRooms),
      sub: `${Math.round((stats.occupiedRooms / 10) * 100)}% occupancy`,
      icon: DoorClosed,
      accent: 'bg-sky-50 text-[#0B192C]',
    },
    {
      label: 'Vacant Rooms',
      value: String(stats.vacantRooms),
      sub: 'Ready for tenants',
      icon: DoorOpen,
      accent: 'bg-emerald-50 text-emerald-700',
    },
    {
      label: 'Total Tenants',
      value: String(stats.activeTenants),
      sub: 'Active residents',
      icon: Users,
      accent: 'bg-indigo-50 text-indigo-700',
    },
    {
      label: 'Monthly Rent Billed',
      value: formatINR(stats.totalMonthlyRent),
      sub: formatMonthLabel(selectedMonth),
      icon: IndianRupee,
      accent: 'bg-slate-100 text-[#0B192C]',
    },
    {
      label: 'Electricity / Line Bill',
      value: formatINR(stats.totalElectricity),
      sub: formatMonthLabel(selectedMonth),
      icon: Zap,
      accent: 'bg-amber-50 text-amber-700',
    },
    {
      label: 'Collected This Month',
      value: formatINR(stats.totalCollected),
      sub: 'Payments received',
      icon: CheckCircle2,
      accent: 'bg-emerald-50 text-emerald-700',
    },
    {
      label: 'Total Outstanding Due',
      value: formatINR(stats.totalOutstanding),
      sub: `${formatINR(stats.monthOutstanding)} this month`,
      icon: AlertCircle,
      accent: 'bg-rose-50 text-rose-700',
    },
    {
      label: 'Monthly Expenses',
      value: formatINR(stats.monthExpenses),
      sub: formatMonthLabel(selectedMonth),
      icon: TrendingDown,
      accent: 'bg-orange-50 text-orange-700',
    },
    {
      label: 'Net Income',
      value: formatINR(stats.netIncome),
      sub: 'Collected - Expenses',
      icon: Wallet,
      accent:
        stats.netIncome >= 0
          ? 'bg-emerald-600 text-white'
          : 'bg-rose-600 text-white',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome / Quick Actions Banner */}
      <div className="bg-[#0B192C] text-white rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold mb-2">
            Overview • {formatMonthLabel(selectedMonth)}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            {settings.pgName || 'Das PG'} Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Manage all 10 rooms, monthly rent & electricity bills, payments, and expenses in one place.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onNavigate('tenants')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            Add Tenant
          </button>
          <button
            type="button"
            onClick={() => onNavigate('billing')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-[#0B192C] text-xs sm:text-sm font-bold transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Generate Bills
          </button>
          <button
            type="button"
            onClick={() => onNavigate('payments')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-[#0B192C] hover:bg-slate-100 text-xs sm:text-sm font-bold transition-colors cursor-pointer"
          >
            Record Payment
          </button>
        </div>
      </div>

      {/* 10 KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          const isSolid = card.accent.includes('text-white');
          return (
            <div
              key={card.label}
              className={`rounded-2xl p-4 border shadow-xs transition-shadow hover:shadow-md ${
                isSolid
                  ? `${card.accent} border-transparent`
                  : 'bg-white border-slate-200/80 text-slate-900'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span
                  className={`text-xs font-semibold ${
                    isSolid ? 'text-white/80' : 'text-slate-500'
                  }`}
                >
                  {card.label}
                </span>
                <div
                  className={`p-2 rounded-xl shrink-0 ${
                    isSolid ? 'bg-white/15 text-white' : card.accent
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="text-lg sm:text-xl font-bold mt-2 tracking-tight truncate">
                {card.value}
              </div>
              <div
                className={`text-[11px] mt-1 truncate ${
                  isSolid ? 'text-white/75' : 'text-slate-500'
                }`}
              >
                {card.sub}
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Monthly Income vs Expenses Chart */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-[#0B192C]">Monthly Income Chart</h3>
              <p className="text-xs text-slate-500">Collected vs Expenses (Last 6 months)</p>
            </div>
          </div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyChartData}>
                <defs>
                  <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} width={48} />
                <Tooltip formatter={(val: number) => formatINR(val)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area
                  type="monotone"
                  dataKey="Income"
                  stroke="#10B981"
                  strokeWidth={2.5}
                  fill="url(#incomeGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="Expenses"
                  stroke="#0B192C"
                  strokeWidth={2}
                  fill="#0B192C"
                  fillOpacity={0.08}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Rent Collection Chart */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-[#0B192C]">Rent Collection Chart</h3>
              <p className="text-xs text-slate-500">Collected vs Pending Due</p>
            </div>
          </div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} width={48} />
                <Tooltip formatter={(val: number) => formatINR(val)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Collected" fill="#10B981" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Due" fill="#f43f5e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Occupied vs Vacant Room Chart */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-[#0B192C]">Occupied vs Vacant Rooms</h3>
              <p className="text-xs text-slate-500">10 Total Rooms in Das PG</p>
            </div>
          </div>
          <div className="h-60 flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height="82%">
              <PieChart>
                <Pie
                  data={occupancyPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={78}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {occupancyPieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-5 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-[#0B192C]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0B192C]" />
                Occupied ({stats.occupiedRooms})
              </span>
              <span className="flex items-center gap-1.5 text-emerald-700">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                Vacant ({stats.vacantRooms})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Pending Dues Reminders & Room Quick Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Reminders & Pending Dues */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
                <BellRing className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#0B192C]">Rent Due Reminders</h3>
                <p className="text-xs text-slate-500">Top outstanding bills with WhatsApp alert</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('reminders')}
              className="text-xs font-semibold text-emerald-700 hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              View All <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {pendingBills.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              No pending dues right now.
            </div>
          ) : (
            <div className="space-y-2.5">
              {pendingBills.map((bill) => {
                const primaryTenant = tenants.find((t) => bill.tenantIds.includes(t.id));
                return (
                  <div
                    key={bill.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/70"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-[#0B192C] text-white">
                          Room {bill.roomNumber}
                        </span>
                        <span className="text-sm font-semibold text-[#0B192C] truncate">
                          {bill.tenantNames}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {formatMonthLabel(bill.billingMonth)} • Due:{' '}
                        <span className="font-bold text-rose-600">
                          {formatINR(bill.remainingDue)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge status={bill.status} />
                      {primaryTenant?.phone && (
                        <a
                          href={buildWhatsAppReminderUrl({
                            phone: primaryTenant.phone,
                            tenantName: primaryTenant.fullName,
                            roomNumber: bill.roomNumber,
                            pgName: settings.pgName || 'Das PG',
                            billingMonth: bill.billingMonth,
                            totalPayable: bill.totalPayable,
                            amountPaid: bill.amountPaid,
                            remainingDue: bill.remainingDue,
                          })}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white transition-colors"
                          title="Send WhatsApp Reminder"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Rooms 1-10 Snapshot */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-[#0B192C]">Rooms 1–10 Status</h3>
              <p className="text-xs text-slate-500">
                {vacantRoomsList.length} vacant • {10 - vacantRoomsList.length} occupied
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('rooms')}
              className="text-xs font-semibold text-emerald-700 hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              Manage Rooms <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {rooms.map((room) => {
              const activeInRoom = tenants.filter(
                (t) => t.roomNumber === room.roomNumber && t.status === 'active'
              );
              const bill = bills.find(
                (b) => b.roomNumber === room.roomNumber && b.billingMonth === selectedMonth
              );
              return (
                <button
                  key={room.id}
                  type="button"
                  onClick={() => onNavigate('rooms')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer hover:shadow-sm ${
                    room.status === 'occupied'
                      ? 'bg-[#0B192C] text-white border-[#0B192C]'
                      : 'bg-emerald-50/70 text-[#0B192C] border-emerald-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">R{room.roomNumber}</span>
                    <span
                      className={`w-2 h-2 rounded-full ${
                        room.status === 'occupied' ? 'bg-emerald-400' : 'bg-emerald-600'
                      }`}
                    />
                  </div>
                  <div
                    className={`text-[11px] mt-1.5 truncate font-medium ${
                      room.status === 'occupied' ? 'text-slate-200' : 'text-emerald-800'
                    }`}
                  >
                    {activeInRoom.length > 0
                      ? activeInRoom.map((t) => t.fullName.split(' ')[0]).join(', ')
                      : 'Vacant'}
                  </div>
                  <div
                    className={`text-[10px] mt-0.5 ${
                      room.status === 'occupied' ? 'text-emerald-300' : 'text-slate-500'
                    }`}
                  >
                    {bill ? `Due: ${formatINR(bill.remainingDue)}` : formatINR(room.monthlyRent)}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
