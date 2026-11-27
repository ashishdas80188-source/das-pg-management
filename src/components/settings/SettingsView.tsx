import React, { useEffect, useRef, useState } from 'react';
import {
  Settings as SettingsIcon,
  Save,
  Download,
  Upload,
  Shield,
  Cloud,
  HardDrive,
  Trash2,
} from 'lucide-react';
import { usePG } from '../../context/PGContext';
import { ConfirmDialog } from '../ui/ConfirmDialog';

export const SettingsView: React.FC = () => {
  const {
    settings,
    authMode,
    adminProfile,
    updateSettings,
    bulkApplyDefaultRent,
    changeAdminCredentials,
    exportBackup,
    restoreBackup,
    resetAllData,
    showToast,
  } = usePG();

  const [pgName, setPgName] = useState(settings.pgName);
  const [pgAddress, setPgAddress] = useState(settings.pgAddress);
  const [ownerPhone, setOwnerPhone] = useState(settings.ownerPhone);
  const [defaultRent, setDefaultRent] = useState(String(settings.defaultRent));
  const [defaultBillingDay, setDefaultBillingDay] = useState(String(settings.defaultBillingDay));
  const [elecMode, setElecMode] = useState<'manual' | 'per_unit'>(settings.electricityBillingMode);
  const [elecRate, setElecRate] = useState(String(settings.electricityRatePerUnit));
  const [elecNote, setElecNote] = useState(settings.electricityNote);

  // Admin password change
  const [adminName, setAdminName] = useState(adminProfile?.name || '');
  const [adminEmail, setAdminEmail] = useState(adminProfile?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [secError, setSecError] = useState('');

  // Restore / Reset
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingRestoreJson, setPendingRestoreJson] = useState<string | null>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  useEffect(() => {
    setPgName(settings.pgName);
    setPgAddress(settings.pgAddress);
    setOwnerPhone(settings.ownerPhone);
    setDefaultRent(String(settings.defaultRent));
    setDefaultBillingDay(String(settings.defaultBillingDay));
    setElecMode(settings.electricityBillingMode);
    setElecRate(String(settings.electricityRatePerUnit));
    setElecNote(settings.electricityNote);
  }, [settings]);

  useEffect(() => {
    if (adminProfile) {
      setAdminName(adminProfile.name);
      setAdminEmail(adminProfile.email);
    }
  }, [adminProfile]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSettings({
      pgName: pgName.trim() || 'Das PG',
      pgAddress: pgAddress.trim(),
      ownerPhone: ownerPhone.trim(),
      defaultRent: Math.max(0, Number(defaultRent) || 0),
      defaultBillingDay: Math.max(1, Math.min(28, Number(defaultBillingDay) || 5)),
      electricityBillingMode: elecMode,
      electricityRatePerUnit: Math.max(0, Number(elecRate) || 0),
      electricityNote: elecNote.trim(),
      currency: 'INR',
    });
  };

  const handleUpdateSecurity = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecError('');
    try {
      await changeAdminCredentials({
        currentPassword,
        newPassword: newPassword.trim() || undefined,
        name: adminName,
        email: adminEmail,
      });
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setSecError(err instanceof Error ? err.message : 'Unable to update credentials.');
    }
  };

  const handleBackupFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPendingRestoreJson(String(reader.result));
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* PG Details & Billing Settings */}
      <form
        onSubmit={handleSaveSettings}
        className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-5"
      >
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
          <div className="p-2 rounded-xl bg-[#0B192C] text-emerald-400">
            <SettingsIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#0B192C]">PG & Billing Settings</h2>
            <p className="text-xs text-slate-500">
              Configure Das PG profile, default rent, billing date, and electricity settings
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">PG Name</label>
            <input
              type="text"
              required
              value={pgName}
              onChange={(e) => setPgName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Owner Contact Number
            </label>
            <input
              type="tel"
              value={ownerPhone}
              onChange={(e) => setOwnerPhone(e.target.value)}
              placeholder="e.g. +91 98765 43210"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">PG Address</label>
            <input
              type="text"
              value={pgAddress}
              onChange={(e) => setPgAddress(e.target.value)}
              placeholder="Full address shown on printed bills and receipts"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Default Monthly Rent (₹)
            </label>
            <input
              type="number"
              min={0}
              value={defaultRent}
              onChange={(e) => setDefaultRent(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
            />
            <button
              type="button"
              onClick={() => bulkApplyDefaultRent(Math.max(0, Number(defaultRent) || 0))}
              className="text-[11px] font-semibold text-emerald-700 hover:underline mt-1 cursor-pointer"
            >
              Apply this rent to all 10 rooms
            </button>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Default Billing Day (1–28)
            </label>
            <input
              type="number"
              min={1}
              max={28}
              value={defaultBillingDay}
              onChange={(e) => setDefaultBillingDay(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Currency</label>
            <input
              type="text"
              disabled
              value="INR (₹ Indian Rupees)"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-100 text-sm text-slate-600"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Electricity / Line Bill Mode
            </label>
            <select
              value={elecMode}
              onChange={(e) => setElecMode(e.target.value as 'manual' | 'per_unit')}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
            >
              <option value="manual">Manual Monthly Entry per Room</option>
              <option value="per_unit">Reference Rate Per Unit + Manual Bill</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reference Rate Per Unit (₹/kWh)
            </label>
            <input
              type="number"
              min={0}
              step="0.5"
              value={elecRate}
              onChange={(e) => setElecRate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Electricity Billing Note
            </label>
            <input
              type="text"
              value={elecNote}
              onChange={(e) => setElecNote(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold cursor-pointer"
          >
            <Save className="w-4 h-4" />
            Save Settings
          </button>
        </div>
      </form>

      {/* Admin Security */}
      <form
        onSubmit={handleUpdateSecurity}
        className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4"
      >
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
          <div className="p-2 rounded-xl bg-[#0B192C] text-emerald-400">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#0B192C]">Admin Security</h3>
            <p className="text-xs text-slate-500">Update admin name, email, or password</p>
          </div>
        </div>

        {secError && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
            {secError}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Admin Name</label>
            <input
              type="text"
              required
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Admin Email / Username
            </label>
            <input
              type="text"
              required
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Current Password {authMode === 'local' ? '*' : '(Optional)'}
            </label>
            <input
              type="password"
              required={authMode === 'local'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              New Password (Leave blank to keep current)
            </label>
            <input
              type="password"
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-[#0B192C] hover:bg-[#132B4A] text-white text-sm font-semibold cursor-pointer"
          >
            Update Admin Account
          </button>
        </div>
      </form>

      {/* Backup, Restore & Storage Mode */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-[#0B192C]">Data Backup, Restore & Storage</h3>
            <p className="text-xs text-slate-500">
              Export your complete PG database as a JSON file or restore from a backup
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-xs font-semibold text-[#0B192C]">
            {authMode === 'supabase' ? (
              <>
                <Cloud className="w-3.5 h-3.5 text-emerald-600" />
                Supabase Cloud Active
              </>
            ) : (
              <>
                <HardDrive className="w-3.5 h-3.5 text-emerald-600" />
                Local IndexedDB Active
              </>
            )}
          </span>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={exportBackup}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Download Full Backup (.json)
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-[#0B192C] text-sm font-semibold cursor-pointer"
          >
            <Upload className="w-4 h-4 text-emerald-600" />
            Restore from Backup
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleBackupFileSelected}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => setResetConfirmOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-sm font-semibold ml-auto cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            Reset All Data
          </button>
        </div>

        {authMode === 'local' && (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
            <div className="font-bold text-[#0B192C]">Upgrade Path to Supabase Cloud Storage</div>
            <p>
              Currently running in offline-first Local IndexedDB mode. To enable multi-device cloud
              sync and Supabase Auth, create a Supabase project, run{' '}
              <code className="px-1.5 py-0.5 rounded bg-slate-200">supabase/schema.sql</code>, and
              add <code className="px-1.5 py-0.5 rounded bg-slate-200">VITE_SUPABASE_URL</code> and{' '}
              <code className="px-1.5 py-0.5 rounded bg-slate-200">VITE_SUPABASE_ANON_KEY</code>{' '}
              to your <code className="px-1.5 py-0.5 rounded bg-slate-200">.env</code> file.
            </p>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(pendingRestoreJson)}
        onClose={() => setPendingRestoreJson(null)}
        onConfirm={async () => {
          if (!pendingRestoreJson) return;
          try {
            await restoreBackup(pendingRestoreJson);
          } catch (err) {
            showToast(err instanceof Error ? err.message : 'Restore failed.', 'error');
          }
        }}
        title="Restore Data from Backup?"
        message="Restoring a backup will replace your current rooms, tenants, bills, payments, and expenses with the backup contents. Make sure you have exported a current backup first if needed."
        confirmLabel="Restore Backup"
        variant="warning"
      />

      <ConfirmDialog
        open={resetConfirmOpen}
        onClose={() => setResetConfirmOpen(false)}
        onConfirm={resetAllData}
        title="Reset All PG Data?"
        message="This will permanently erase all tenants, bills, payments, and expenses and reset Rooms 1–10 to vacant. Your admin login will stay intact."
        confirmLabel="Yes, Reset Everything"
        variant="danger"
      />
    </div>
  );
};
