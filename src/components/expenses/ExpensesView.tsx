import React, { useMemo, useState } from 'react';
import { TrendingDown, Plus, Search, Edit3, Trash2, Paperclip, Image as ImageIcon } from 'lucide-react';
import { usePG } from '../../context/PGContext';
import type { Expense, ExpenseCategory } from '../../types';
import { formatDateIN, formatINR, formatMonthLabel, getTodayISO } from '../../utils/format';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Modal } from '../ui/Modal';

const CATEGORIES: ExpenseCategory[] = [
  'Electricity',
  'Water',
  'Internet/Wi-Fi',
  'Maintenance',
  'Cleaning',
  'Food/Grocery',
  'Repairs',
  'Other',
];

export const ExpensesView: React.FC = () => {
  const { expenses, selectedMonth, addExpense, updateExpense, deleteExpense } = usePG();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | ExpenseCategory>('all');
  const [monthFilterMode, setMonthFilterMode] = useState<'selected' | 'all'>('selected');

  const [formOpen, setFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('Electricity');
  const [date, setDate] = useState(getTodayISO());
  const [description, setDescription] = useState('');
  const [receiptDataUrl, setReceiptDataUrl] = useState<string | undefined>(undefined);
  const [receiptFileName, setReceiptFileName] = useState<string | undefined>(undefined);

  const [previewReceipt, setPreviewReceipt] = useState<Expense | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (monthFilterMode === 'selected' && !e.date.startsWith(selectedMonth)) return false;
      if (categoryFilter !== 'all' && e.category !== categoryFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          e.title.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [expenses, monthFilterMode, selectedMonth, categoryFilter, search]);

  const monthTotal = useMemo(
    () =>
      expenses
        .filter((e) => e.date.startsWith(selectedMonth))
        .reduce((s, e) => s + e.amount, 0),
    [expenses, selectedMonth]
  );

  const categoryBreakdown = useMemo(() => {
    const map = new Map<ExpenseCategory, number>();
    for (const e of expenses.filter((x) => x.date.startsWith(selectedMonth))) {
      map.set(e.category, (map.get(e.category) || 0) + e.amount);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [expenses, selectedMonth]);

  const openAdd = () => {
    setEditingExpense(null);
    setTitle('');
    setAmount('');
    setCategory('Electricity');
    setDate(getTodayISO());
    setDescription('');
    setReceiptDataUrl(undefined);
    setReceiptFileName(undefined);
    setFormOpen(true);
  };

  const openEdit = (e: Expense) => {
    setEditingExpense(e);
    setTitle(e.title);
    setAmount(String(e.amount));
    setCategory(e.category);
    setDate(e.date);
    setDescription(e.description);
    setReceiptDataUrl(e.receiptDataUrl);
    setReceiptFileName(e.receiptFileName);
    setFormOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setReceiptDataUrl(String(reader.result));
      setReceiptFileName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      title: title.trim(),
      amount: Math.max(0, Number(amount) || 0),
      category,
      date,
      description: description.trim(),
      receiptDataUrl,
      receiptFileName,
    };
    if (editingExpense) {
      await updateExpense(editingExpense.id, payload);
    } else {
      await addExpense(payload);
    }
    setFormOpen(false);
  };

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#0B192C] text-emerald-400">
              <TrendingDown className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#0B192C]">PG Expenses</h2>
              <p className="text-xs text-slate-500">
                {formatMonthLabel(selectedMonth)} Total:{' '}
                <span className="font-bold text-rose-600">{formatINR(monthTotal)}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={openAdd}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Expense
          </button>
        </div>

        {categoryBreakdown.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {categoryBreakdown.map(([cat, amt]) => (
              <div
                key={cat}
                className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center gap-2"
              >
                <span className="font-semibold text-slate-600">{cat}:</span>
                <span className="font-bold text-[#0B192C]">{formatINR(amt)}</span>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search expense title or description..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as 'all' | ExpenseCategory)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            value={monthFilterMode}
            onChange={(e) => setMonthFilterMode(e.target.value as 'selected' | 'all')}
            className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
          >
            <option value="selected">{formatMonthLabel(selectedMonth)}</option>
            <option value="all">All Months</option>
          </select>
        </div>
      </div>

      {filteredExpenses.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center">
          <TrendingDown className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-[#0B192C]">No expenses found</h3>
          <p className="text-xs text-slate-500 mt-1">
            Track electricity, water, Wi-Fi, maintenance, cleaning, and other PG costs here.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Expense Title</th>
                  <th className="px-3 py-3 font-semibold">Category</th>
                  <th className="px-3 py-3 font-semibold">Date</th>
                  <th className="px-3 py-3 font-semibold">Receipt</th>
                  <th className="px-4 py-3 font-semibold text-right">Amount</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <div className="font-bold text-[#0B192C]">{exp.title}</div>
                      {exp.description && (
                        <div className="text-xs text-slate-500 mt-0.5">{exp.description}</div>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                        {exp.category}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-600">{formatDateIN(exp.date)}</td>
                    <td className="px-3 py-3">
                      {exp.receiptDataUrl ? (
                        <button
                          type="button"
                          onClick={() => setPreviewReceipt(exp)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline cursor-pointer"
                        >
                          <ImageIcon className="w-3.5 h-3.5" />
                          View
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-rose-600">
                      {formatINR(exp.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEdit(exp)}
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(exp)}
                          className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Expense Modal */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingExpense ? 'Edit Expense' : 'Add PG Expense'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Expense Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Main Meter Electricity Bill, Plumbing Repair"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Amount (₹) *</label>
              <input
                type="number"
                required
                min={0}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Date *</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Vendor name, details, or notes"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Receipt / Photo (Optional)
            </label>
            <label className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs text-slate-600 cursor-pointer">
              <Paperclip className="w-4 h-4 text-emerald-600" />
              <span>{receiptFileName || 'Attach receipt image or photo'}</span>
              <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold cursor-pointer"
            >
              {editingExpense ? 'Save Changes' : 'Add Expense'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Receipt Image Preview Modal */}
      <Modal
        open={Boolean(previewReceipt)}
        onClose={() => setPreviewReceipt(null)}
        title={`Receipt — ${previewReceipt?.title ?? ''}`}
      >
        {previewReceipt?.receiptDataUrl && (
          <div className="space-y-3">
            <img
              src={previewReceipt.receiptDataUrl}
              alt={previewReceipt.title}
              className="w-full rounded-xl border border-slate-200 max-h-[65vh] object-contain"
            />
            <div className="text-xs text-slate-500">
              {previewReceipt.receiptFileName} • {formatINR(previewReceipt.amount)} on{' '}
              {formatDateIN(previewReceipt.date)}
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) await deleteExpense(deleteTarget.id);
        }}
        title="Delete Expense?"
        message={`Remove "${deleteTarget?.title}" (${
          deleteTarget ? formatINR(deleteTarget.amount) : ''
        }) from expenses?`}
        confirmLabel="Delete Expense"
      />
    </div>
  );
};
