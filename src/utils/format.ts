export function formatINR(amount: number, showDecimals = false): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  }).format(safe);
}

export function formatIndianNumber(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat('en-IN').format(safe);
}

export function getCurrentMonthKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function getTodayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getPreviousMonthKey(monthKey: string): string {
  const [yStr, mStr] = monthKey.split('-');
  const year = Number(yStr);
  const month = Number(mStr);
  if (!year || !month) return monthKey;
  if (month === 1) {
    return `${year - 1}-12`;
  }
  return `${year}-${String(month - 1).padStart(2, '0')}`;
}

export function formatMonthLabel(monthKey: string): string {
  const [yStr, mStr] = monthKey.split('-');
  const year = Number(yStr);
  const month = Number(mStr);
  if (!year || !month) return monthKey;
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

export function formatShortMonth(monthKey: string): string {
  const [yStr, mStr] = monthKey.split('-');
  const year = Number(yStr);
  const month = Number(mStr);
  if (!year || !month) return monthKey;
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
}

export function formatDateIN(dateStr?: string): string {
  if (!dateStr) return '—';
  const parsed = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return dateStr;
  return parsed.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function buildDueDateForMonth(monthKey: string, day: number): string {
  const safeDay = Math.max(1, Math.min(28, Math.round(day || 5)));
  return `${monthKey}-${String(safeDay).padStart(2, '0')}`;
}

export function getRecentMonthKeys(count: number, endMonthKey = getCurrentMonthKey()): string[] {
  const keys: string[] = [];
  let cursor = endMonthKey;
  for (let i = 0; i < count; i++) {
    keys.unshift(cursor);
    cursor = getPreviousMonthKey(cursor);
  }
  return keys;
}

export function normalizePhoneForWhatsApp(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 11 && digits.startsWith('0')) return `91${digits.slice(1)}`;
  return digits;
}

export function buildWhatsAppReminderUrl(params: {
  phone: string;
  tenantName: string;
  roomNumber: number;
  pgName: string;
  billingMonth?: string;
  totalPayable?: number;
  amountPaid?: number;
  remainingDue: number;
}): string {
  const waPhone = normalizePhoneForWhatsApp(params.phone);
  const monthText = params.billingMonth ? ` for ${formatMonthLabel(params.billingMonth)}` : '';
  const lines = [
    `Hello ${params.tenantName},`,
    `This is a polite payment reminder from *${params.pgName}* regarding Room ${params.roomNumber}${monthText}.`,
  ];
  if (typeof params.totalPayable === 'number') {
    lines.push(`Total Payable: ${formatINR(params.totalPayable)}`);
  }
  if (typeof params.amountPaid === 'number' && params.amountPaid > 0) {
    lines.push(`Amount Paid: ${formatINR(params.amountPaid)}`);
  }
  lines.push(`*Remaining Due: ${formatINR(params.remainingDue)}*`);
  lines.push(`Kindly clear the due at your earliest convenience. Thank you!`);
  const text = encodeURIComponent(lines.join('\n'));
  return `https://wa.me/${waPhone}?text=${text}`;
}

export function generateId(prefix = 'id'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function computeBillTotals(input: {
  rentAmount: number;
  electricityBill: number;
  otherCharges: number;
  previousDue: number;
  amountPaid: number;
}) {
  const rent = Math.max(0, Number(input.rentAmount) || 0);
  const electricity = Math.max(0, Number(input.electricityBill) || 0);
  const other = Math.max(0, Number(input.otherCharges) || 0);
  const prev = Math.max(0, Number(input.previousDue) || 0);
  const paid = Math.max(0, Number(input.amountPaid) || 0);

  const totalPayable = rent + electricity + other + prev;
  const remainingDue = Math.max(0, totalPayable - paid);

  let status: 'paid' | 'partial' | 'unpaid' = 'unpaid';
  if (totalPayable === 0 || remainingDue === 0) {
    status = 'paid';
  } else if (paid > 0) {
    status = 'partial';
  }

  return {
    totalPayable,
    remainingDue,
    status,
  };
}
