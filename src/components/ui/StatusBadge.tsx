import React from 'react';

export const StatusBadge: React.FC<{
  status: 'paid' | 'partial' | 'unpaid' | 'occupied' | 'vacant' | 'active' | 'moved_out' | 'no_bill';
}> = ({ status }) => {
  const styles: Record<string, string> = {
    paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    occupied: 'bg-[#0B192C]/10 text-[#0B192C] border-[#0B192C]/20',
    active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    partial: 'bg-amber-50 text-amber-700 border-amber-200',
    unpaid: 'bg-rose-50 text-rose-700 border-rose-200',
    vacant: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    moved_out: 'bg-slate-100 text-slate-600 border-slate-200',
    no_bill: 'bg-slate-100 text-slate-500 border-slate-200',
  };

  const labels: Record<string, string> = {
    paid: 'Paid',
    occupied: 'Occupied',
    active: 'Active',
    partial: 'Partial',
    unpaid: 'Unpaid',
    vacant: 'Vacant',
    moved_out: 'Moved Out',
    no_bill: 'No Bill',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
        styles[status] || styles.no_bill
      }`}
    >
      {labels[status] || status}
    </span>
  );
};
