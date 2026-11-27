import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';
import { createDefaultSettings, createInitialRooms, dbService } from '../services/db';
import { downloadJSON } from '../services/export';
import type {
  AdminAccount,
  Expense,
  FullBackupData,
  MonthlyBill,
  PGSettings,
  Payment,
  PaymentMethod,
  Room,
  RoomHistoryEntry,
  Tenant,
} from '../types';
import { generateSalt, hashPassword, verifyPassword } from '../utils/crypto';
import {
  buildDueDateForMonth,
  computeBillTotals,
  generateId,
  getCurrentMonthKey,
  getTodayISO,
} from '../utils/format';

type AuthStatus = 'loading' | 'needs_setup' | 'unauthenticated' | 'authenticated';

interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  text: string;
}

interface PGContextValue {
  isLoading: boolean;
  authStatus: AuthStatus;
  authMode: 'local' | 'supabase';
  adminProfile: { name: string; email: string } | null;
  settings: PGSettings;
  rooms: Room[];
  roomHistory: RoomHistoryEntry[];
  tenants: Tenant[];
  bills: MonthlyBill[];
  payments: Payment[];
  expenses: Expense[];
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  toasts: ToastMessage[];
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
  dismissToast: (id: string) => void;

  // Auth
  createAdminAccount: (name: string, email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  changeAdminCredentials: (params: {
    currentPassword: string;
    newPassword?: string;
    name: string;
    email: string;
  }) => Promise<void>;

  // Rooms
  updateRoom: (roomNumber: number, patch: Partial<Omit<Room, 'id' | 'roomNumber'>>) => Promise<void>;
  bulkApplyDefaultRent: (rent: number) => Promise<void>;

  // Tenants
  addTenant: (input: Omit<Tenant, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => Promise<Tenant>;
  updateTenant: (id: string, patch: Partial<Omit<Tenant, 'id' | 'createdAt'>>) => Promise<void>;
  markTenantMovedOut: (id: string, moveOutDate?: string) => Promise<void>;
  deleteTenant: (id: string) => Promise<void>;

  // Bills
  getPreviousDueForRoom: (roomNumber: number, billingMonth: string) => number;
  createBill: (input: {
    roomNumber: number;
    billingMonth: string;
    rentAmount: number;
    electricityBill: number;
    otherCharges: number;
    otherChargesNote: string;
    previousDue: number;
    dueDate?: string;
    notes?: string;
  }) => Promise<MonthlyBill>;
  updateBill: (
    id: string,
    patch: Partial<{
      rentAmount: number;
      electricityBill: number;
      otherCharges: number;
      otherChargesNote: string;
      previousDue: number;
      dueDate: string;
      notes: string;
      tenantNames: string;
    }>
  ) => Promise<void>;
  generateMonthlyBills: (
    billingMonth: string,
    electricityOverrides?: Record<number, number>
  ) => Promise<{ createdCount: number; skippedCount: number }>;
  setBillElectricityForRoom: (
    roomNumber: number,
    billingMonth: string,
    electricityAmount: number
  ) => Promise<MonthlyBill>;
  deleteBill: (id: string) => Promise<void>;

  // Payments
  recordPayment: (input: {
    roomNumber: number;
    tenantId: string;
    tenantName: string;
    billingMonth: string;
    paymentDate: string;
    amount: number;
    method: PaymentMethod;
    transactionId?: string;
    notes?: string;
    billId?: string;
  }) => Promise<Payment>;
  deletePayment: (id: string) => Promise<void>;

  // Expenses
  addExpense: (input: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Expense>;
  updateExpense: (id: string, patch: Partial<Omit<Expense, 'id' | 'createdAt'>>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;

  // Settings & Backup
  updateSettings: (patch: Partial<Omit<PGSettings, 'id'>>) => Promise<void>;
  exportBackup: () => void;
  restoreBackup: (jsonText: string) => Promise<void>;
  resetAllData: () => Promise<void>;
}

const SESSION_KEY = 'das_pg_admin_session_v1';

const PGContext = createContext<PGContextValue | null>(null);

export const PGProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading');
  const [adminAccount, setAdminAccount] = useState<AdminAccount | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<{ name: string; email: string } | null>(null);

  const [settings, setSettings] = useState<PGSettings>(createDefaultSettings);
  const [rooms, setRooms] = useState<Room[]>(createInitialRooms);
  const [roomHistory, setRoomHistory] = useState<RoomHistoryEntry[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [bills, setBills] = useState<MonthlyBill[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonthKey);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const authMode: 'local' | 'supabase' = isSupabaseConfigured ? 'supabase' : 'local';

  const showToast = useCallback((text: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = generateId('toast');
    setToasts((prev) => [...prev, { id, type, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3600);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const loadAllData = useCallback(async () => {
    const data = await dbService.initialize();
    setSettings(data.settings);
    setRooms(data.rooms);
    setRoomHistory(data.roomHistory);
    setTenants(data.tenants);
    setBills(data.bills);
    setPayments(data.payments);
    setExpenses(data.expenses);
  }, []);

  useEffect(() => {
    let mounted = true;
    async function boot() {
      try {
        await loadAllData();
        if (isSupabaseConfigured) {
          const client = getSupabaseClient();
          if (client) {
            const { data } = await client.auth.getUser();
            if (mounted && data.user) {
              setSupabaseUser({
                email: data.user.email || 'admin@daspg.in',
                name: (data.user.user_metadata?.name as string) || 'Admin',
              });
              setAuthStatus('authenticated');
            } else if (mounted) {
              setAuthStatus('unauthenticated');
            }
          }
        } else {
          const existingAdmin = await dbService.getAdminAccount();
          if (!mounted) return;
          setAdminAccount(existingAdmin);
          if (!existingAdmin) {
            setAuthStatus('needs_setup');
          } else {
            const rawSession = localStorage.getItem(SESSION_KEY);
            if (rawSession) {
              try {
                const parsed = JSON.parse(rawSession) as { email?: string; token?: string };
                if (parsed.email === existingAdmin.email && parsed.token) {
                  setAuthStatus('authenticated');
                } else {
                  setAuthStatus('unauthenticated');
                }
              } catch {
                setAuthStatus('unauthenticated');
              }
            } else {
              setAuthStatus('unauthenticated');
            }
          }
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    boot();
    return () => {
      mounted = false;
    };
  }, [loadAllData]);

  // Auth implementations
  const createAdminAccount = useCallback(
    async (name: string, email: string, password: string) => {
      const cleanName = name.trim();
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanName || !cleanEmail || password.length < 6) {
        throw new Error('Please enter your name, valid email/username, and a password of at least 6 characters.');
      }

      if (isSupabaseConfigured) {
        const client = getSupabaseClient();
        if (!client) throw new Error('Supabase client unavailable');
        const { data, error } = await client.auth.signUp({
          email: cleanEmail,
          password,
          options: { data: { name: cleanName } },
        });
        if (error) throw new Error(error.message);
        if (data.user) {
          setSupabaseUser({ name: cleanName, email: cleanEmail });
          setAuthStatus('authenticated');
        }
        return;
      }

      const salt = generateSalt();
      const passwordHash = await hashPassword(password, salt);
      const now = new Date().toISOString();
      const account: AdminAccount = {
        id: 'admin',
        name: cleanName,
        email: cleanEmail,
        passwordHash,
        salt,
        createdAt: now,
        updatedAt: now,
      };
      await dbService.saveAdminAccount(account);
      setAdminAccount(account);
      localStorage.setItem(
        SESSION_KEY,
        JSON.stringify({ email: cleanEmail, token: generateSalt(12), loggedInAt: now })
      );
      setAuthStatus('authenticated');
      showToast('Admin account created! Welcome to Das PG Management.');
    },
    [showToast]
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const cleanEmail = email.trim().toLowerCase();
      if (isSupabaseConfigured) {
        const client = getSupabaseClient();
        if (!client) throw new Error('Supabase client unavailable');
        const { data, error } = await client.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
        if (error) throw new Error(error.message);
        setSupabaseUser({
          email: data.user.email || cleanEmail,
          name: (data.user.user_metadata?.name as string) || 'Admin',
        });
        setAuthStatus('authenticated');
        return;
      }

      const stored = adminAccount || (await dbService.getAdminAccount());
      if (!stored) {
        setAuthStatus('needs_setup');
        throw new Error('No admin account found. Please set up your admin account.');
      }
      if (stored.email.toLowerCase() !== cleanEmail) {
        throw new Error('Invalid email or username.');
      }
      const ok = await verifyPassword(password, stored.salt, stored.passwordHash);
      if (!ok) {
        throw new Error('Incorrect password. Please try again.');
      }
      localStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
          email: stored.email,
          token: generateSalt(12),
          loggedInAt: new Date().toISOString(),
        })
      );
      setAuthStatus('authenticated');
    },
    [adminAccount]
  );

  const logout = useCallback(async () => {
    if (isSupabaseConfigured) {
      const client = getSupabaseClient();
      if (client) await client.auth.signOut();
      setSupabaseUser(null);
    }
    localStorage.removeItem(SESSION_KEY);
    setAuthStatus('unauthenticated');
  }, []);

  const changeAdminCredentials = useCallback(
    async (params: {
      currentPassword: string;
      newPassword?: string;
      name: string;
      email: string;
    }) => {
      if (isSupabaseConfigured) {
        const client = getSupabaseClient();
        if (!client) throw new Error('Supabase client unavailable');
        const updatePayload: { password?: string; data: { name: string } } = {
          data: { name: params.name.trim() },
        };
        if (params.newPassword) {
          if (params.newPassword.length < 6) {
            throw new Error('New password must be at least 6 characters.');
          }
          updatePayload.password = params.newPassword;
        }
        const { error } = await client.auth.updateUser(updatePayload);
        if (error) throw new Error(error.message);
        setSupabaseUser({ name: params.name.trim(), email: params.email.trim() });
        showToast('Admin profile updated.');
        return;
      }

      const stored = adminAccount || (await dbService.getAdminAccount());
      if (!stored) throw new Error('Admin account not found.');
      const valid = await verifyPassword(params.currentPassword, stored.salt, stored.passwordHash);
      if (!valid) throw new Error('Current password is incorrect.');

      let nextSalt = stored.salt;
      let nextHash = stored.passwordHash;
      if (params.newPassword && params.newPassword.length > 0) {
        if (params.newPassword.length < 6) {
          throw new Error('New password must be at least 6 characters.');
        }
        nextSalt = generateSalt();
        nextHash = await hashPassword(params.newPassword, nextSalt);
      }

      const updated: AdminAccount = {
        ...stored,
        name: params.name.trim() || stored.name,
        email: params.email.trim().toLowerCase() || stored.email,
        salt: nextSalt,
        passwordHash: nextHash,
        updatedAt: new Date().toISOString(),
      };
      await dbService.saveAdminAccount(updated);
      setAdminAccount(updated);
      localStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
          email: updated.email,
          token: generateSalt(12),
          loggedInAt: new Date().toISOString(),
        })
      );
      showToast('Admin credentials updated successfully.');
    },
    [adminAccount, showToast]
  );

  const appendRoomHistory = useCallback(
    async (entry: Omit<RoomHistoryEntry, 'id' | 'date'> & { date?: string }) => {
      const full: RoomHistoryEntry = {
        ...entry,
        id: generateId('rh'),
        date: entry.date || new Date().toISOString(),
      };
      await dbService.addRoomHistory(full);
      setRoomHistory((prev) => [full, ...prev]);
    },
    []
  );

  // Room methods
  const updateRoom = useCallback(
    async (roomNumber: number, patch: Partial<Omit<Room, 'id' | 'roomNumber'>>) => {
      const existing = rooms.find((r) => r.roomNumber === roomNumber);
      if (!existing) return;
      const updated: Room = {
        ...existing,
        ...patch,
        updatedAt: new Date().toISOString(),
      };
      await dbService.saveRoom(updated);
      setRooms((prev) =>
        prev.map((r) => (r.roomNumber === roomNumber ? updated : r)).sort((a, b) => a.roomNumber - b.roomNumber)
      );

      if (typeof patch.monthlyRent === 'number' && patch.monthlyRent !== existing.monthlyRent) {
        await appendRoomHistory({
          roomNumber,
          type: 'rent_changed',
          description: `Room ${roomNumber} monthly rent changed from ₹${existing.monthlyRent} to ₹${patch.monthlyRent}.`,
          amount: patch.monthlyRent,
        });
      }
      if (patch.status && patch.status !== existing.status) {
        await appendRoomHistory({
          roomNumber,
          type: 'status_changed',
          description: `Room ${roomNumber} marked as ${patch.status}.`,
        });
      }
      showToast(`Room ${roomNumber} updated.`);
    },
    [rooms, appendRoomHistory, showToast]
  );

  const bulkApplyDefaultRent = useCallback(
    async (rent: number) => {
      const now = new Date().toISOString();
      const updatedRooms = rooms.map((r) => ({ ...r, monthlyRent: rent, updatedAt: now }));
      await Promise.all(updatedRooms.map((r) => dbService.saveRoom(r)));
      setRooms(updatedRooms);
      showToast(`Applied default rent to all 10 rooms.`);
    },
    [rooms, showToast]
  );

  const syncRoomStatusFromTenants = useCallback(
    async (roomNumber: number, nextTenantsList: Tenant[]) => {
      const room = rooms.find((r) => r.roomNumber === roomNumber);
      if (!room) return;
      const activeCount = nextTenantsList.filter(
        (t) => t.roomNumber === roomNumber && t.status === 'active'
      ).length;
      const nextStatus = activeCount > 0 ? 'occupied' : 'vacant';
      if (room.status !== nextStatus) {
        const updatedRoom: Room = {
          ...room,
          status: nextStatus,
          updatedAt: new Date().toISOString(),
        };
        await dbService.saveRoom(updatedRoom);
        setRooms((prev) => prev.map((r) => (r.roomNumber === roomNumber ? updatedRoom : r)));
      }
    },
    [rooms]
  );

  // Tenant methods
  const addTenant = useCallback(
    async (input: Omit<Tenant, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => {
      const now = new Date().toISOString();
      const newTenant: Tenant = {
        ...input,
        id: generateId('ten'),
        status: 'active',
        createdAt: now,
        updatedAt: now,
      };
      await dbService.saveTenant(newTenant);
      const nextTenants = [...tenants, newTenant];
      setTenants(nextTenants);
      await syncRoomStatusFromTenants(newTenant.roomNumber, nextTenants);
      await appendRoomHistory({
        roomNumber: newTenant.roomNumber,
        type: 'tenant_assigned',
        description: `${newTenant.fullName} joined Room ${newTenant.roomNumber}.`,
        tenantId: newTenant.id,
        tenantName: newTenant.fullName,
        amount: newTenant.monthlyRent,
      });
      showToast(`${newTenant.fullName} added to Room ${newTenant.roomNumber}.`);
      return newTenant;
    },
    [tenants, syncRoomStatusFromTenants, appendRoomHistory, showToast]
  );

  const updateTenant = useCallback(
    async (id: string, patch: Partial<Omit<Tenant, 'id' | 'createdAt'>>) => {
      const existing = tenants.find((t) => t.id === id);
      if (!existing) return;
      const updated: Tenant = {
        ...existing,
        ...patch,
        updatedAt: new Date().toISOString(),
      };
      await dbService.saveTenant(updated);
      const nextTenants = tenants.map((t) => (t.id === id ? updated : t));
      setTenants(nextTenants);

      if (existing.roomNumber !== updated.roomNumber) {
        await syncRoomStatusFromTenants(existing.roomNumber, nextTenants);
        await syncRoomStatusFromTenants(updated.roomNumber, nextTenants);
        await appendRoomHistory({
          roomNumber: existing.roomNumber,
          type: 'tenant_moved_out',
          description: `${updated.fullName} shifted from Room ${existing.roomNumber} to Room ${updated.roomNumber}.`,
          tenantId: updated.id,
          tenantName: updated.fullName,
        });
        await appendRoomHistory({
          roomNumber: updated.roomNumber,
          type: 'tenant_assigned',
          description: `${updated.fullName} shifted into Room ${updated.roomNumber}.`,
          tenantId: updated.id,
          tenantName: updated.fullName,
        });
      } else if (existing.status !== updated.status) {
        await syncRoomStatusFromTenants(updated.roomNumber, nextTenants);
      }
      showToast(`Updated ${updated.fullName}'s details.`);
    },
    [tenants, syncRoomStatusFromTenants, appendRoomHistory, showToast]
  );

  const markTenantMovedOut = useCallback(
    async (id: string, moveOutDate = getTodayISO()) => {
      const existing = tenants.find((t) => t.id === id);
      if (!existing) return;
      const updated: Tenant = {
        ...existing,
        status: 'moved_out',
        moveOutDate,
        updatedAt: new Date().toISOString(),
      };
      await dbService.saveTenant(updated);
      const nextTenants = tenants.map((t) => (t.id === id ? updated : t));
      setTenants(nextTenants);
      await syncRoomStatusFromTenants(existing.roomNumber, nextTenants);
      await appendRoomHistory({
        roomNumber: existing.roomNumber,
        type: 'tenant_moved_out',
        description: `${existing.fullName} marked as moved out on ${moveOutDate}.`,
        tenantId: existing.id,
        tenantName: existing.fullName,
      });
      showToast(`${existing.fullName} marked as moved out.`);
    },
    [tenants, syncRoomStatusFromTenants, appendRoomHistory, showToast]
  );

  const deleteTenant = useCallback(
    async (id: string) => {
      const existing = tenants.find((t) => t.id === id);
      if (!existing) return;
      await dbService.deleteTenant(id);
      const nextTenants = tenants.filter((t) => t.id !== id);
      setTenants(nextTenants);
      await syncRoomStatusFromTenants(existing.roomNumber, nextTenants);
      showToast(`${existing.fullName} removed.`);
    },
    [tenants, syncRoomStatusFromTenants, showToast]
  );

  // Billing helpers
  const getPreviousDueForRoom = useCallback(
    (roomNumber: number, billingMonth: string): number => {
      const priorBills = bills
        .filter((b) => b.roomNumber === roomNumber && b.billingMonth < billingMonth)
        .sort((a, b) => b.billingMonth.localeCompare(a.billingMonth));
      if (priorBills.length === 0) return 0;
      return Math.max(0, priorBills[0].remainingDue);
    },
    [bills]
  );

  const recalculateBillWithPayments = useCallback(
    async (bill: MonthlyBill, allPayments: Payment[]): Promise<MonthlyBill> => {
      const linked = allPayments.filter(
        (p) =>
          p.billId === bill.id ||
          (!p.billId && p.roomNumber === bill.roomNumber && p.billingMonth === bill.billingMonth)
      );
      const paidSum = linked.reduce((sum, p) => sum + p.amount, 0);
      const computed = computeBillTotals({
        rentAmount: bill.rentAmount,
        electricityBill: bill.electricityBill,
        otherCharges: bill.otherCharges,
        previousDue: bill.previousDue,
        amountPaid: paidSum,
      });
      const updated: MonthlyBill = {
        ...bill,
        amountPaid: paidSum,
        totalPayable: computed.totalPayable,
        remainingDue: computed.remainingDue,
        status: computed.status,
        updatedAt: new Date().toISOString(),
      };
      await dbService.saveBill(updated);
      return updated;
    },
    []
  );

  const createBill = useCallback(
    async (input: {
      roomNumber: number;
      billingMonth: string;
      rentAmount: number;
      electricityBill: number;
      otherCharges: number;
      otherChargesNote: string;
      previousDue: number;
      dueDate?: string;
      notes?: string;
    }) => {
      const duplicate = bills.find(
        (b) => b.roomNumber === input.roomNumber && b.billingMonth === input.billingMonth
      );
      if (duplicate) {
        throw new Error(
          `A bill for Room ${input.roomNumber} (${input.billingMonth}) already exists. Edit the existing bill instead.`
        );
      }

      const activeInRoom = tenants.filter(
        (t) => t.roomNumber === input.roomNumber && t.status === 'active'
      );
      const tenantIds = activeInRoom.map((t) => t.id);
      const tenantNames =
        activeInRoom.length > 0
          ? activeInRoom.map((t) => t.fullName).join(', ')
          : `Room ${input.roomNumber} (Vacant)`;

      const existingPayments = payments.filter(
        (p) => p.roomNumber === input.roomNumber && p.billingMonth === input.billingMonth
      );
      const paidSum = existingPayments.reduce((sum, p) => sum + p.amount, 0);

      const computed = computeBillTotals({
        rentAmount: input.rentAmount,
        electricityBill: input.electricityBill,
        otherCharges: input.otherCharges,
        previousDue: input.previousDue,
        amountPaid: paidSum,
      });

      const now = new Date().toISOString();
      const bill: MonthlyBill = {
        id: generateId('bill'),
        roomNumber: input.roomNumber,
        billingMonth: input.billingMonth,
        tenantIds,
        tenantNames,
        rentAmount: Math.max(0, input.rentAmount),
        electricityBill: Math.max(0, input.electricityBill),
        otherCharges: Math.max(0, input.otherCharges),
        otherChargesNote: input.otherChargesNote || '',
        previousDue: Math.max(0, input.previousDue),
        totalPayable: computed.totalPayable,
        amountPaid: paidSum,
        remainingDue: computed.remainingDue,
        status: computed.status,
        dueDate: input.dueDate || buildDueDateForMonth(input.billingMonth, settings.defaultBillingDay),
        notes: input.notes || '',
        createdAt: now,
        updatedAt: now,
      };

      await dbService.saveBill(bill);
      // Link any unlinked payments for same room & month
      for (const p of existingPayments) {
        if (!p.billId) {
          const linkedP = { ...p, billId: bill.id };
          await dbService.savePayment(linkedP);
        }
      }
      setPayments((prev) =>
        prev.map((p) =>
          !p.billId && p.roomNumber === input.roomNumber && p.billingMonth === input.billingMonth
            ? { ...p, billId: bill.id }
            : p
        )
      );
      setBills((prev) => [bill, ...prev]);
      showToast(`Bill created for Room ${input.roomNumber}.`);
      return bill;
    },
    [bills, tenants, payments, settings.defaultBillingDay, showToast]
  );

  const updateBill = useCallback(
    async (
      id: string,
      patch: Partial<{
        rentAmount: number;
        electricityBill: number;
        otherCharges: number;
        otherChargesNote: string;
        previousDue: number;
        dueDate: string;
        notes: string;
        tenantNames: string;
      }>
    ) => {
      const existing = bills.find((b) => b.id === id);
      if (!existing) return;
      const merged: MonthlyBill = {
        ...existing,
        ...patch,
      };
      const updated = await recalculateBillWithPayments(merged, payments);
      setBills((prev) => prev.map((b) => (b.id === id ? updated : b)));
      showToast(`Bill for Room ${updated.roomNumber} updated.`);
    },
    [bills, payments, recalculateBillWithPayments, showToast]
  );

  const generateMonthlyBills = useCallback(
    async (billingMonth: string, electricityOverrides: Record<number, number> = {}) => {
      let createdCount = 0;
      let skippedCount = 0;
      const newBills: MonthlyBill[] = [];

      for (const room of rooms) {
        const activeInRoom = tenants.filter(
          (t) => t.roomNumber === room.roomNumber && t.status === 'active'
        );
        if (room.status !== 'occupied' && activeInRoom.length === 0) {
          continue;
        }
        const exists = bills.some(
          (b) => b.roomNumber === room.roomNumber && b.billingMonth === billingMonth
        );
        if (exists) {
          skippedCount++;
          continue;
        }

        const tenantRentSum = activeInRoom.reduce((sum, t) => sum + (t.monthlyRent || 0), 0);
        const rentAmount = tenantRentSum > 0 ? tenantRentSum : room.monthlyRent || settings.defaultRent || 0;
        const electricityBill = Math.max(0, electricityOverrides[room.roomNumber] ?? 0);
        const previousDue = getPreviousDueForRoom(room.roomNumber, billingMonth);

        const existingPayments = payments.filter(
          (p) => p.roomNumber === room.roomNumber && p.billingMonth === billingMonth
        );
        const paidSum = existingPayments.reduce((sum, p) => sum + p.amount, 0);
        const computed = computeBillTotals({
          rentAmount,
          electricityBill,
          otherCharges: 0,
          previousDue,
          amountPaid: paidSum,
        });

        const now = new Date().toISOString();
        const bill: MonthlyBill = {
          id: generateId('bill'),
          roomNumber: room.roomNumber,
          billingMonth,
          tenantIds: activeInRoom.map((t) => t.id),
          tenantNames:
            activeInRoom.length > 0
              ? activeInRoom.map((t) => t.fullName).join(', ')
              : `Room ${room.roomNumber}`,
          rentAmount,
          electricityBill,
          otherCharges: 0,
          otherChargesNote: '',
          previousDue,
          totalPayable: computed.totalPayable,
          amountPaid: paidSum,
          remainingDue: computed.remainingDue,
          status: computed.status,
          dueDate: buildDueDateForMonth(billingMonth, settings.defaultBillingDay),
          notes: '',
          createdAt: now,
          updatedAt: now,
        };
        await dbService.saveBill(bill);
        newBills.push(bill);
        createdCount++;
      }

      if (newBills.length > 0) {
        setBills((prev) => [...newBills, ...prev]);
      }
      if (createdCount > 0) {
        showToast(`Generated ${createdCount} bill(s).${skippedCount ? ` Skipped ${skippedCount} existing.` : ''}`);
      } else if (skippedCount > 0) {
        showToast(`All ${skippedCount} occupied room(s) already have bills for this month.`, 'info');
      } else {
        showToast('No occupied rooms found to generate bills for.', 'info');
      }
      return { createdCount, skippedCount };
    },
    [rooms, tenants, bills, payments, settings.defaultRent, settings.defaultBillingDay, getPreviousDueForRoom, showToast]
  );

  const setBillElectricityForRoom = useCallback(
    async (roomNumber: number, billingMonth: string, electricityAmount: number) => {
      const existing = bills.find(
        (b) => b.roomNumber === roomNumber && b.billingMonth === billingMonth
      );
      if (existing) {
        const merged = { ...existing, electricityBill: Math.max(0, electricityAmount) };
        const updated = await recalculateBillWithPayments(merged, payments);
        setBills((prev) => prev.map((b) => (b.id === existing.id ? updated : b)));
        return updated;
      }

      const room = rooms.find((r) => r.roomNumber === roomNumber);
      const activeInRoom = tenants.filter(
        (t) => t.roomNumber === roomNumber && t.status === 'active'
      );
      const tenantRentSum = activeInRoom.reduce((sum, t) => sum + (t.monthlyRent || 0), 0);
      const rentAmount = tenantRentSum > 0 ? tenantRentSum : room?.monthlyRent || settings.defaultRent || 0;
      const previousDue = getPreviousDueForRoom(roomNumber, billingMonth);

      return createBill({
        roomNumber,
        billingMonth,
        rentAmount,
        electricityBill: Math.max(0, electricityAmount),
        otherCharges: 0,
        otherChargesNote: '',
        previousDue,
      });
    },
    [bills, rooms, tenants, payments, settings.defaultRent, getPreviousDueForRoom, recalculateBillWithPayments, createBill]
  );

  const deleteBill = useCallback(
    async (id: string) => {
      await dbService.deleteBill(id);
      setBills((prev) => prev.filter((b) => b.id !== id));
      showToast('Bill deleted.');
    },
    [showToast]
  );

  // Payments
  const recordPayment = useCallback(
    async (input: {
      roomNumber: number;
      tenantId: string;
      tenantName: string;
      billingMonth: string;
      paymentDate: string;
      amount: number;
      method: PaymentMethod;
      transactionId?: string;
      notes?: string;
      billId?: string;
    }) => {
      if (input.amount <= 0) {
        throw new Error('Payment amount must be greater than ₹0.');
      }

      const matchingBill =
        (input.billId ? bills.find((b) => b.id === input.billId) : undefined) ||
        bills.find(
          (b) => b.roomNumber === input.roomNumber && b.billingMonth === input.billingMonth
        );

      const monthCompact = input.billingMonth.replace('-', '');
      const countInMonth =
        payments.filter((p) => p.billingMonth === input.billingMonth).length + 1;
      const receiptNumber = `DPG-${monthCompact}-${String(countInMonth).padStart(3, '0')}-${Math.floor(
        10 + Math.random() * 89
      )}`;

      const payment: Payment = {
        id: generateId('pay'),
        receiptNumber,
        billId: matchingBill?.id,
        tenantId: input.tenantId,
        tenantName: input.tenantName,
        roomNumber: input.roomNumber,
        paymentDate: input.paymentDate,
        billingMonth: input.billingMonth,
        amount: input.amount,
        method: input.method,
        transactionId: input.transactionId?.trim() || '',
        notes: input.notes?.trim() || '',
        createdAt: new Date().toISOString(),
      };

      await dbService.savePayment(payment);
      const nextPayments = [payment, ...payments];
      setPayments(nextPayments);

      if (matchingBill) {
        const updatedBill = await recalculateBillWithPayments(matchingBill, nextPayments);
        setBills((prev) => prev.map((b) => (b.id === matchingBill.id ? updatedBill : b)));
      }

      showToast(`Payment of ₹${input.amount.toLocaleString('en-IN')} recorded (${receiptNumber}).`);
      return payment;
    },
    [bills, payments, recalculateBillWithPayments, showToast]
  );

  const deletePayment = useCallback(
    async (id: string) => {
      const target = payments.find((p) => p.id === id);
      if (!target) return;
      await dbService.deletePayment(id);
      const nextPayments = payments.filter((p) => p.id !== id);
      setPayments(nextPayments);

      const linkedBill = bills.find(
        (b) =>
          b.id === target.billId ||
          (b.roomNumber === target.roomNumber && b.billingMonth === target.billingMonth)
      );
      if (linkedBill) {
        const updatedBill = await recalculateBillWithPayments(linkedBill, nextPayments);
        setBills((prev) => prev.map((b) => (b.id === linkedBill.id ? updatedBill : b)));
      }
      showToast('Payment record deleted.');
    },
    [payments, bills, recalculateBillWithPayments, showToast]
  );

  // Expenses
  const addExpense = useCallback(
    async (input: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => {
      const now = new Date().toISOString();
      const expense: Expense = {
        ...input,
        id: generateId('exp'),
        createdAt: now,
        updatedAt: now,
      };
      await dbService.saveExpense(expense);
      setExpenses((prev) => [expense, ...prev]);
      showToast(`Expense "${expense.title}" added.`);
      return expense;
    },
    [showToast]
  );

  const updateExpense = useCallback(
    async (id: string, patch: Partial<Omit<Expense, 'id' | 'createdAt'>>) => {
      const existing = expenses.find((e) => e.id === id);
      if (!existing) return;
      const updated: Expense = {
        ...existing,
        ...patch,
        updatedAt: new Date().toISOString(),
      };
      await dbService.saveExpense(updated);
      setExpenses((prev) => prev.map((e) => (e.id === id ? updated : e)));
      showToast(`Expense updated.`);
    },
    [expenses, showToast]
  );

  const deleteExpense = useCallback(
    async (id: string) => {
      await dbService.deleteExpense(id);
      setExpenses((prev) => prev.filter((e) => e.id !== id));
      showToast('Expense deleted.');
    },
    [showToast]
  );

  // Settings & Backup
  const updateSettings = useCallback(
    async (patch: Partial<Omit<PGSettings, 'id'>>) => {
      const updated: PGSettings = {
        ...settings,
        ...patch,
        id: 'default',
        updatedAt: new Date().toISOString(),
      };
      await dbService.saveSettings(updated);
      setSettings(updated);
      showToast('Settings saved.');
    },
    [settings, showToast]
  );

  const exportBackup = useCallback(() => {
    const payload: FullBackupData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      app: 'Das PG Management',
      settings,
      rooms,
      roomHistory,
      tenants,
      bills,
      payments,
      expenses,
    };
    const stamp = getTodayISO();
    downloadJSON(`das-pg-backup-${stamp}.json`, payload);
    showToast('Backup file downloaded.');
  }, [settings, rooms, roomHistory, tenants, bills, payments, expenses, showToast]);

  const restoreBackup = useCallback(
    async (jsonText: string) => {
      let parsed: FullBackupData;
      try {
        parsed = JSON.parse(jsonText) as FullBackupData;
      } catch {
        throw new Error('Invalid JSON backup file.');
      }
      if (!parsed || parsed.app !== 'Das PG Management' || !Array.isArray(parsed.rooms)) {
        throw new Error('This file does not appear to be a valid Das PG Management backup.');
      }
      await dbService.restoreFullBackup(parsed);
      await loadAllData();
      showToast('PG data restored successfully from backup.');
    },
    [loadAllData, showToast]
  );

  const resetAllData = useCallback(async () => {
    await dbService.resetAllData();
    await loadAllData();
    showToast('All PG records cleared. Rooms 1–10 reset to vacant.', 'info');
  }, [loadAllData, showToast]);

  const adminProfile = useMemo(() => {
    if (isSupabaseConfigured) return supabaseUser;
    if (adminAccount) return { name: adminAccount.name, email: adminAccount.email };
    return null;
  }, [supabaseUser, adminAccount]);

  const value: PGContextValue = {
    isLoading,
    authStatus,
    authMode,
    adminProfile,
    settings,
    rooms,
    roomHistory,
    tenants,
    bills,
    payments,
    expenses,
    selectedMonth,
    setSelectedMonth,
    toasts,
    showToast,
    dismissToast,
    createAdminAccount,
    login,
    logout,
    changeAdminCredentials,
    updateRoom,
    bulkApplyDefaultRent,
    addTenant,
    updateTenant,
    markTenantMovedOut,
    deleteTenant,
    getPreviousDueForRoom,
    createBill,
    updateBill,
    generateMonthlyBills,
    setBillElectricityForRoom,
    deleteBill,
    recordPayment,
    deletePayment,
    addExpense,
    updateExpense,
    deleteExpense,
    updateSettings,
    exportBackup,
    restoreBackup,
    resetAllData,
  };

  return <PGContext.Provider value={value}>{children}</PGContext.Provider>;
};

export function usePG(): PGContextValue {
  const ctx = useContext(PGContext);
  if (!ctx) throw new Error('usePG must be used inside PGProvider');
  return ctx;
}
