import React from 'react';
import { Printer } from 'lucide-react';
import type { MonthlyBill, PGSettings, Payment } from '../../types';
import { formatDateIN, formatINR, formatMonthLabel } from '../../utils/format';
import { DasPGLogo } from '../ui/Logo';
import { Modal } from '../ui/Modal';

interface PrintableBillModalProps {
  bill: MonthlyBill | null;
  settings: PGSettings;
  onClose: () => void;
}

export const PrintableBillModal: React.FC<PrintableBillModalProps> = ({
  bill,
  settings,
  onClose,
}) => {
  if (!bill) return null;

  return (
    <Modal
      open={Boolean(bill)}
      onClose={onClose}
      title={`Monthly Rent & Electricity Bill — Room ${bill.roomNumber}`}
      maxWidthClass="max-w-2xl"
    >
      <div className="print-only-container space-y-5 text-slate-900">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <DasPGLogo size="md" lightText={false} pgName={settings.pgName || 'DAS PG'} />
            {settings.pgAddress && (
              <p className="text-xs text-slate-500 mt-2 max-w-xs">{settings.pgAddress}</p>
            )}
            {settings.ownerPhone && (
              <p className="text-xs text-slate-500">Contact: {settings.ownerPhone}</p>
            )}
          </div>
          <div className="text-left sm:text-right">
            <div className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
              Monthly Statement
            </div>
            <div className="text-lg font-bold text-[#0B192C]">
              {formatMonthLabel(bill.billingMonth)}
            </div>
            <div className="text-xs text-slate-500 mt-1">Due Date: {formatDateIN(bill.dueDate)}</div>
            <div className="text-xs text-slate-500">Bill ID: {bill.id.slice(0, 12).toUpperCase()}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
          <div>
            <div className="text-[11px] font-semibold uppercase text-slate-500">Room Number</div>
            <div className="text-sm font-bold text-[#0B192C]">Room {bill.roomNumber}</div>
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase text-slate-500">Tenant(s)</div>
            <div className="text-sm font-bold text-[#0B192C]">{bill.tenantNames}</div>
          </div>
        </div>

        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#0B192C] text-white">
              <tr>
                <th className="text-left px-4 py-2.5 font-semibold">Charge Description</th>
                <th className="text-right px-4 py-2.5 font-semibold">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <tr>
                <td className="px-4 py-2.5">Monthly Room Rent</td>
                <td className="px-4 py-2.5 text-right font-medium">{formatINR(bill.rentAmount)}</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5">Electricity / Line Bill</td>
                <td className="px-4 py-2.5 text-right font-medium">
                  {formatINR(bill.electricityBill)}
                </td>
              </tr>
              {bill.otherCharges > 0 && (
                <tr>
                  <td className="px-4 py-2.5">
                    Other Charges {bill.otherChargesNote ? `(${bill.otherChargesNote})` : ''}
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium">
                    {formatINR(bill.otherCharges)}
                  </td>
                </tr>
              )}
              {bill.previousDue > 0 && (
                <tr>
                  <td className="px-4 py-2.5 text-amber-700 font-medium">
                    Previous Month Outstanding Balance
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium text-amber-700">
                    {formatINR(bill.previousDue)}
                  </td>
                </tr>
              )}
              <tr className="bg-slate-50 font-bold text-[#0B192C]">
                <td className="px-4 py-2.5">Total Payable</td>
                <td className="px-4 py-2.5 text-right">{formatINR(bill.totalPayable)}</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 text-emerald-700 font-medium">Amount Paid</td>
                <td className="px-4 py-2.5 text-right text-emerald-700 font-semibold">
                  - {formatINR(bill.amountPaid)}
                </td>
              </tr>
              <tr className="bg-emerald-50/60 font-bold text-base">
                <td className="px-4 py-3 text-[#0B192C]">Remaining Due</td>
                <td
                  className={`px-4 py-3 text-right ${
                    bill.remainingDue > 0 ? 'text-rose-600' : 'text-emerald-700'
                  }`}
                >
                  {formatINR(bill.remainingDue)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {bill.notes && (
          <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <span className="font-semibold">Notes:</span> {bill.notes}
          </div>
        )}

        <div className="flex items-center justify-between pt-2 text-xs text-slate-500">
          <span>Status: {bill.status.toUpperCase()}</span>
          <span>Generated by {settings.pgName || 'Das PG'} Management</span>
        </div>
      </div>

      <div className="mt-5 flex justify-end gap-2.5 no-print border-t border-slate-100 pt-4">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
        >
          Close
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="px-4 py-2 rounded-xl bg-[#0B192C] hover:bg-[#132B4A] text-white text-sm font-semibold inline-flex items-center gap-2 cursor-pointer"
        >
          <Printer className="w-4 h-4 text-emerald-400" />
          Print / Save PDF
        </button>
      </div>
    </Modal>
  );
};

interface PrintableReceiptModalProps {
  payment: Payment | null;
  settings: PGSettings;
  onClose: () => void;
}

export const PrintableReceiptModal: React.FC<PrintableReceiptModalProps> = ({
  payment,
  settings,
  onClose,
}) => {
  if (!payment) return null;

  return (
    <Modal
      open={Boolean(payment)}
      onClose={onClose}
      title={`Payment Receipt — ${payment.receiptNumber}`}
      maxWidthClass="max-w-xl"
    >
      <div className="print-only-container space-y-5 text-slate-900">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <DasPGLogo size="md" lightText={false} pgName={settings.pgName || 'DAS PG'} />
            {settings.pgAddress && (
              <p className="text-xs text-slate-500 mt-2 max-w-xs">{settings.pgAddress}</p>
            )}
            {settings.ownerPhone && (
              <p className="text-xs text-slate-500">Phone: {settings.ownerPhone}</p>
            )}
          </div>
          <div className="text-left sm:text-right">
            <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
              PAYMENT RECEIPT
            </span>
            <div className="text-sm font-bold text-[#0B192C] mt-1.5">{payment.receiptNumber}</div>
            <div className="text-xs text-slate-500">Date: {formatDateIN(payment.paymentDate)}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm">
          <div>
            <div className="text-[11px] uppercase font-semibold text-slate-500">Received From</div>
            <div className="font-bold text-[#0B192C]">{payment.tenantName}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase font-semibold text-slate-500">Room</div>
            <div className="font-bold text-[#0B192C]">Room {payment.roomNumber}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase font-semibold text-slate-500">Month Paid For</div>
            <div className="font-semibold">{formatMonthLabel(payment.billingMonth)}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase font-semibold text-slate-500">Payment Method</div>
            <div className="font-semibold">{payment.method}</div>
          </div>
          {payment.transactionId && (
            <div className="col-span-2">
              <div className="text-[11px] uppercase font-semibold text-slate-500">Transaction ID</div>
              <div className="font-mono text-xs font-semibold text-slate-700">
                {payment.transactionId}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between p-4 rounded-xl bg-[#0B192C] text-white">
          <span className="text-sm font-medium text-slate-200">Amount Received</span>
          <span className="text-2xl font-bold text-emerald-400">{formatINR(payment.amount)}</span>
        </div>

        {payment.notes && (
          <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <span className="font-semibold">Notes:</span> {payment.notes}
          </div>
        )}

        <div className="pt-3 border-t border-dashed border-slate-300 flex items-center justify-between text-xs text-slate-500">
          <span>Thank you for your payment.</span>
          <span>Authorized Signature ({settings.pgName || 'Das PG'})</span>
        </div>
      </div>

      <div className="mt-5 flex justify-end gap-2.5 no-print border-t border-slate-100 pt-4">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
        >
          Close
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold inline-flex items-center gap-2 cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          Print / Download PDF
        </button>
      </div>
    </Modal>
  );
};
