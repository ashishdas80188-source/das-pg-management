import React, { useMemo, useState } from 'react';
import {
  UserPlus,
  Search,
  Edit3,
  Trash2,
  LogOut,
  Eye,
  Phone,
  MessageCircle,
  Users,
} from 'lucide-react';
import { usePG } from '../../context/PGContext';
import type { Tenant } from '../../types';
import {
  buildWhatsAppReminderUrl,
  formatDateIN,
  formatINR,
  formatMonthLabel,
  getTodayISO,
} from '../../utils/format';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Modal } from '../ui/Modal';
import { StatusBadge } from '../ui/StatusBadge';

export const TenantsView: React.FC = () => {
  const {
    tenants,
    rooms,
    bills,
    payments,
    settings,
    addTenant,
    updateTenant,
    markTenantMovedOut,
    deleteTenant,
  } = usePG();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'moved_out'>('active');
  const [roomFilter, setRoomFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'room' | 'name' | 'joining'>('room');

  const [formOpen, setFormOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [detailTenant, setDetailTenant] = useState<Tenant | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Tenant | null>(null);
  const [moveOutTarget, setMoveOutTarget] = useState<Tenant | null>(null);

  // Form fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [roomNumber, setRoomNumber] = useState('1');
  const [joiningDate, setJoiningDate] = useState(getTodayISO());
  const [monthlyRent, setMonthlyRent] = useState('');
  const [securityDeposit, setSecurityDeposit] = useState('0');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [address, setAddress] = useState('');
  const [idDocumentType, setIdDocumentType] = useState('Aadhaar');
  const [idDocumentNumber, setIdDocumentNumber] = useState('');
  const [notes, setNotes] = useState('');

  const filteredTenants = useMemo(() => {
    return tenants
      .filter((t) => {
        if (statusFilter !== 'all' && t.status !== statusFilter) return false;
        if (roomFilter !== 'all' && t.roomNumber !== Number(roomFilter)) return false;
        if (search.trim()) {
          const q = search.toLowerCase();
          return (
            t.fullName.toLowerCase().includes(q) ||
            t.phone.toLowerCase().includes(q) ||
            `room ${t.roomNumber}`.includes(q) ||
            String(t.roomNumber) === q.trim()
          );
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.fullName.localeCompare(b.fullName);
        if (sortBy === 'joining') return b.joiningDate.localeCompare(a.joiningDate);
        return a.roomNumber - b.roomNumber || a.fullName.localeCompare(b.fullName);
      });
  }, [tenants, statusFilter, roomFilter, search, sortBy]);

  const openAddModal = () => {
    setEditingTenant(null);
    const firstVacant = rooms.find((r) => r.status === 'vacant') || rooms[0];
    setFullName('');
    setPhone('');
    setRoomNumber(String(firstVacant.roomNumber));
    setJoiningDate(getTodayISO());
    setMonthlyRent(String(firstVacant.monthlyRent || settings.defaultRent || 0));
    setSecurityDeposit('0');
    setEmergencyContact('');
    setAddress('');
    setIdDocumentType('Aadhaar');
    setIdDocumentNumber('');
    setNotes('');
    setFormOpen(true);
  };

  const openEditModal = (t: Tenant) => {
    setEditingTenant(t);
    setFullName(t.fullName);
    setPhone(t.phone);
    setRoomNumber(String(t.roomNumber));
    setJoiningDate(t.joiningDate);
    setMonthlyRent(String(t.monthlyRent));
    setSecurityDeposit(String(t.securityDeposit));
    setEmergencyContact(t.emergencyContact);
    setAddress(t.address);
    setIdDocumentType(t.idDocumentType || 'Aadhaar');
    setIdDocumentNumber(t.idDocumentNumber);
    setNotes(t.notes);
    setFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      fullName: fullName.trim(),
      phone: phone.trim(),
      roomNumber: Number(roomNumber),
      joiningDate,
      monthlyRent: Math.max(0, Number(monthlyRent) || 0),
      securityDeposit: Math.max(0, Number(securityDeposit) || 0),
      emergencyContact: emergencyContact.trim(),
      address: address.trim(),
      idDocumentType: idDocumentType.trim(),
      idDocumentNumber: idDocumentNumber.trim(),
      notes: notes.trim(),
    };

    if (editingTenant) {
      await updateTenant(editingTenant.id, payload);
    } else {
      await addTenant(payload);
    }
    setFormOpen(false);
  };

  const tenantHistoryData = useMemo(() => {
    if (!detailTenant) return { tenantPayments: [], tenantBills: [], totalDue: 0 };
    const tenantPayments = payments.filter((p) => p.tenantId === detailTenant.id);
    const tenantBills = bills.filter(
      (b) =>
        b.tenantIds.includes(detailTenant.id) ||
        (b.roomNumber === detailTenant.roomNumber &&
          b.tenantNames.toLowerCase().includes(detailTenant.fullName.toLowerCase()))
    );
    const totalDue = tenantBills.reduce((s, b) => s + b.remainingDue, 0);
    return { tenantPayments, tenantBills, totalDue };
  }, [detailTenant, payments, bills]);

  return (
    <div className="space-y-5">
      {/* Header & Search */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#0B192C] text-emerald-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#0B192C]">Tenant Directory</h2>
              <p className="text-xs text-slate-500">
                {tenants.filter((t) => t.status === 'active').length} active •{' '}
                {tenants.filter((t) => t.status === 'moved_out').length} moved out
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold cursor-pointer shadow-xs"
          >
            <UserPlus className="w-4 h-4" />
            Add New Tenant
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by tenant name, phone, or room..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <select
            value={roomFilter}
            onChange={(e) => setRoomFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
          >
            <option value="all">All Rooms (1–10)</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.roomNumber}>
                Room {r.roomNumber}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'moved_out')}
              className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
            >
              <option value="active">Active</option>
              <option value="moved_out">Moved Out</option>
              <option value="all">All</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'room' | 'name' | 'joining')}
              className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
            >
              <option value="room">Sort: Room</option>
              <option value="name">Sort: Name</option>
              <option value="joining">Sort: Joining</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tenant List */}
      {filteredTenants.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center">
          <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-[#0B192C]">No tenants found</h3>
          <p className="text-xs text-slate-500 mt-1">
            Add your first tenant using the &quot;Add New Tenant&quot; button above.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Tenant</th>
                  <th className="px-4 py-3 font-semibold">Room</th>
                  <th className="px-4 py-3 font-semibold">Joined</th>
                  <th className="px-4 py-3 font-semibold">Monthly Rent</th>
                  <th className="px-4 py-3 font-semibold">Deposit</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTenants.map((tenant) => (
                  <tr key={tenant.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <div className="font-bold text-[#0B192C]">{tenant.fullName}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3" />
                        {tenant.phone}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2.5 py-1 rounded-lg bg-[#0B192C] text-white text-xs font-bold">
                        Room {tenant.roomNumber}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {formatDateIN(tenant.joiningDate)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-[#0B192C]">
                      {formatINR(tenant.monthlyRent)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatINR(tenant.securityDeposit)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={tenant.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setDetailTenant(tenant)}
                          title="View Details & History"
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-[#0B192C] cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(tenant)}
                          title="Edit Tenant"
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        {tenant.status === 'active' && (
                          <button
                            type="button"
                            onClick={() => setMoveOutTarget(tenant)}
                            title="Mark as Moved Out"
                            className="p-1.5 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-700 cursor-pointer"
                          >
                            <LogOut className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(tenant)}
                          title="Delete Tenant"
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

      {/* Add/Edit Tenant Modal */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingTenant ? `Edit Tenant — ${editingTenant.fullName}` : 'Add New Tenant'}
        maxWidthClass="max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Amit Sharma"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Phone Number *
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 9876543210"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Room Number *
              </label>
              <select
                value={roomNumber}
                onChange={(e) => {
                  setRoomNumber(e.target.value);
                  if (!editingTenant) {
                    const rm = rooms.find((r) => r.roomNumber === Number(e.target.value));
                    if (rm && rm.monthlyRent > 0) setMonthlyRent(String(rm.monthlyRent));
                  }
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
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
                Joining Date *
              </label>
              <input
                type="date"
                required
                value={joiningDate}
                onChange={(e) => setJoiningDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Monthly Rent (₹) *
              </label>
              <input
                type="number"
                required
                min={0}
                value={monthlyRent}
                onChange={(e) => setMonthlyRent(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Security Deposit (₹)
              </label>
              <input
                type="number"
                min={0}
                value={securityDeposit}
                onChange={(e) => setSecurityDeposit(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Emergency Contact
              </label>
              <input
                type="text"
                value={emergencyContact}
                onChange={(e) => setEmergencyContact(e.target.value)}
                placeholder="Parent / Guardian name & phone"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Address (Optional)
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Permanent home address"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ID Document Type (Optional)
              </label>
              <select
                value={idDocumentType}
                onChange={(e) => setIdDocumentType(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
              >
                <option value="Aadhaar">Aadhaar Card</option>
                <option value="PAN">PAN Card</option>
                <option value="Voter ID">Voter ID</option>
                <option value="Driving License">Driving License</option>
                <option value="Passport">Passport</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ID Document Number (Optional)
              </label>
              <input
                type="text"
                value={idDocumentNumber}
                onChange={(e) => setIdDocumentNumber(e.target.value)}
                placeholder="ID number / reference"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Workplace/college, preferences, or remarks..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
            />
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
              {editingTenant ? 'Save Changes' : 'Save Tenant'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Tenant Details, Payment History & Monthly Bill History Modal */}
      <Modal
        open={Boolean(detailTenant)}
        onClose={() => setDetailTenant(null)}
        title={detailTenant ? `${detailTenant.fullName} — Profile & History` : ''}
        maxWidthClass="max-w-2xl"
      >
        {detailTenant && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
              <div>
                <div className="text-slate-500">Room</div>
                <div className="font-bold text-[#0B192C] mt-0.5">
                  Room {detailTenant.roomNumber}
                </div>
              </div>
              <div>
                <div className="text-slate-500">Phone</div>
                <div className="font-bold text-[#0B192C] mt-0.5">{detailTenant.phone}</div>
              </div>
              <div>
                <div className="text-slate-500">Status</div>
                <div className="mt-0.5">
                  <StatusBadge status={detailTenant.status} />
                </div>
              </div>
              <div>
                <div className="text-slate-500">Joining Date</div>
                <div className="font-semibold mt-0.5">
                  {formatDateIN(detailTenant.joiningDate)}
                </div>
              </div>
              <div>
                <div className="text-slate-500">Monthly Rent</div>
                <div className="font-bold text-emerald-700 mt-0.5">
                  {formatINR(detailTenant.monthlyRent)}
                </div>
              </div>
              <div>
                <div className="text-slate-500">Security Deposit</div>
                <div className="font-bold text-[#0B192C] mt-0.5">
                  {formatINR(detailTenant.securityDeposit)}
                </div>
              </div>
              {detailTenant.emergencyContact && (
                <div className="col-span-2 sm:col-span-3">
                  <div className="text-slate-500">Emergency Contact</div>
                  <div className="font-medium mt-0.5">{detailTenant.emergencyContact}</div>
                </div>
              )}
              {detailTenant.address && (
                <div className="col-span-2 sm:col-span-3">
                  <div className="text-slate-500">Address</div>
                  <div className="font-medium mt-0.5">{detailTenant.address}</div>
                </div>
              )}
              {detailTenant.idDocumentNumber && (
                <div className="col-span-2 sm:col-span-3">
                  <div className="text-slate-500">ID Details</div>
                  <div className="font-medium mt-0.5">
                    {detailTenant.idDocumentType}: {detailTenant.idDocumentNumber}
                  </div>
                </div>
              )}
              {detailTenant.notes && (
                <div className="col-span-2 sm:col-span-3">
                  <div className="text-slate-500">Notes</div>
                  <div className="mt-0.5">{detailTenant.notes}</div>
                </div>
              )}
            </div>

            {tenantHistoryData.totalDue > 0 && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-rose-50 border border-rose-200">
                <span className="text-xs font-semibold text-rose-800">
                  Total Pending Balance: {formatINR(tenantHistoryData.totalDue)}
                </span>
                <a
                  href={buildWhatsAppReminderUrl({
                    phone: detailTenant.phone,
                    tenantName: detailTenant.fullName,
                    roomNumber: detailTenant.roomNumber,
                    pgName: settings.pgName || 'Das PG',
                    remainingDue: tenantHistoryData.totalDue,
                  })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  WhatsApp Reminder
                </a>
              </div>
            )}

            <div>
              <h4 className="text-xs font-bold uppercase text-slate-500 mb-2">
                Monthly Bill History
              </h4>
              {tenantHistoryData.tenantBills.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No monthly bills recorded yet.</p>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2">Month</th>
                        <th className="px-3 py-2">Total</th>
                        <th className="px-3 py-2">Paid</th>
                        <th className="px-3 py-2">Due</th>
                        <th className="px-3 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {tenantHistoryData.tenantBills.map((b) => (
                        <tr key={b.id}>
                          <td className="px-3 py-2 font-semibold">
                            {formatMonthLabel(b.billingMonth)}
                          </td>
                          <td className="px-3 py-2">{formatINR(b.totalPayable)}</td>
                          <td className="px-3 py-2 text-emerald-700">{formatINR(b.amountPaid)}</td>
                          <td className="px-3 py-2 text-rose-600 font-semibold">
                            {formatINR(b.remainingDue)}
                          </td>
                          <td className="px-3 py-2">
                            <StatusBadge status={b.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase text-slate-500 mb-2">Payment History</h4>
              {tenantHistoryData.tenantPayments.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No payments recorded yet.</p>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">Receipt</th>
                        <th className="px-3 py-2">Month</th>
                        <th className="px-3 py-2">Method</th>
                        <th className="px-3 py-2 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {tenantHistoryData.tenantPayments.map((p) => (
                        <tr key={p.id}>
                          <td className="px-3 py-2">{formatDateIN(p.paymentDate)}</td>
                          <td className="px-3 py-2 font-mono">{p.receiptNumber}</td>
                          <td className="px-3 py-2">{formatMonthLabel(p.billingMonth)}</td>
                          <td className="px-3 py-2">{p.method}</td>
                          <td className="px-3 py-2 text-right font-bold text-emerald-700">
                            {formatINR(p.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Mark Moved Out Confirm */}
      <ConfirmDialog
        open={Boolean(moveOutTarget)}
        onClose={() => setMoveOutTarget(null)}
        onConfirm={async () => {
          if (moveOutTarget) await markTenantMovedOut(moveOutTarget.id);
        }}
        title="Mark Tenant as Moved Out?"
        message={`Mark ${moveOutTarget?.fullName} as moved out from Room ${moveOutTarget?.roomNumber}? Their history will be preserved, and Room ${moveOutTarget?.roomNumber} will become Vacant if no other active tenants remain.`}
        confirmLabel="Mark Moved Out"
        variant="warning"
      />

      {/* Delete Tenant Confirm */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) await deleteTenant(deleteTarget.id);
        }}
        title="Delete Tenant Record?"
        message={`Are you sure you want to permanently delete ${deleteTarget?.fullName}? If you only want to vacate the room while keeping records, use "Mark Moved Out" instead.`}
        confirmLabel="Delete Permanently"
        variant="danger"
      />
    </div>
  );
};
