import React, { useState } from 'react';
import { ShieldCheck, Lock, Mail, User, Eye, EyeOff, ArrowRight, Cloud, HardDrive } from 'lucide-react';
import { usePG } from '../../context/PGContext';
import { DasPGLogo } from '../ui/Logo';

export const AuthGate: React.FC = () => {
  const { authStatus, authMode, createAdminAccount, login, settings } = usePG();
  const isSetup = authStatus === 'needs_setup';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [supabaseSignUpMode, setSupabaseSignUpMode] = useState(false);

  const showCreateForm = isSetup || (authMode === 'supabase' && supabaseSignUpMode);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (showCreateForm && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      if (showCreateForm) {
        await createAdminAccount(name || 'PG Admin', email, password);
      } else {
        await login(email, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B192C] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Subtle decorative backdrop */}
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-sky-500/10 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="flex justify-center mb-6">
          <DasPGLogo size="lg" lightText pgName={settings.pgName || 'DAS PG'} />
        </div>

        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden">
          <div className="px-6 pt-6 pb-4 bg-slate-50 border-b border-slate-100">
            <div className="flex items-center justify-between gap-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0B192C] text-emerald-400 text-xs font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" />
                Admin Only Access
              </div>
              <div className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
                {authMode === 'supabase' ? (
                  <>
                    <Cloud className="w-3.5 h-3.5 text-emerald-600" />
                    Supabase Cloud
                  </>
                ) : (
                  <>
                    <HardDrive className="w-3.5 h-3.5 text-[#0B192C]" />
                    Local Secure DB
                  </>
                )}
              </div>
            </div>
            <h1 className="text-xl font-bold text-[#0B192C] mt-3">
              {showCreateForm ? 'Create Admin Account' : 'Sign in to Das PG'}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              {showCreateForm
                ? 'Set up your owner login to securely manage all 10 rooms, tenants, bills, and expenses.'
                : 'Enter your admin credentials to access the PG management dashboard.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {error}
              </div>
            )}

            {showCreateForm && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Owner / Admin Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Rajesh Das"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {authMode === 'supabase' ? 'Admin Email' : 'Admin Email or Username'}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={authMode === 'supabase' ? 'email' : 'text'}
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@daspg.in"
                  autoComplete="username"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={showCreateForm ? 'Minimum 6 characters' : 'Enter your password'}
                  autoComplete={showCreateForm ? 'new-password' : 'current-password'}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {showCreateForm && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    autoComplete="new-password"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer disabled:opacity-60"
            >
              {submitting
                ? 'Please wait...'
                : showCreateForm
                ? 'Create Admin Account & Open Dashboard'
                : 'Sign In to Dashboard'}
              <ArrowRight className="w-4 h-4" />
            </button>

            {authMode === 'supabase' && !isSetup && (
              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setSupabaseSignUpMode((m) => !m);
                  }}
                  className="text-xs font-semibold text-emerald-700 hover:underline cursor-pointer"
                >
                  {supabaseSignUpMode
                    ? 'Already have an admin account? Sign in'
                    : 'First time with Supabase? Create admin account'}
                </button>
              </div>
            )}
          </form>
        </div>

        <p className="text-center text-xs text-slate-400 mt-5">
          {authMode === 'local'
            ? 'Your data is stored privately on this device in IndexedDB and persists across refreshes.'
            : 'Connected to Supabase Cloud Authentication & Database.'}
        </p>
      </div>
    </div>
  );
};
