import React, { useMemo, useState } from 'react';
import { Wallet, Plus, Search, Printer, Trash2 } from 'lucide-react';
import { usePG } from '../../context/PGContext';
import type { Payment, PaymentMethod } from '../../types';
import { formatDateIN, formatINR, formatMonthLabel, getTodayISO } from '../../utils/format';
import { PrintableReceiptModal } from '../shared/PrintDocuments';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Modal } from '../ui/Modal';
import { StatusBadge } from '../ui/StatusBadge';

export const PaymentsView: React.FC = () => {
  const {
    rooms,
    tenants,
    bills,
    payments,
    selectedMonth,
    settings,
    recordPayment,
    deletePayment,
    showToast,
  } = usePG();

  const [search, setSearch] = useState('');
  const [roomFilter, setRoomFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [billStatusFilter, setBillStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [addOpen, setAddOpen] = useState(false);
  const [formRoom, setFormRoom] = useState('1');
  const [formTenantId, setFormTenantId] = useState('');
  const [formMonth, setFormMonth] = useState(selectedMonth);
  const [formDate, setFormDate] = useState(getTodayISO());
  const [formAmount, setFormAmount] = useState('');
  const [formMethod, setFormMethod] = useState<PaymentMethod>('UPI');
  const [formTxId, setFormTxId] = useState('');
  const [formNotes, setFormNotes] = useState('');

  const [receiptTarget, setReceiptTarget] = useState<Payment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Payment | null>(null);

  const openAddModal = () => {
    const firstBill = bills.find((b) => b.remainingDue > 0);
    const defaultRoom = firstBill ? firstBill.roomNumber : 1;
    const roomTenants = tenants.filter((t) => t.roomNumber === defaultRoom && t.status === 'active');
    setFormRoom(String(defaultRoom));
    setFormTenantId(roomTenants[0]?.id || '');
    setFormMonth(firstBill?.billingMonth || selectedMonth);
    setFormDate(getTodayISO());
    setFormAmount(firstBill ? String(firstBill.remainingDue) : '');
    setFormMethod('UPI');
    setFormTxId('');
    setFormNotes('');
    setAddOpen(true);
  };

  const selectedRoomTenants = useMemo(
    () => tenants.filter((t) => t.roomNumber === Number(formRoom)),
    [tenants, formRoom]
  );

  const matchingBill = useMemo(
    () =>
      bills.find(
        (b) => b.roomNumber === Number(formRoom) && b.billingMonth === formMonth
      ),
    [bills, formRoom, formMonth]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const tenant = tenants.find((t) => t.id === formTenantId);
    const activeInRoom = tenants.filter(
      (t) => t.roomNumber === Number(formRoom) && t.status === 'active'
    );
    const tenantName =
      tenant?.fullName ||
      activeInRoom.map((t) => t.fullName).join(', ') ||
      `Room ${formRoom}`;

    try {
      const created = await recordPayment({
        roomNumber: Number(formRoom),
        tenantId: tenant?.id || activeInRoom[0]?.id || `room_${formRoom}`,
        tenantName,
        billingMonth: formMonth,
        paymentDate: formDate,
        amount: Math.max(0, Number(formAmount) || 0),
        method: formMethod,
        transactionId: formTxId,
        notes: formNotes,
        billId: matchingBill?.id,
      });
      setAddOpen(false);
      setReceiptTarget(created);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to record payment.', 'error');
    }
  };

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      if (roomFilter !== 'all' && p.roomNumber !== Number(roomFilter)) return false;
      if (methodFilter !== 'all' && p.method !== methodFilter) return false;
      if (dateFrom && p.paymentDate < dateFrom) return false;
      if (dateTo && p.paymentDate > dateTo) return false;
      if (billStatusFilter !== 'all') {
        const linked = bills.find(
          (b) =>
            b.id === p.billId ||
            (b.roomNumber === p.roomNumber && b.billingMonth === p.billingMonth)
        );
        const st = linked ? linked.status : 'no_bill';
        if (st !== billStatusFilter) return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          p.tenantName.toLowerCase().includes(q) ||
          p.receiptNumber.toLowerCase().includes(q) ||
          p.transactionId.toLowerCase().includes(q) ||
          `room ${p.roomNumber}`.includes(q)
        );
      }
      return true;
    });
  }, [payments, bills, roomFilter, methodFilter, billStatusFilter, dateFrom, dateTo, search]);

  const totalFilteredAmount = useMemo(
    () => filteredPayments.reduce((s, p) => s + p.amount, 0),
    [filteredPayments]
  );

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#0B192C] text-emerald-400">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#0B192C]">Payment Management</h2>
              <p className="text-xs text-slate-500">
                {filteredPayments.length} payment(s) shown • Total:{' '}
                <span className="font-bold text-emerald-700">{formatINR(totalFilteredAmount)}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Record Payment
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tenant, receipt #, or Tx ID..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm"
            />
          </div>
          <select
            value={roomFilter}
            onChange={(e) => setRoomFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
          >
            <option value="all">All Rooms</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.roomNumber}>
                Room {r.roomNumber}
              </option>
            ))}
          </select>
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
          >
            <option value="all">All Methods</option>
            <option value="Cash">Cash</option>
            <option value="UPI">UPI</option>
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="Other">Other</option>
          </select>
          <select
            value={billStatusFilter}
            onChange={(e) => setBillStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
          >
            <option value="all">All Bill Statuses</option>
            <option value="paid">Paid</option>
            <option value="partial">Partial</option>
            <option value="unpaid">Unpaid</option>
          </select>
          <div className="flex gap-1.5">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              title="From date"
              className="w-1/2 px-2 py-2 rounded-xl border border-slate-200 text-xs"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              title="To date"
              className="w-1/2 px-2 py-2 rounded-xl border border-slate-200 text-xs"
            />
          </div>
        </div>
      </div>

      {/* Payments Table */}
      {filteredPayments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center">
          <Wallet className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-[#0B192C]">No payments recorded yet</h3>
          <p className="text-xs text-slate-500 mt-1">
            Record full or partial tenant payments to generate receipts automatically.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Receipt #</th>
                  <th className="px-4 py-3 font-semibold">Tenant & Room</th>
                  <th className="px-3 py-3 font-semibold">Date</th>
                  <th className="px-3 py-3 font-semibold">For Month</th>
                  <th className="px-3 py-3 font-semibold">Method</th>
                  <th className="px-3 py-3 font-semibold">Bill Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Amount</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPayments.map((payment) => {
                  const linkedBill = bills.find(
                    (b) =>
                      b.id === payment.billId ||
                      (b.roomNumber === payment.roomNumber &&
                        b.billingMonth === payment.billingMonth)
                  );
                  return (
                    <tr key={payment.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-[#0B192C]">
                        {payment.receiptNumber}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-[#0B192C]">{payment.tenantName}</div>
                        <div className="text-xs text-slate-500">Room {payment.roomNumber}</div>
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-600">
                        {formatDateIN(payment.paymentDate)}
                      </td>
                      <td className="px-3 py-3 text-xs font-medium">
                        {formatMonthLabel(payment.billingMonth)}
                      </td>
                      <td className="px-3 py-3">
                        <div className="text-xs font-semibold">{payment.method}</div>
                        {payment.transactionId && (
                          <div className="text-[11px] font-mono text-slate-400">
                            {payment.transactionId}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge status={linkedBill ? linkedBill.status : 'no_bill'} />
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-700">
                        {formatINR(payment.amount)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setReceiptTarget(payment)}
                            title="Print / Download Receipt"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#0B192C] text-white text-xs font-semibold cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5 text-emerald-400" />
                            Receipt
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(payment)}
                            title="Delete Payment"
                            className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Record Tenant Payment"
        subtitle="Supports partial and multiple payments per month"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Room *</label>
              <select
                value={formRoom}
                onChange={(e) => {
                  const rNum = Number(e.target.value);
                  setFormRoom(e.target.value);
                  const roomTenants = tenants.filter(
                    (t) => t.roomNumber === rNum && t.status === 'active'
                  );
                  setFormTenantId(roomTenants[0]?.id || '');
                  const b = bills.find(
                    (x) => x.roomNumber === rNum && x.billingMonth === formMonth
                  );
                  if (b) setFormAmount(String(b.remainingDue));
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
              >
                {rooms.map((r) => (
                  <option key={r.id} value={r.roomNumber}>
                    Room {r.roomNumber}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tenant</label>
              <select
                value={formTenantId}
                onChange={(e) => setFormTenantId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
              >
                {selectedRoomTenants.length === 0 ? (
                  <option value="">Room {formRoom} Occupant</option>
                ) : (
                  selectedRoomTenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.fullName} ({t.status})
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {matchingBill && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
              <span>
                Bill for {formatMonthLabel(formMonth)}: Total{' '}
                <strong>{formatINR(matchingBill.totalPayable)}</strong>
              </span>
              <span className="font-bold text-rose-600">
                Remaining Due: {formatINR(matchingBill.remainingDue)}
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Month Paid For *
              </label>
              <input
                type="month"
                required
                value={formMonth}
                onChange={(e) => setFormMonth(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Date *
              </label>
              <input
                type="date"
                required
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Amount (₹) *
              </label>
              <input
                type="number"
                required
                min={1}
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Method *
              </label>
              <select
                value={formMethod}
                onChange={(e) => setFormMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
              >
                <option value="Cash">Cash</option>
                <option value="UPI">UPI</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Transaction ID (Optional)
            </label>
            <input
              type="text"
              value={formTxId}
              onChange={(e) => setFormTxId(e.target.value)}
              placeholder="UPI ref / Bank UTR"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Notes</label>
            <input
              type="text"
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              placeholder="Optional remarks"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setAddOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold cursor-pointer"
            >
              Save Payment & View Receipt
            </button>
          </div>
        </form>
      </Modal>

      <PrintableReceiptModal
        payment={receiptTarget}
        settings={settings}
        onClose={() => setReceiptTarget(null)}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) await deletePayment(deleteTarget.id);
        }}
        title="Delete Payment Record?"
        message={`Delete receipt ${deleteTarget?.receiptNumber} (${
          deleteTarget ? formatINR(deleteTarget.amount) : ''
        })? The linked bill's due balance will be recalculated automatically.`}
        confirmLabel="Delete Payment"
      />
    </div>
  );
};
