import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, Mail, Lock, Eye, EyeOff, AlertCircle, ShieldCheck, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    
    setLoading(true);
    setError('');
    
    const result = await login(email, password);
    
    if (result.success && result.user) {
      // Navigate to appropriate dashboard based on user type
      if (result.user.user_type === 'host') {
        navigate('/host-dashboard');
      } else {
        navigate('/dashboard');
      }
    } else {
      setError(result.error || 'Incorrect email or password');
    }
    
    setLoading(false);
  };

  return (
    <div className="auth-shell">
      <div className="grid w-full max-w-5xl grid-cols-1 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl lg:grid-cols-2">
        <aside className="hidden bg-slate-900 p-10 text-slate-100 lg:block">
          <div className="mb-14 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white">
              <Zap className="h-5 w-5" />
            </div>
            <span className="text-xl font-semibold tracking-tight">ChargeNet</span>
          </div>

          <h2 className="text-3xl font-semibold leading-tight text-white">
            Reliable EV charging operations, built for scale.
          </h2>
          <p className="mt-4 text-sm leading-6 text-slate-300">
            Manage stations, bookings, payments, and customer experience from one trusted platform.
          </p>

          <div className="mt-10 space-y-4">
            <div className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3 text-sm">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              Secure session-based authentication
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3 text-sm">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              Real-time updates for hosts and drivers
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3 text-sm">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              Production-ready payment integrations
            </div>
          </div>
        </aside>

        <main className="p-6 sm:p-10">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-8 text-center lg:text-left">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Welcome back</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Sign in to your account</h1>
              <p className="mt-2 text-sm text-slate-500">Use your registered email and password to continue.</p>
            </div>

            {error && (
              <div className="mb-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-3">
                <AlertCircle className="mt-0.5 h-4 w-4 text-red-500" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
            )}

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-700">
                  Email Address
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Mail className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-modern pl-10"
                    placeholder="you@company.com"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-700">
                  Password
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Lock className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-modern pl-10 pr-12"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-slate-400 hover:text-slate-600" />
                    ) : (
                      <Eye className="h-4 w-4 text-slate-400 hover:text-slate-600" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  Remember me
                </label>

                <a href="#" className="text-sm font-medium text-blue-600 hover:text-blue-700">
                  Forgot password?
                </a>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full gap-2 py-3 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {loading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white"></div>
                ) : (
                  <>
                    Sign In <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              <p className="pt-1 text-center text-sm text-slate-600 lg:text-left">
                Don&apos;t have an account?{' '}
                <Link to="/register" className="font-semibold text-blue-600 hover:text-blue-700">
                  Create one
                </Link>
              </p>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Login;