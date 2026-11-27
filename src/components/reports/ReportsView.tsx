import React, { useMemo, useState } from 'react';
import { FileBarChart2, FileSpreadsheet, Printer, FileDown } from 'lucide-react';
import { usePG } from '../../context/PGContext';
import { exportToCSV, exportToExcel } from '../../services/export';
import {
  formatDateIN,
  formatINR,
  formatMonthLabel,
  getRecentMonthKeys,
} from '../../utils/format';

type ReportTab =
  | 'profit_loss'
  | 'rent_collection'
  | 'electricity'
  | 'pending_dues'
  | 'occupancy'
  | 'tenants'
  | 'expenses';

const TABS: { id: ReportTab; label: string }[] = [
  { id: 'profit_loss', label: 'Income & Profit/Loss' },
  { id: 'rent_collection', label: 'Monthly Rent Collection' },
  { id: 'electricity', label: 'Electricity / Line Bills' },
  { id: 'pending_dues', label: 'Pending Dues' },
  { id: 'occupancy', label: 'Room Occupancy' },
  { id: 'tenants', label: 'Tenant List' },
  { id: 'expenses', label: 'Expenses' },
];

export const ReportsView: React.FC = () => {
  const { rooms, tenants, bills, payments, expenses, selectedMonth, settings } = usePG();
  const [activeTab, setActiveTab] = useState<ReportTab>('profit_loss');

  const reportData = useMemo((): {
    title: string;
    headers: string[];
    rows: (string | number)[][];
    summaryLine: string;
  } => {
    const monthBills = bills
      .filter((b) => b.billingMonth === selectedMonth)
      .sort((a, b) => a.roomNumber - b.roomNumber);

    switch (activeTab) {
      case 'rent_collection': {
        const rows = monthBills.map((b) => [
          `Room ${b.roomNumber}`,
          b.tenantNames,
          b.rentAmount,
          b.amountPaid,
          b.remainingDue,
          b.status.toUpperCase(),
        ]);
        const totalRent = monthBills.reduce((s, b) => s + b.rentAmount, 0);
        const totalPaid = monthBills.reduce((s, b) => s + b.amountPaid, 0);
        return {
          title: `Monthly Rent Collection — ${formatMonthLabel(selectedMonth)}`,
          headers: ['Room', 'Tenant(s)', 'Rent Billed (₹)', 'Paid (₹)', 'Remaining Due (₹)', 'Status'],
          rows,
          summaryLine: `Total Rent Billed: ${formatINR(totalRent)} • Total Collected: ${formatINR(totalPaid)}`,
        };
      }
      case 'electricity': {
        const rows = monthBills.map((b) => [
          `Room ${b.roomNumber}`,
          b.tenantNames,
          b.electricityBill,
          b.totalPayable,
          b.status.toUpperCase(),
        ]);
        const totalElec = monthBills.reduce((s, b) => s + b.electricityBill, 0);
        return {
          title: `Electricity / Line Bill Collection — ${formatMonthLabel(selectedMonth)}`,
          headers: ['Room', 'Tenant(s)', 'Electricity Bill (₹)', 'Total Bill (₹)', 'Status'],
          rows,
          summaryLine: `Total Electricity Billed: ${formatINR(totalElec)}`,
        };
      }
      case 'pending_dues': {
        const dueBills = bills
          .filter((b) => b.remainingDue > 0)
          .sort((a, b) => b.remainingDue - a.remainingDue);
        const rows = dueBills.map((b) => [
          `Room ${b.roomNumber}`,
          b.tenantNames,
          formatMonthLabel(b.billingMonth),
          b.totalPayable,
          b.amountPaid,
          b.remainingDue,
          b.status.toUpperCase(),
        ]);
        const totalDue = dueBills.reduce((s, b) => s + b.remainingDue, 0);
        return {
          title: 'Pending Dues Report (All Months)',
          headers: ['Room', 'Tenant(s)', 'Month', 'Total Payable (₹)', 'Paid (₹)', 'Remaining Due (₹)', 'Status'],
          rows,
          summaryLine: `Total Pending Dues: ${formatINR(totalDue)} across ${dueBills.length} bill(s)`,
        };
      }
      case 'occupancy': {
        const rows = rooms.map((r) => {
          const active = tenants.filter((t) => t.roomNumber === r.roomNumber && t.status === 'active');
          return [
            `Room ${r.roomNumber}`,
            r.floor,
            r.status.toUpperCase(),
            r.capacity,
            active.length,
            active.map((t) => t.fullName).join(', ') || '—',
            r.monthlyRent,
          ];
        });
        const occ = rooms.filter((r) => r.status === 'occupied').length;
        return {
          title: 'Room Occupancy Report (Rooms 1–10)',
          headers: ['Room', 'Floor', 'Status', 'Capacity', 'Occupants', 'Tenant Names', 'Base Rent (₹)'],
          rows,
          summaryLine: `${occ}/10 Rooms Occupied (${10 - occ} Vacant)`,
        };
      }
      case 'tenants': {
        const rows = tenants.map((t) => [
          t.fullName,
          t.phone,
          `Room ${t.roomNumber}`,
          formatDateIN(t.joiningDate),
          t.monthlyRent,
          t.securityDeposit,
          t.status === 'active' ? 'Active' : 'Moved Out',
        ]);
        return {
          title: 'Tenant List Report',
          headers: ['Full Name', 'Phone', 'Room', 'Joining Date', 'Monthly Rent (₹)', 'Deposit (₹)', 'Status'],
          rows,
          summaryLine: `Total Tenants: ${tenants.length} (${tenants.filter((t) => t.status === 'active').length} Active)`,
        };
      }
      case 'expenses': {
        const monthExps = expenses.filter((e) => e.date.startsWith(selectedMonth));
        const rows = monthExps.map((e) => [
          e.title,
          e.category,
          formatDateIN(e.date),
          e.amount,
          e.description || '—',
        ]);
        const totalExp = monthExps.reduce((s, e) => s + e.amount, 0);
        return {
          title: `Expenses Report — ${formatMonthLabel(selectedMonth)}`,
          headers: ['Title', 'Category', 'Date', 'Amount (₹)', 'Description'],
          rows,
          summaryLine: `Total Monthly Expenses: ${formatINR(totalExp)}`,
        };
      }
      case 'profit_loss':
      default: {
        const recentMonths = getRecentMonthKeys(6, selectedMonth);
        const rows = recentMonths.map((m) => {
          const income = payments
            .filter((p) => p.billingMonth === m)
            .reduce((s, p) => s + p.amount, 0);
          const exp = expenses
            .filter((e) => e.date.startsWith(m))
            .reduce((s, e) => s + e.amount, 0);
          const billed = bills
            .filter((b) => b.billingMonth === m)
            .reduce((s, b) => s + b.rentAmount + b.electricityBill + b.otherCharges, 0);
          return [
            formatMonthLabel(m),
            billed,
            income,
            exp,
            income - exp,
          ];
        });
        const totalIncome = rows.reduce((s, r) => s + Number(r[2]), 0);
        const totalExp = rows.reduce((s, r) => s + Number(r[3]), 0);
        return {
          title: 'Total Income & Profit / Loss Summary (Last 6 Months)',
          headers: ['Month', 'Total Billed (₹)', 'Total Collected (₹)', 'Total Expenses (₹)', 'Net Profit / Loss (₹)'],
          rows,
          summaryLine: `6-Month Collected: ${formatINR(totalIncome)} • Expenses: ${formatINR(totalExp)} • Net Profit: ${formatINR(totalIncome - totalExp)}`,
        };
      }
    }
  }, [activeTab, bills, rooms, tenants, payments, expenses, selectedMonth]);

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-4 no-print">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#0B192C] text-emerald-400">
              <FileBarChart2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#0B192C]">Reports & Exports</h2>
              <p className="text-xs text-slate-500">
                Export to CSV, Excel (.xlsx), or printable PDF report
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                exportToCSV(`das-pg-${activeTab}-${selectedMonth}.csv`, reportData.headers, reportData.rows)
              }
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-[#0B192C] cursor-pointer"
            >
              <FileDown className="w-4 h-4 text-emerald-600" />
              Export CSV
            </button>
            <button
              type="button"
              onClick={() =>
                exportToExcel(`das-pg-${activeTab}-${selectedMonth}.xlsx`, [
                  { name: activeTab, headers: reportData.headers, rows: reportData.rows },
                ])
              }
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Export Excel
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0B192C] hover:bg-[#132B4A] text-white text-xs font-semibold cursor-pointer"
            >
              <Printer className="w-4 h-4 text-emerald-400" />
              Print / PDF
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                activeTab === tab.id
                  ? 'bg-[#0B192C] text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Printable Report Area */}
      <div className="print-only-container bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-[#0B192C]">{reportData.title}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{reportData.summaryLine}</p>
          </div>
          <div className="text-xs font-semibold text-slate-500">{settings.pgName || 'Das PG'}</div>
        </div>

        {reportData.rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            No records available for this report yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#0B192C] text-white text-xs uppercase">
                <tr>
                  {reportData.headers.map((h) => (
                    <th key={h} className="px-4 py-3 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportData.rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70">
                    {row.map((cell, cIdx) => {
                      const header = reportData.headers[cIdx] || '';
                      const isMoney = header.includes('₹');
                      return (
                        <td
                          key={cIdx}
                          className={`px-4 py-2.5 ${
                            cIdx === 0 ? 'font-bold text-[#0B192C]' : 'text-slate-700'
                          }`}
                        >
                          {isMoney && typeof cell === 'number' ? formatINR(cell) : cell}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
