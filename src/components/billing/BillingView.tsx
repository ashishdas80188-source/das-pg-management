import React, { useMemo, useState } from 'react';
import {
  ReceiptIndianRupee,
  Zap,
  Plus,
  Sparkles,
  Edit3,
  Trash2,
  Printer,
  Wallet,
  MessageCircle,
  Search,
  RefreshCw,
} from 'lucide-react';
import { usePG } from '../../context/PGContext';
import type { MonthlyBill, PaymentMethod } from '../../types';
import {
  buildDueDateForMonth,
  buildWhatsAppReminderUrl,
  computeBillTotals,
  formatDateIN,
  formatINR,
  formatMonthLabel,
  getTodayISO,
} from '../../utils/format';
import { PrintableBillModal } from '../shared/PrintDocuments';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Modal } from '../ui/Modal';
import { StatusBadge } from '../ui/StatusBadge';

export const BillingView: React.FC = () => {
  const {
    rooms,
    tenants,
    bills,
    selectedMonth,
    settings,
    getPreviousDueForRoom,
    createBill,
    updateBill,
    generateMonthlyBills,
    setBillElectricityForRoom,
    deleteBill,
    recordPayment,
    showToast,
  } = usePG();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'partial' | 'unpaid'>('all');

  // Create/Edit Bill Modal
  const [billModalOpen, setBillModalOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<MonthlyBill | null>(null);
  const [formRoom, setFormRoom] = useState('1');
  const [formMonth, setFormMonth] = useState(selectedMonth);
  const [formRent, setFormRent] = useState('0');
  const [formElec, setFormElec] = useState('0');
  const [formOther, setFormOther] = useState('0');
  const [formOtherNote, setFormOtherNote] = useState('');
  const [formPrevDue, setFormPrevDue] = useState('0');
  const [formDueDate, setFormDueDate] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formError, setFormError] = useState('');

  // Quick Electricity Grid Modal
  const [elecGridOpen, setElecGridOpen] = useState(false);
  const [elecMap, setElecMap] = useState<Record<number, string>>({});

  // Quick Record Payment Modal from Bill
  const [payBillTarget, setPayBillTarget] = useState<MonthlyBill | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(getTodayISO());
  const [payMethod, setPayMethod] = useState<PaymentMethod>('UPI');
  const [payTxId, setPayTxId] = useState('');
  const [payNotes, setPayNotes] = useState('');

  // Print & Delete
  const [printBill, setPrintBill] = useState<MonthlyBill | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MonthlyBill | null>(null);

  const monthBills = useMemo(() => {
    return bills
      .filter((b) => b.billingMonth === selectedMonth)
      .filter((b) => {
        if (statusFilter !== 'all' && b.status !== statusFilter) return false;
        if (search.trim()) {
          const q = search.toLowerCase();
          return (
            b.tenantNames.toLowerCase().includes(q) ||
            `room ${b.roomNumber}`.includes(q) ||
            String(b.roomNumber) === q.trim()
          );
        }
        return true;
      })
      .sort((a, b) => a.roomNumber - b.roomNumber);
  }, [bills, selectedMonth, statusFilter, search]);

  const monthSummary = useMemo(() => {
    const allMonth = bills.filter((b) => b.billingMonth === selectedMonth);
    return {
      rent: allMonth.reduce((s, b) => s + b.rentAmount, 0),
      electricity: allMonth.reduce((s, b) => s + b.electricityBill, 0),
      totalPayable: allMonth.reduce((s, b) => s + b.totalPayable, 0),
      paid: allMonth.reduce((s, b) => s + b.amountPaid, 0),
      due: allMonth.reduce((s, b) => s + b.remainingDue, 0),
    };
  }, [bills, selectedMonth]);

  const openCreateModal = () => {
    setEditingBill(null);
    setFormError('');
    const firstRoom = rooms.find(
      (r) => !bills.some((b) => b.roomNumber === r.roomNumber && b.billingMonth === selectedMonth)
    ) || rooms[0];
    const rNum = firstRoom.roomNumber;
    const activeInRoom = tenants.filter((t) => t.roomNumber === rNum && t.status === 'active');
    const tenantRentSum = activeInRoom.reduce((s, t) => s + t.monthlyRent, 0);
    const defaultRent = tenantRentSum > 0 ? tenantRentSum : firstRoom.monthlyRent || settings.defaultRent || 0;

    setFormRoom(String(rNum));
    setFormMonth(selectedMonth);
    setFormRent(String(defaultRent));
    setFormElec('0');
    setFormOther('0');
    setFormOtherNote('');
    setFormPrevDue(String(getPreviousDueForRoom(rNum, selectedMonth)));
    setFormDueDate(buildDueDateForMonth(selectedMonth, settings.defaultBillingDay));
    setFormNotes('');
    setBillModalOpen(true);
  };

  const openEditModal = (bill: MonthlyBill) => {
    setEditingBill(bill);
    setFormError('');
    setFormRoom(String(bill.roomNumber));
    setFormMonth(bill.billingMonth);
    setFormRent(String(bill.rentAmount));
    setFormElec(String(bill.electricityBill));
    setFormOther(String(bill.otherCharges));
    setFormOtherNote(bill.otherChargesNote);
    setFormPrevDue(String(bill.previousDue));
    setFormDueDate(bill.dueDate);
    setFormNotes(bill.notes);
    setBillModalOpen(true);
  };

  const handleRoomOrMonthChange = (nextRoomStr: string, nextMonthStr: string) => {
    setFormRoom(nextRoomStr);
    setFormMonth(nextMonthStr);
    if (editingBill) return;
    const rNum = Number(nextRoomStr);
    const room = rooms.find((r) => r.roomNumber === rNum);
    const activeInRoom = tenants.filter((t) => t.roomNumber === rNum && t.status === 'active');
    const tenantRentSum = activeInRoom.reduce((s, t) => s + t.monthlyRent, 0);
    const defaultRent = tenantRentSum > 0 ? tenantRentSum : room?.monthlyRent || settings.defaultRent || 0;
    setFormRent(String(defaultRent));
    setFormPrevDue(String(getPreviousDueForRoom(rNum, nextMonthStr)));
    setFormDueDate(buildDueDateForMonth(nextMonthStr, settings.defaultBillingDay));
  };

  const previewTotals = useMemo(
    () =>
      computeBillTotals({
        rentAmount: Number(formRent) || 0,
        electricityBill: Number(formElec) || 0,
        otherCharges: Number(formOther) || 0,
        previousDue: Number(formPrevDue) || 0,
        amountPaid: editingBill?.amountPaid || 0,
      }),
    [formRent, formElec, formOther, formPrevDue, editingBill]
  );

  const handleSaveBill = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    try {
      if (editingBill) {
        await updateBill(editingBill.id, {
          rentAmount: Math.max(0, Number(formRent) || 0),
          electricityBill: Math.max(0, Number(formElec) || 0),
          otherCharges: Math.max(0, Number(formOther) || 0),
          otherChargesNote: formOtherNote.trim(),
          previousDue: Math.max(0, Number(formPrevDue) || 0),
          dueDate: formDueDate,
          notes: formNotes.trim(),
        });
      } else {
        await createBill({
          roomNumber: Number(formRoom),
          billingMonth: formMonth,
          rentAmount: Math.max(0, Number(formRent) || 0),
          electricityBill: Math.max(0, Number(formElec) || 0),
          otherCharges: Math.max(0, Number(formOther) || 0),
          otherChargesNote: formOtherNote.trim(),
          previousDue: Math.max(0, Number(formPrevDue) || 0),
          dueDate: formDueDate,
          notes: formNotes.trim(),
        });
      }
      setBillModalOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to save bill.');
    }
  };

  const openElecGrid = () => {
    const initial: Record<number, string> = {};
    for (const room of rooms) {
      const existing = bills.find(
        (b) => b.roomNumber === room.roomNumber && b.billingMonth === selectedMonth
      );
      initial[room.roomNumber] = String(existing ? existing.electricityBill : 0);
    }
    setElecMap(initial);
    setElecGridOpen(true);
  };

  const handleSaveElecGrid = async (e: React.FormEvent) => {
    e.preventDefault();
    let updatedCount = 0;
    for (const room of rooms) {
      const val = Math.max(0, Number(elecMap[room.roomNumber]) || 0);
      const existing = bills.find(
        (b) => b.roomNumber === room.roomNumber && b.billingMonth === selectedMonth
      );
      if (existing || room.status === 'occupied' || val > 0) {
        await setBillElectricityForRoom(room.roomNumber, selectedMonth, val);
        updatedCount++;
      }
    }
    showToast(`Saved electricity/line bills for ${updatedCount} room(s).`);
    setElecGridOpen(false);
  };

  const openPayModal = (bill: MonthlyBill) => {
    setPayBillTarget(bill);
    setPayAmount(String(bill.remainingDue > 0 ? bill.remainingDue : 0));
    setPayDate(getTodayISO());
    setPayMethod('UPI');
    setPayTxId('');
    setPayNotes('');
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payBillTarget) return;
    const activeTenant =
      tenants.find((t) => payBillTarget.tenantIds.includes(t.id)) ||
      tenants.find((t) => t.roomNumber === payBillTarget.roomNumber && t.status === 'active');

    try {
      await recordPayment({
        billId: payBillTarget.id,
        roomNumber: payBillTarget.roomNumber,
        tenantId: activeTenant?.id || `room_${payBillTarget.roomNumber}`,
        tenantName: activeTenant?.fullName || payBillTarget.tenantNames,
        billingMonth: payBillTarget.billingMonth,
        paymentDate: payDate,
        amount: Math.max(0, Number(payAmount) || 0),
        method: payMethod,
        transactionId: payTxId,
        notes: payNotes,
      });
      setPayBillTarget(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Payment error', 'error');
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Action Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#0B192C] text-emerald-400">
              <ReceiptIndianRupee className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#0B192C]">
                Monthly Rent & Electricity Bills
              </h2>
              <p className="text-xs text-slate-500">
                {formatMonthLabel(selectedMonth)} • Duplicate room bills per month are blocked automatically
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={openElecGrid}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs sm:text-sm font-semibold cursor-pointer"
            >
              <Zap className="w-4 h-4" />
              Enter Electricity Bills
            </button>
            <button
              type="button"
              onClick={() => generateMonthlyBills(selectedMonth)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0B192C] hover:bg-[#132B4A] text-white text-xs sm:text-sm font-semibold cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-emerald-400" />
              Generate Bills (Occupied)
            </button>
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              New Bill
            </button>
          </div>
        </div>

        {/* Month Summary Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
            <div className="text-[11px] text-slate-500 font-medium">Rent Billed</div>
            <div className="text-sm font-bold text-[#0B192C]">{formatINR(monthSummary.rent)}</div>
          </div>
          <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/70">
            <div className="text-[11px] text-amber-700 font-medium">Electricity</div>
            <div className="text-sm font-bold text-amber-800">
              {formatINR(monthSummary.electricity)}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
            <div className="text-[11px] text-slate-500 font-medium">Total Payable</div>
            <div className="text-sm font-bold text-[#0B192C]">
              {formatINR(monthSummary.totalPayable)}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/70">
            <div className="text-[11px] text-emerald-700 font-medium">Collected</div>
            <div className="text-sm font-bold text-emerald-700">{formatINR(monthSummary.paid)}</div>
          </div>
          <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-200/70 col-span-2 sm:col-span-1">
            <div className="text-[11px] text-rose-700 font-medium">Remaining Due</div>
            <div className="text-sm font-bold text-rose-700">{formatINR(monthSummary.due)}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by room or tenant name..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm"
            />
          </div>
          <div className="flex rounded-xl border border-slate-200 p-0.5 bg-slate-50 text-xs font-semibold">
            {(['all', 'unpaid', 'partial', 'paid'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg capitalize cursor-pointer ${
                  statusFilter === st
                    ? 'bg-[#0B192C] text-white'
                    : 'text-slate-600 hover:text-[#0B192C]'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bills Table */}
      {monthBills.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center">
          <ReceiptIndianRupee className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-[#0B192C]">
            No bills for {formatMonthLabel(selectedMonth)}
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Click &quot;Generate Bills (Occupied)&quot; or &quot;Enter Electricity Bills&quot; to create bills for this month.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Room & Tenant</th>
                  <th className="px-3 py-3 font-semibold text-right">Rent</th>
                  <th className="px-3 py-3 font-semibold text-right">Electricity</th>
                  <th className="px-3 py-3 font-semibold text-right">Other + Prev</th>
                  <th className="px-3 py-3 font-semibold text-right">Total Payable</th>
                  <th className="px-3 py-3 font-semibold text-right">Paid</th>
                  <th className="px-3 py-3 font-semibold text-right">Due</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {monthBills.map((bill) => {
                  const primaryTenant = tenants.find((t) => bill.tenantIds.includes(t.id));
                  return (
                    <tr key={bill.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-lg bg-[#0B192C] text-white text-xs font-bold">
                            R{bill.roomNumber}
                          </span>
                          <span className="font-bold text-[#0B192C]">{bill.tenantNames}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Due: {formatDateIN(bill.dueDate)}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right font-medium">
                        {formatINR(bill.rentAmount)}
                      </td>
                      <td className="px-3 py-3 text-right font-medium text-amber-700">
                        {formatINR(bill.electricityBill)}
                      </td>
                      <td className="px-3 py-3 text-right text-xs text-slate-600">
                        {formatINR(bill.otherCharges + bill.previousDue)}
                      </td>
                      <td className="px-3 py-3 text-right font-bold text-[#0B192C]">
                        {formatINR(bill.totalPayable)}
                      </td>
                      <td className="px-3 py-3 text-right font-semibold text-emerald-700">
                        {formatINR(bill.amountPaid)}
                      </td>
                      <td className="px-3 py-3 text-right font-bold text-rose-600">
                        {formatINR(bill.remainingDue)}
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge status={bill.status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          {bill.remainingDue > 0 && (
                            <button
                              type="button"
                              onClick={() => openPayModal(bill)}
                              title="Record Payment"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
                            >
                              <Wallet className="w-3.5 h-3.5" />
                              Pay
                            </button>
                          )}
                          {bill.remainingDue > 0 && primaryTenant?.phone && (
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
                              title="Send WhatsApp Reminder"
                              className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => setPrintBill(bill)}
                            title="Print / Download Bill"
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-[#0B192C] cursor-pointer"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(bill)}
                            title="Edit Bill"
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(bill)}
                            title="Delete Bill"
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

      {/* Create / Edit Bill Modal */}
      <Modal
        open={billModalOpen}
        onClose={() => setBillModalOpen(false)}
        title={
          editingBill
            ? `Edit Bill — Room ${editingBill.roomNumber} (${formatMonthLabel(editingBill.billingMonth)})`
            : 'Create Monthly Bill'
        }
        maxWidthClass="max-w-lg"
      >
        <form onSubmit={handleSaveBill} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Room</label>
              <select
                disabled={Boolean(editingBill)}
                value={formRoom}
                onChange={(e) => handleRoomOrMonthChange(e.target.value, formMonth)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white disabled:bg-slate-100"
              >
                {rooms.map((r) => (
                  <option key={r.id} value={r.roomNumber}>
                    Room {r.roomNumber} ({r.status})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Billing Month
              </label>
              <input
                type="month"
                disabled={Boolean(editingBill)}
                value={formMonth}
                onChange={(e) => handleRoomOrMonthChange(formRoom, e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm disabled:bg-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Rent Amount (₹)
              </label>
              <input
                type="number"
                min={0}
                required
                value={formRent}
                onChange={(e) => setFormRent(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Electricity / Line Bill (₹)
              </label>
              <input
                type="number"
                min={0}
                required
                value={formElec}
                onChange={(e) => setFormElec(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Other Charges (₹)
              </label>
              <input
                type="number"
                min={0}
                value={formOther}
                onChange={(e) => setFormOther(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Other Charges Note
              </label>
              <input
                type="text"
                value={formOtherNote}
                onChange={(e) => setFormOtherNote(e.target.value)}
                placeholder="e.g. Wi-Fi, water, repair"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">Previous Due (₹)</label>
                <button
                  type="button"
                  onClick={() =>
                    setFormPrevDue(String(getPreviousDueForRoom(Number(formRoom), formMonth)))
                  }
                  className="text-[11px] font-semibold text-emerald-700 inline-flex items-center gap-0.5 hover:underline cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" /> Pull Prev
                </button>
              </div>
              <input
                type="number"
                min={0}
                value={formPrevDue}
                onChange={(e) => setFormPrevDue(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Due Date</label>
              <input
                type="date"
                value={formDueDate}
                onChange={(e) => setFormDueDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>
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

          {/* Live Calculation Preview */}
          <div className="p-3.5 rounded-xl bg-[#0B192C] text-white flex items-center justify-between text-xs">
            <div>
              <div className="text-slate-300">Total Payable</div>
              <div className="text-lg font-bold text-emerald-400">
                {formatINR(previewTotals.totalPayable)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-slate-300">
                Paid: {formatINR(editingBill?.amountPaid || 0)}
              </div>
              <div className="font-bold text-white">
                Remaining Due: {formatINR(previewTotals.remainingDue)}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setBillModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold cursor-pointer"
            >
              {editingBill ? 'Update Bill' : 'Create Bill'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Bulk Electricity Entry Modal for Rooms 1-10 */}
      <Modal
        open={elecGridOpen}
        onClose={() => setElecGridOpen(false)}
        title={`Electricity / Line Bills — ${formatMonthLabel(selectedMonth)}`}
        subtitle="Enter electricity amounts for each room manually"
        maxWidthClass="max-w-xl"
      >
        <form onSubmit={handleSaveElecGrid} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[55vh] overflow-y-auto pr-1">
            {rooms.map((room) => {
              const activeNames = tenants
                .filter((t) => t.roomNumber === room.roomNumber && t.status === 'active')
                .map((t) => t.fullName)
                .join(', ');
              return (
                <div
                  key={room.id}
                  className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-[#0B192C]">
                      Room {room.roomNumber}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {activeNames || 'Vacant'}
                    </div>
                  </div>
                  <div className="w-28 shrink-0">
                    <input
                      type="number"
                      min={0}
                      value={elecMap[room.roomNumber] ?? '0'}
                      onChange={(e) =>
                        setElecMap((prev) => ({
                          ...prev,
                          [room.roomNumber]: e.target.value,
                        }))
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-sm font-bold text-right"
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setElecGridOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold cursor-pointer"
            >
              Save All Electricity Bills
            </button>
          </div>
        </form>
      </Modal>

      {/* Quick Record Payment from Bill */}
      <Modal
        open={Boolean(payBillTarget)}
        onClose={() => setPayBillTarget(null)}
        title={`Record Payment — Room ${payBillTarget?.roomNumber ?? ''}`}
        subtitle={
          payBillTarget
            ? `${payBillTarget.tenantNames} • Remaining Due: ${formatINR(payBillTarget.remainingDue)}`
            : ''
        }
      >
        <form onSubmit={handleRecordPayment} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Amount Paid (₹) *
              </label>
              <input
                type="number"
                required
                min={1}
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Supports partial payments too.
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Date *
              </label>
              <input
                type="date"
                required
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Method</label>
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
              >
                <option value="UPI">UPI</option>
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Transaction ID (Optional)
              </label>
              <input
                type="text"
                value={payTxId}
                onChange={(e) => setPayTxId(e.target.value)}
                placeholder="UPI Ref / UTR"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Notes</label>
            <input
              type="text"
              value={payNotes}
              onChange={(e) => setPayNotes(e.target.value)}
              placeholder="Optional payment note"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setPayBillTarget(null)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold cursor-pointer"
            >
              Save Payment & Generate Receipt
            </button>
          </div>
        </form>
      </Modal>

      <PrintableBillModal
        bill={printBill}
        settings={settings}
        onClose={() => setPrintBill(null)}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) await deleteBill(deleteTarget.id);
        }}
        title="Delete Monthly Bill?"
        message={`Delete bill for Room ${deleteTarget?.roomNumber} (${
          deleteTarget ? formatMonthLabel(deleteTarget.billingMonth) : ''
        })? Existing payment records will remain in Payment History.`}
        confirmLabel="Delete Bill"
      />
    </div>
  );
};
