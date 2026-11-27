export type RoomStatus = 'occupied' | 'vacant';
export type TenantStatus = 'active' | 'moved_out';
export type BillStatus = 'paid' | 'partial' | 'unpaid';
export type PaymentMethod = 'Cash' | 'UPI' | 'Bank Transfer' | 'Other';
export type ExpenseCategory =
  | 'Electricity'
  | 'Water'
  | 'Internet/Wi-Fi'
  | 'Maintenance'
  | 'Cleaning'
  | 'Food/Grocery'
  | 'Repairs'
  | 'Other';

export interface Room {
  id: string;
  roomNumber: number; // 1 to 10
  floor: string;
  capacity: number;
  status: RoomStatus;
  monthlyRent: number;
  notes: string;
  updatedAt: string;
}

export type RoomHistoryType =
  | 'tenant_assigned'
  | 'tenant_moved_out'
  | 'rent_changed'
  | 'status_changed'
  | 'room_updated';

export interface RoomHistoryEntry {
  id: string;
  roomNumber: number;
  date: string;
  type: RoomHistoryType;
  description: string;
  tenantId?: string;
  tenantName?: string;
  amount?: number;
}

export interface Tenant {
  id: string;
  fullName: string;
  phone: string;
  roomNumber: number; // 1 to 10
  joiningDate: string; // YYYY-MM-DD
  monthlyRent: number;
  securityDeposit: number;
  emergencyContact: string;
  address: string;
  idDocumentType: string;
  idDocumentNumber: string;
  notes: string;
  status: TenantStatus;
  moveOutDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MonthlyBill {
  id: string;
  roomNumber: number; // 1 to 10
  billingMonth: string; // YYYY-MM
  tenantIds: string[];
  tenantNames: string;
  rentAmount: number;
  electricityBill: number;
  otherCharges: number;
  otherChargesNote: string;
  previousDue: number;
  totalPayable: number;
  amountPaid: number;
  remainingDue: number;
  status: BillStatus;
  dueDate: string; // YYYY-MM-DD
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  receiptNumber: string;
  billId?: string;
  tenantId: string;
  tenantName: string;
  roomNumber: number;
  paymentDate: string; // YYYY-MM-DD
  billingMonth: string; // YYYY-MM
  amount: number;
  method: PaymentMethod;
  transactionId: string;
  notes: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  category: ExpenseCategory;
  date: string; // YYYY-MM-DD
  description: string;
  receiptDataUrl?: string;
  receiptFileName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PGSettings {
  id: 'default';
  pgName: string;
  pgAddress: string;
  ownerPhone: string;
  defaultRent: number;
  defaultBillingDay: number; // 1 to 28
  electricityBillingMode: 'manual' | 'per_unit';
  electricityRatePerUnit: number;
  electricityNote: string;
  currency: 'INR';
  updatedAt: string;
}

export interface AdminAccount {
  id: 'admin';
  email: string;
  name: string;
  passwordHash: string;
  salt: string;
  createdAt: string;
  updatedAt: string;
}

export interface FullBackupData {
  version: number;
  exportedAt: string;
  app: 'Das PG Management';
  settings: PGSettings;
  rooms: Room[];
  roomHistory: RoomHistoryEntry[];
  tenants: Tenant[];
  bills: MonthlyBill[];
  payments: Payment[];
  expenses: Expense[];
}

export type AppSection =
  | 'dashboard'
  | 'rooms'
  | 'tenants'
  | 'billing'
  | 'payments'
  | 'expenses'
  | 'reports'
  | 'reminders'
  | 'settings';
