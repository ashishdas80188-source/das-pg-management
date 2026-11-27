import React, { useMemo } from 'react';
import {
  BellRing,
  AlertTriangle,
  CalendarClock,
  DoorOpen,
  MessageCircle,
  CheckCircle2,
  Wallet,
} from 'lucide-react';
import { usePG } from '../../context/PGContext';
import type { AppSection } from '../../types';
import {
  buildDueDateForMonth,
  buildWhatsAppReminderUrl,
  formatDateIN,
  formatINR,
  formatMonthLabel,
  getCurrentMonthKey,
  getTodayISO,
} from '../../utils/format';
import { StatusBadge } from '../ui/StatusBadge';

interface RemindersViewProps {
  onNavigate: (section: AppSection) => void;
}

export const RemindersView: React.FC<RemindersViewProps> = ({ onNavigate }) => {
  const { rooms, tenants, bills, payments, settings, selectedMonth } = usePG();
  const today = getTodayISO();

  const { overdueBills, dueBills, upcomingRentRooms, vacantRooms, recentPayments } = useMemo(() => {
    const unpaidOrPartial = bills.filter((b) => b.remainingDue > 0);
    const overdue = unpaidOrPartial
      .filter((b) => b.dueDate < today)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    const dueCurrent = unpaidOrPartial
      .filter((b) => b.dueDate >= today)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

    const currentMonthKey = getCurrentMonthKey();
    const upcomingDueDate = buildDueDateForMonth(currentMonthKey, settings.defaultBillingDay);
    const upcoming = rooms
      .filter((r) => r.status === 'occupied')
      .filter(
        (r) =>
          !bills.some(
            (b) => b.roomNumber === r.roomNumber && b.billingMonth === selectedMonth
          )
      )
      .map((r) => {
        const active = tenants.filter(
          (t) => t.roomNumber === r.roomNumber && t.status === 'active'
        );
        const estRent =
          active.reduce((s, t) => s + t.monthlyRent, 0) || r.monthlyRent || settings.defaultRent;
        return { room: r, active, estRent, upcomingDueDate };
      });

    const vacant = rooms.filter((r) => r.status === 'vacant');
    const recent = payments.slice(0, 5);

    return {
      overdueBills: overdue,
      dueBills: dueCurrent,
      upcomingRentRooms: upcoming,
      vacantRooms: vacant,
      recentPayments: recent,
    };
  }, [bills, rooms, tenants, payments, settings, selectedMonth, today]);

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[#0B192C] text-emerald-400">
            <BellRing className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#0B192C]">Notifications & Reminders</h2>
            <p className="text-xs text-slate-500">
              Overdue alerts, upcoming rent dates, vacant rooms, and instant WhatsApp reminders
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <span className="px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
            {overdueBills.length} Overdue
          </span>
          <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
            {dueBills.length} Due
          </span>
          <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            {vacantRooms.length} Vacant Rooms
          </span>
        </div>
      </div>

      {/* Overdue Payments */}
      <div className="bg-white rounded-2xl border border-rose-200/80 p-5 shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-rose-700">
          <AlertTriangle className="w-5 h-5" />
          <h3 className="text-sm font-bold">Overdue Payments ({overdueBills.length})</h3>
        </div>
        {overdueBills.length === 0 ? (
          <div className="p-4 rounded-xl bg-emerald-50/70 text-emerald-800 text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Great! No overdue payments right now.
          </div>
        ) : (
          <div className="space-y-2.5">
            {overdueBills.map((bill) => {
              const primaryTenant = tenants.find((t) => bill.tenantIds.includes(t.id));
              return (
                <div
                  key={bill.id}
                  className="p-3.5 rounded-xl bg-rose-50/60 border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-lg bg-[#0B192C] text-white text-xs font-bold">
                        Room {bill.roomNumber}
                      </span>
                      <span className="font-bold text-sm text-[#0B192C]">{bill.tenantNames}</span>
                      <StatusBadge status={bill.status} />
                    </div>
                    <div className="text-xs text-slate-600 mt-1">
                      {formatMonthLabel(bill.billingMonth)} • Due since{' '}
                      <span className="font-semibold text-rose-700">
                        {formatDateIN(bill.dueDate)}
                      </span>{' '}
                      • Remaining:{' '}
                      <span className="font-bold text-rose-700">
                        {formatINR(bill.remainingDue)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
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
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                      >
                        <MessageCircle className="w-4 h-4" />
                        Send WhatsApp Reminder
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => onNavigate('billing')}
                      className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-[#0B192C] cursor-pointer"
                    >
                      Open Bill
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Rent Due Reminders (Not yet past due date) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-[#0B192C]">
          <CalendarClock className="w-5 h-5 text-amber-600" />
          <h3 className="text-sm font-bold">Rent Due Reminders ({dueBills.length})</h3>
        </div>
        {dueBills.length === 0 ? (
          <p className="text-xs text-slate-500">No active unpaid bills awaiting due date.</p>
        ) : (
          <div className="space-y-2.5">
            {dueBills.map((bill) => {
              const primaryTenant = tenants.find((t) => bill.tenantIds.includes(t.id));
              return (
                <div
                  key={bill.id}
                  className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-lg bg-[#0B192C] text-white text-xs font-bold">
                        Room {bill.roomNumber}
                      </span>
                      <span className="font-bold text-sm text-[#0B192C]">{bill.tenantNames}</span>
                      <StatusBadge status={bill.status} />
                    </div>
                    <div className="text-xs text-slate-600 mt-1">
                      {formatMonthLabel(bill.billingMonth)} • Due on{' '}
                      <strong>{formatDateIN(bill.dueDate)}</strong> • Balance:{' '}
                      <strong className="text-rose-600">{formatINR(bill.remainingDue)}</strong>
                    </div>
                  </div>
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
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold w-fit"
                    >
                      <MessageCircle className="w-4 h-4" />
                      WhatsApp Reminder
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Upcoming Rent Dates (Occupied rooms without generated bill for selected month) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#0B192C]">
              Upcoming Rent Dates ({upcomingRentRooms.length})
            </h3>
            <span className="text-xs text-slate-500">
              Billing Day: {settings.defaultBillingDay}th of month
            </span>
          </div>
          {upcomingRentRooms.length === 0 ? (
            <p className="text-xs text-slate-500">
              All occupied rooms have bills generated for {formatMonthLabel(selectedMonth)}.
            </p>
          ) : (
            <div className="space-y-2">
              {upcomingRentRooms.map(({ room, active, estRent, upcomingDueDate }) => (
                <div
                  key={room.id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2 text-xs"
                >
                  <div>
                    <div className="font-bold text-[#0B192C]">
                      Room {room.roomNumber} —{' '}
                      {active.map((t) => t.fullName).join(', ') || 'Occupied'}
                    </div>
                    <div className="text-slate-500">
                      Expected Rent: {formatINR(estRent)} • Due {formatDateIN(upcomingDueDate)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate('billing')}
                    className="px-2.5 py-1.5 rounded-lg bg-[#0B192C] text-white font-semibold cursor-pointer"
                  >
                    Generate Bill
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Vacant Rooms & Recent Payment Alerts */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-emerald-700">
              <DoorOpen className="w-4 h-4" />
              <h3 className="text-sm font-bold">Vacant Rooms ({vacantRooms.length} / 10)</h3>
            </div>
            {vacantRooms.length === 0 ? (
              <p className="text-xs text-slate-500">All 10 rooms are currently occupied!</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {vacantRooms.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => onNavigate('rooms')}
                    className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 cursor-pointer"
                  >
                    Room {r.roomNumber} ({formatINR(r.monthlyRent)})
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-[#0B192C]">
              <Wallet className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold">Recent Payment Alerts</h3>
            </div>
            {recentPayments.length === 0 ? (
              <p className="text-xs text-slate-500">No payments recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {recentPayments.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-slate-50 border border-slate-200/70"
                  >
                    <span>
                      <strong>{p.tenantName}</strong> (Room {p.roomNumber}) paid via {p.method}
                    </span>
                    <span className="font-bold text-emerald-700">{formatINR(p.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
