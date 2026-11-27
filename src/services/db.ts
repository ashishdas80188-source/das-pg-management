import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';
import type {
  AdminAccount,
  Expense,
  FullBackupData,
  MonthlyBill,
  PGSettings,
  Payment,
  Room,
  RoomHistoryEntry,
  Tenant,
} from '../types';

const DB_NAME = 'das_pg_management_db';
const DB_VERSION = 1;

const STORES = [
  'settings',
  'rooms',
  'roomHistory',
  'tenants',
  'bills',
  'payments',
  'expenses',
  'admin',
] as const;

type StoreName = (typeof STORES)[number];

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const store of STORES) {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store, { keyPath: 'id' });
        }
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getAllFromStore<T>(storeName: StoreName): Promise<T[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve((req.result as T[]) || []);
    req.onerror = () => reject(req.error);
  });
}

async function putInStore<T>(storeName: StoreName, value: T): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    store.put(value);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function deleteFromStore(storeName: StoreName, id: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function replaceStoreData<T>(storeName: StoreName, items: T[]): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    store.clear();
    for (const item of items) {
      store.put(item);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function createDefaultSettings(): PGSettings {
  return {
    id: 'default',
    pgName: 'Das PG',
    pgAddress: '',
    ownerPhone: '',
    defaultRent: 0,
    defaultBillingDay: 5,
    electricityBillingMode: 'manual',
    electricityRatePerUnit: 0,
    electricityNote: 'Monthly electricity/line bill entered manually per room.',
    currency: 'INR',
    updatedAt: new Date().toISOString(),
  };
}

export function createInitialRooms(): Room[] {
  const now = new Date().toISOString();
  return Array.from({ length: 10 }, (_, idx) => {
    const roomNumber = idx + 1;
    return {
      id: `room_${roomNumber}`,
      roomNumber,
      floor: roomNumber <= 5 ? 'Ground Floor' : 'First Floor',
      capacity: 2,
      status: 'vacant',
      monthlyRent: 0,
      notes: '',
      updatedAt: now,
    };
  });
}

export const dbService = {
  async initialize(): Promise<{
    settings: PGSettings;
    rooms: Room[];
    roomHistory: RoomHistoryEntry[];
    tenants: Tenant[];
    bills: MonthlyBill[];
    payments: Payment[];
    expenses: Expense[];
  }> {
    let [settingsList, rooms, roomHistory, tenants, bills, payments, expenses] =
      await Promise.all([
        getAllFromStore<PGSettings>('settings'),
        getAllFromStore<Room>('rooms'),
        getAllFromStore<RoomHistoryEntry>('roomHistory'),
        getAllFromStore<Tenant>('tenants'),
        getAllFromStore<MonthlyBill>('bills'),
        getAllFromStore<Payment>('payments'),
        getAllFromStore<Expense>('expenses'),
      ]);

    let settings = settingsList[0];
    if (!settings) {
      settings = createDefaultSettings();
      await putInStore('settings', settings);
    }

    if (rooms.length === 0) {
      rooms = createInitialRooms();
      await replaceStoreData('rooms', rooms);
    } else {
      // Guarantee Room 1..10 exist
      const existingNums = new Set(rooms.map((r) => r.roomNumber));
      const missing = createInitialRooms().filter((r) => !existingNums.has(r.roomNumber));
      if (missing.length > 0) {
        rooms = [...rooms, ...missing].sort((a, b) => a.roomNumber - b.roomNumber);
        await replaceStoreData('rooms', rooms);
      }
    }

    rooms.sort((a, b) => a.roomNumber - b.roomNumber);
    roomHistory.sort((a, b) => b.date.localeCompare(a.date));
    tenants.sort((a, b) => a.roomNumber - b.roomNumber || a.fullName.localeCompare(b.fullName));
    bills.sort((a, b) => b.billingMonth.localeCompare(a.billingMonth) || a.roomNumber - b.roomNumber);
    payments.sort((a, b) => b.paymentDate.localeCompare(a.paymentDate) || b.createdAt.localeCompare(a.createdAt));
    expenses.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));

    return { settings, rooms, roomHistory, tenants, bills, payments, expenses };
  },

  async getAdminAccount(): Promise<AdminAccount | null> {
    const list = await getAllFromStore<AdminAccount>('admin');
    return list[0] || null;
  },

  async saveAdminAccount(account: AdminAccount): Promise<void> {
    await putInStore('admin', account);
  },

  async saveSettings(settings: PGSettings): Promise<void> {
    await putInStore('settings', settings);
    await syncToSupabase('pg_settings', {
      id: settings.id,
      pg_name: settings.pgName,
      pg_address: settings.pgAddress,
      owner_phone: settings.ownerPhone,
      default_rent: settings.defaultRent,
      default_billing_day: settings.defaultBillingDay,
      electricity_billing_mode: settings.electricityBillingMode,
      electricity_rate_per_unit: settings.electricityRatePerUnit,
      electricity_note: settings.electricityNote,
      currency: settings.currency,
      updated_at: settings.updatedAt,
    });
  },

  async saveRoom(room: Room): Promise<void> {
    await putInStore('rooms', room);
    await syncToSupabase('rooms', {
      id: room.id,
      room_number: room.roomNumber,
      floor: room.floor,
      capacity: room.capacity,
      status: room.status,
      monthly_rent: room.monthlyRent,
      notes: room.notes,
      updated_at: room.updatedAt,
    });
  },

  async addRoomHistory(entry: RoomHistoryEntry): Promise<void> {
    await putInStore('roomHistory', entry);
    await syncToSupabase('room_history', {
      id: entry.id,
      room_number: entry.roomNumber,
      date: entry.date,
      type: entry.type,
      description: entry.description,
      tenant_id: entry.tenantId || null,
      tenant_name: entry.tenantName || null,
      amount: entry.amount ?? null,
    });
  },

  async saveTenant(tenant: Tenant): Promise<void> {
    await putInStore('tenants', tenant);
    await syncToSupabase('tenants', {
      id: tenant.id,
      full_name: tenant.fullName,
      phone: tenant.phone,
      room_number: tenant.roomNumber,
      joining_date: tenant.joiningDate,
      monthly_rent: tenant.monthlyRent,
      security_deposit: tenant.securityDeposit,
      emergency_contact: tenant.emergencyContact,
      address: tenant.address,
      id_document_type: tenant.idDocumentType,
      id_document_number: tenant.idDocumentNumber,
      notes: tenant.notes,
      status: tenant.status,
      move_out_date: tenant.moveOutDate || null,
      created_at: tenant.createdAt,
      updated_at: tenant.updatedAt,
    });
  },

  async deleteTenant(id: string): Promise<void> {
    await deleteFromStore('tenants', id);
    await deleteFromSupabase('tenants', id);
  },

  async saveBill(bill: MonthlyBill): Promise<void> {
    await putInStore('bills', bill);
    await syncToSupabase('monthly_bills', {
      id: bill.id,
      room_number: bill.roomNumber,
      billing_month: bill.billingMonth,
      tenant_ids: bill.tenantIds,
      tenant_names: bill.tenantNames,
      rent_amount: bill.rentAmount,
      electricity_bill: bill.electricityBill,
      other_charges: bill.otherCharges,
      other_charges_note: bill.otherChargesNote,
      previous_due: bill.previousDue,
      total_payable: bill.totalPayable,
      amount_paid: bill.amountPaid,
      remaining_due: bill.remainingDue,
      status: bill.status,
      due_date: bill.dueDate,
      notes: bill.notes,
      created_at: bill.createdAt,
      updated_at: bill.updatedAt,
    });
  },

  async deleteBill(id: string): Promise<void> {
    await deleteFromStore('bills', id);
    await deleteFromSupabase('monthly_bills', id);
  },

  async savePayment(payment: Payment): Promise<void> {
    await putInStore('payments', payment);
    await syncToSupabase('payments', {
      id: payment.id,
      receipt_number: payment.receiptNumber,
      bill_id: payment.billId || null,
      tenant_id: payment.tenantId,
      tenant_name: payment.tenantName,
      room_number: payment.roomNumber,
      payment_date: payment.paymentDate,
      billing_month: payment.billingMonth,
      amount: payment.amount,
      method: payment.method,
      transaction_id: payment.transactionId,
      notes: payment.notes,
      created_at: payment.createdAt,
    });
  },

  async deletePayment(id: string): Promise<void> {
    await deleteFromStore('payments', id);
    await deleteFromSupabase('payments', id);
  },

  async saveExpense(expense: Expense): Promise<void> {
    await putInStore('expenses', expense);
    await syncToSupabase('expenses', {
      id: expense.id,
      title: expense.title,
      amount: expense.amount,
      category: expense.category,
      date: expense.date,
      description: expense.description,
      receipt_data_url: expense.receiptDataUrl || null,
      receipt_file_name: expense.receiptFileName || null,
      created_at: expense.createdAt,
      updated_at: expense.updatedAt,
    });
  },

  async deleteExpense(id: string): Promise<void> {
    await deleteFromStore('expenses', id);
    await deleteFromSupabase('expenses', id);
  },

  async restoreFullBackup(backup: FullBackupData): Promise<void> {
    const rooms =
      backup.rooms && backup.rooms.length === 10
        ? backup.rooms
        : createInitialRooms();
    await Promise.all([
      replaceStoreData('settings', [backup.settings || createDefaultSettings()]),
      replaceStoreData('rooms', rooms),
      replaceStoreData('roomHistory', backup.roomHistory || []),
      replaceStoreData('tenants', backup.tenants || []),
      replaceStoreData('bills', backup.bills || []),
      replaceStoreData('payments', backup.payments || []),
      replaceStoreData('expenses', backup.expenses || []),
    ]);
  },

  async resetAllData(): Promise<void> {
    await Promise.all([
      replaceStoreData('settings', [createDefaultSettings()]),
      replaceStoreData('rooms', createInitialRooms()),
      replaceStoreData('roomHistory', []),
      replaceStoreData('tenants', []),
      replaceStoreData('bills', []),
      replaceStoreData('payments', []),
      replaceStoreData('expenses', []),
    ]);
  },
};

async function syncToSupabase(table: string, row: Record<string, unknown>): Promise<void> {
  if (!isSupabaseConfigured) return;
  const client = getSupabaseClient();
  if (!client) return;
  try {
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user) return;
    await client.from(table).upsert({ ...row, owner_id: user.id });
  } catch {
    // Offline or network issue: IndexedDB remains authoritative locally
  }
}

async function deleteFromSupabase(table: string, id: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  const client = getSupabaseClient();
  if (!client) return;
  try {
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user) return;
    await client.from(table).delete().eq('id', id).eq('owner_id', user.id);
  } catch {
    // Offline safe
  }
}
