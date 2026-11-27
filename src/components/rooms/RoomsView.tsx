import React, { useMemo, useState } from 'react';
import {
  BedDouble,
  Edit3,
  UserPlus,
  History,
  Eye,
  Zap,
  Users,
  Search,
} from 'lucide-react';
import { usePG } from '../../context/PGContext';
import type { Room } from '../../types';
import { formatDateIN, formatINR, formatMonthLabel, getTodayISO } from '../../utils/format';
import { Modal } from '../ui/Modal';
import { StatusBadge } from '../ui/StatusBadge';

export const RoomsView: React.FC = () => {
  const {
    rooms,
    tenants,
    bills,
    roomHistory,
    selectedMonth,
    settings,
    updateRoom,
    addTenant,
    setBillElectricityForRoom,
  } = usePG();

  const [statusFilter, setStatusFilter] = useState<'all' | 'occupied' | 'vacant'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [editFloor, setEditFloor] = useState('');
  const [editCapacity, setEditCapacity] = useState('2');
  const [editRent, setEditRent] = useState('0');
  const [editStatus, setEditStatus] = useState<'occupied' | 'vacant'>('vacant');
  const [editNotes, setEditNotes] = useState('');

  const [detailsRoom, setDetailsRoom] = useState<Room | null>(null);
  const [assignRoomNumber, setAssignRoomNumber] = useState<number | null>(null);

  // Assign tenant quick form state
  const [tName, setTName] = useState('');
  const [tPhone, setTPhone] = useState('');
  const [tJoining, setTJoining] = useState(getTodayISO());
  const [tRent, setTRent] = useState('');
  const [tDeposit, setTDeposit] = useState('');
  const [tEmergency, setTEmergency] = useState('');
  const [tNotes, setTNotes] = useState('');

  // Quick electricity modal
  const [elecRoom, setElecRoom] = useState<number | null>(null);
  const [elecAmount, setElecAmount] = useState('');

  const enrichedRooms = useMemo(() => {
    return rooms.map((room) => {
      const activeTenants = tenants.filter(
        (t) => t.roomNumber === room.roomNumber && t.status === 'active'
      );
      const monthBill = bills.find(
        (b) => b.roomNumber === room.roomNumber && b.billingMonth === selectedMonth
      );
      const tenantRentSum = activeTenants.reduce((s, t) => s + (t.monthlyRent || 0), 0);
      const effectiveRent =
        monthBill?.rentAmount ?? (tenantRentSum > 0 ? tenantRentSum : room.monthlyRent);
      const electricity = monthBill?.electricityBill ?? 0;
      const totalMonthlyCharge = monthBill
        ? monthBill.totalPayable
        : effectiveRent + electricity;
      const paymentStatus = monthBill ? monthBill.status : ('no_bill' as const);

      return {
        room,
        activeTenants,
        monthBill,
        effectiveRent,
        electricity,
        totalMonthlyCharge,
        paymentStatus,
      };
    });
  }, [rooms, tenants, bills, selectedMonth]);

  const filteredRooms = useMemo(() => {
    return enrichedRooms.filter((item) => {
      if (statusFilter !== 'all' && item.room.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchRoom = `room ${item.room.roomNumber}`.includes(q);
        const matchTenant = item.activeTenants.some(
          (t) => t.fullName.toLowerCase().includes(q) || t.phone.includes(q)
        );
        return matchRoom || matchTenant;
      }
      return true;
    });
  }, [enrichedRooms, statusFilter, searchQuery]);

  const openEditRoom = (room: Room) => {
    setEditingRoom(room);
    setEditFloor(room.floor);
    setEditCapacity(String(room.capacity));
    setEditRent(String(room.monthlyRent));
    setEditStatus(room.status);
    setEditNotes(room.notes);
  };

  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoom) return;
    await updateRoom(editingRoom.roomNumber, {
      floor: editFloor.trim() || 'Ground Floor',
      capacity: Math.max(1, Number(editCapacity) || 1),
      monthlyRent: Math.max(0, Number(editRent) || 0),
      status: editStatus,
      notes: editNotes.trim(),
    });
    setEditingRoom(null);
  };

  const openAssignTenant = (room: Room) => {
    setAssignRoomNumber(room.roomNumber);
    setTName('');
    setTPhone('');
    setTJoining(getTodayISO());
    setTRent(String(room.monthlyRent || settings.defaultRent || 0));
    setTDeposit('0');
    setTEmergency('');
    setTNotes('');
  };

  const handleAssignTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignRoomNumber) return;
    await addTenant({
      fullName: tName.trim(),
      phone: tPhone.trim(),
      roomNumber: assignRoomNumber,
      joiningDate: tJoining,
      monthlyRent: Math.max(0, Number(tRent) || 0),
      securityDeposit: Math.max(0, Number(tDeposit) || 0),
      emergencyContact: tEmergency.trim(),
      address: '',
      idDocumentType: '',
      idDocumentNumber: '',
      notes: tNotes.trim(),
    });
    setAssignRoomNumber(null);
  };

  const handleSaveElec = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!elecRoom) return;
    await setBillElectricityForRoom(elecRoom, selectedMonth, Math.max(0, Number(elecAmount) || 0));
    setElecRoom(null);
  };

  return (
    <div className="space-y-5">
      {/* Header Controls */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-[#0B192C] text-emerald-400">
            <BedDouble className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#0B192C]">Rooms 1 to 10</h2>
            <p className="text-xs text-slate-500">
              {rooms.filter((r) => r.status === 'occupied').length} occupied •{' '}
              {rooms.filter((r) => r.status === 'vacant').length} vacant •{' '}
              {formatMonthLabel(selectedMonth)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 sm:w-56">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search room or tenant..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="flex rounded-xl border border-slate-200 p-0.5 bg-slate-50 text-xs font-semibold">
            {(['all', 'occupied', 'vacant'] as const).map((st) => (
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

      {/* Room Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredRooms.map(
          ({ room, activeTenants, monthBill, effectiveRent, electricity, totalMonthlyCharge, paymentStatus }) => (
            <div
              key={room.id}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow overflow-hidden flex flex-col"
            >
              <div className="px-4 py-3.5 bg-[#0B192C] text-white flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold">Room {room.roomNumber}</span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/15 text-slate-200">
                      {room.floor}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-300 mt-0.5">
                    Capacity: {room.capacity} bed(s) • {activeTenants.length} occupant(s)
                  </div>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    room.status === 'occupied'
                      ? 'bg-emerald-500 text-[#0B192C]'
                      : 'bg-white/15 text-emerald-300'
                  }`}
                >
                  {room.status === 'occupied' ? 'Occupied' : 'Vacant'}
                </span>
              </div>

              <div className="p-4 space-y-3 flex-1">
                <div>
                  <div className="text-[11px] font-semibold uppercase text-slate-400">
                    Tenant(s)
                  </div>
                  {activeTenants.length > 0 ? (
                    <div className="mt-1 space-y-1">
                      {activeTenants.map((t) => (
                        <div key={t.id} className="flex items-center justify-between text-sm">
                          <span className="font-semibold text-[#0B192C] flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-emerald-600" />
                            {t.fullName}
                          </span>
                          <span className="text-xs text-slate-500">{t.phone}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-slate-400 italic mt-0.5">No active tenant assigned</div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200/70 text-xs">
                  <div>
                    <div className="text-slate-500">Monthly Rent</div>
                    <div className="font-bold text-[#0B192C] mt-0.5">{formatINR(effectiveRent)}</div>
                  </div>
                  <div>
                    <div className="text-slate-500">Electricity</div>
                    <div className="font-bold text-amber-700 mt-0.5">{formatINR(electricity)}</div>
                  </div>
                  <div>
                    <div className="text-slate-500">Total Charge</div>
                    <div className="font-bold text-emerald-700 mt-0.5">
                      {formatINR(totalMonthlyCharge)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">Status ({selectedMonth}):</span>
                    <StatusBadge status={paymentStatus} />
                  </div>
                  {monthBill && monthBill.remainingDue > 0 && (
                    <span className="text-xs font-bold text-rose-600">
                      Due: {formatINR(monthBill.remainingDue)}
                    </span>
                  )}
                </div>
              </div>

              <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => openAssignTenant(room)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  {activeTenants.length > 0 ? 'Add Occupant' : 'Assign Tenant'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setElecRoom(room.roomNumber);
                    setElecAmount(String(electricity));
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5" />
                  Elec Bill
                </button>
                <button
                  type="button"
                  onClick={() => openEditRoom(room)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setDetailsRoom(room)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-[#0B192C] text-xs font-semibold ml-auto cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Details
                </button>
              </div>
            </div>
          )
        )}
      </div>

      {/* Edit Room Modal */}
      <Modal
        open={Boolean(editingRoom)}
        onClose={() => setEditingRoom(null)}
        title={`Edit Room ${editingRoom?.roomNumber ?? ''}`}
      >
        <form onSubmit={handleSaveRoom} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Floor</label>
              <input
                type="text"
                value={editFloor}
                onChange={(e) => setEditFloor(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Bed Capacity</label>
              <input
                type="number"
                min={1}
                max={10}
                value={editCapacity}
                onChange={(e) => setEditCapacity(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Monthly Rent (₹)
              </label>
              <input
                type="number"
                min={0}
                value={editRent}
                onChange={(e) => setEditRent(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Room Status</label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as 'occupied' | 'vacant')}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="vacant">Vacant</option>
                <option value="occupied">Occupied</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Room Notes</label>
            <textarea
              rows={2}
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              placeholder="e.g. Attached bathroom, AC, balcony..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setEditingRoom(null)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-[#0B192C] hover:bg-[#132B4A] text-white text-sm font-semibold cursor-pointer"
            >
              Save Room
            </button>
          </div>
        </form>
      </Modal>

      {/* Assign Tenant Modal */}
      <Modal
        open={assignRoomNumber !== null}
        onClose={() => setAssignRoomNumber(null)}
        title={`Assign Tenant to Room ${assignRoomNumber ?? ''}`}
        subtitle="Room will automatically be marked as Occupied"
      >
        <form onSubmit={handleAssignTenant} className="space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={tName}
                onChange={(e) => setTName(e.target.value)}
                placeholder="Tenant full name"
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
                value={tPhone}
                onChange={(e) => setTPhone(e.target.value)}
                placeholder="10-digit mobile number"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Joining Date *
              </label>
              <input
                type="date"
                required
                value={tJoining}
                onChange={(e) => setTJoining(e.target.value)}
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
                value={tRent}
                onChange={(e) => setTRent(e.target.value)}
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
                value={tDeposit}
                onChange={(e) => setTDeposit(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Emergency Contact
            </label>
            <input
              type="text"
              value={tEmergency}
              onChange={(e) => setTEmergency(e.target.value)}
              placeholder="Name & phone number"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Notes</label>
            <input
              type="text"
              value={tNotes}
              onChange={(e) => setTNotes(e.target.value)}
              placeholder="Optional notes"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setAssignRoomNumber(null)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold cursor-pointer"
            >
              Assign Tenant
            </button>
          </div>
        </form>
      </Modal>

      {/* Quick Electricity Entry Modal */}
      <Modal
        open={elecRoom !== null}
        onClose={() => setElecRoom(null)}
        title={`Electricity / Line Bill — Room ${elecRoom ?? ''}`}
        subtitle={`For ${formatMonthLabel(selectedMonth)}`}
        maxWidthClass="max-w-sm"
      >
        <form onSubmit={handleSaveElec} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Electricity / Line Bill Amount (₹)
            </label>
            <input
              type="number"
              min={0}
              required
              value={elecAmount}
              onChange={(e) => setElecAmount(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-base font-bold text-[#0B192C]"
            />
            <p className="text-[11px] text-slate-500 mt-1.5">
              Updates the existing bill for this month, or creates a new bill automatically if one
              doesn&apos;t exist yet.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setElecRoom(null)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold cursor-pointer"
            >
              Save Electricity Bill
            </button>
          </div>
        </form>
      </Modal>

      {/* Room Details & History Modal */}
      <Modal
        open={Boolean(detailsRoom)}
        onClose={() => setDetailsRoom(null)}
        title={`Room ${detailsRoom?.roomNumber ?? ''} Details & History`}
        maxWidthClass="max-w-2xl"
      >
        {detailsRoom && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
              <div>
                <div className="text-slate-500">Status</div>
                <div className="mt-1">
                  <StatusBadge status={detailsRoom.status} />
                </div>
              </div>
              <div>
                <div className="text-slate-500">Floor</div>
                <div className="font-bold text-[#0B192C] mt-1">{detailsRoom.floor}</div>
              </div>
              <div>
                <div className="text-slate-500">Capacity</div>
                <div className="font-bold text-[#0B192C] mt-1">{detailsRoom.capacity} Bed(s)</div>
              </div>
              <div>
                <div className="text-slate-500">Base Rent</div>
                <div className="font-bold text-emerald-700 mt-1">
                  {formatINR(detailsRoom.monthlyRent)}
                </div>
              </div>
            </div>

            {detailsRoom.notes && (
              <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="font-semibold">Notes:</span> {detailsRoom.notes}
              </div>
            )}

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Current Occupants
              </h4>
              {tenants.filter((t) => t.roomNumber === detailsRoom.roomNumber && t.status === 'active')
                .length === 0 ? (
                <p className="text-xs text-slate-500 italic">Currently vacant.</p>
              ) : (
                <div className="space-y-2">
                  {tenants
                    .filter((t) => t.roomNumber === detailsRoom.roomNumber && t.status === 'active')
                    .map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center justify-between p-3 rounded-xl border border-slate-200 text-sm"
                      >
                        <div>
                          <div className="font-bold text-[#0B192C]">{t.fullName}</div>
                          <div className="text-xs text-slate-500">
                            {t.phone} • Joined {formatDateIN(t.joiningDate)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-emerald-700">
                            {formatINR(t.monthlyRent)}/mo
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Deposit: {formatINR(t.securityDeposit)}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5" />
                Room History
              </h4>
              {roomHistory.filter((h) => h.roomNumber === detailsRoom.roomNumber).length === 0 ? (
                <p className="text-xs text-slate-500 italic">No room activity recorded yet.</p>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {roomHistory
                    .filter((h) => h.roomNumber === detailsRoom.roomNumber)
                    .map((entry) => (
                      <div
                        key={entry.id}
                        className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs flex items-start justify-between gap-2"
                      >
                        <span className="text-slate-700 font-medium">{entry.description}</span>
                        <span className="text-[11px] text-slate-400 shrink-0">
                          {formatDateIN(entry.date)}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
