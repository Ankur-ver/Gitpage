import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { EyeIcon, EyeSlashIcon, SparklesIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../hooks/useAuth';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/* ── OAuth provider config ── */
const OAUTH_PROVIDERS = [
  {
    key:   'github',
    name:  'GitHub',
    href:  `${API}/auth/github`,
    icon:  (
      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385
          .6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795
          -.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015
          -.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105
          -.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385
          1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98
          -.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24
          2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475
          5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225
          .69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
      </svg>
    ),
    bg:    'hover:bg-[#24292f]',
    color: 'text-white',
    border:'border-[#24292f]',
  },
  {
    key:   'google',
    name:  'Google',
    href:  `${API}/auth/google`,
    icon:  (
      <svg viewBox="0 0 24 24" className="w-4 h-4">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92
          c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77
          c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84
          C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35
          -2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81
          -.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45
          2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53
          6.16-4.53z"/>
      </svg>
    ),
    bg:    'hover:bg-white/5',
    color: 'text-text-primary',
    border:'border-[#2a2a3a]',
  },
];

/* ════════════════════════════════════════════════════════════════ */
const LoginPage: React.FC = () => {
  const { handleLogin, loading, error } = useAuth();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  /* URL error param (e.g. ?error=github_denied after failed OAuth) */
  const urlError = new URLSearchParams(window.location.search).get('error');
  const oauthErrorMsg: Record<string, string> = {
    github_denied: 'GitHub login was cancelled.',
    github_failed: 'GitHub login failed. Please try again.',
    google_denied: 'Google login was cancelled.',
    google_failed: 'Google login failed. Please try again.',
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    handleLogin(email, password);
  };

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center px-4 pt-14">
      {/* BG glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96
                        bg-indigo-600/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0,  scale: 1    }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600
                            flex items-center justify-center shadow-glow">
              <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205
                  11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235
                  -3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695
                  -.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08
                  1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3
                  -5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54
                  -1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405
                  s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88
                  .12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475
                  5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0
                  .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
              </svg>
            </div>
            <span className="text-2xl font-black gradient-text">GitPage</span>
          </div>
          <h2 className="text-xl font-bold text-text-primary">Welcome back</h2>
          <p className="text-text-muted text-sm mt-1">Sign in to your account</p>
        </div>

        {/* Card */}
        <div className="gradient-border p-8">

          {/* OAuth error from redirect */}
          {urlError && oauthErrorMsg[urlError] && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20
                            text-red-400 text-sm flex items-start gap-2">
              <ExclamationCircleIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
              {oauthErrorMsg[urlError]}
            </div>
          )}

          {/* Email/password error */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20
                            text-red-400 text-sm flex items-start gap-2">
              <ExclamationCircleIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {/* ── OAuth buttons (top — most common choice) ── */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {OAUTH_PROVIDERS.map(p => (
              <a
                key={p.key}
                href={p.href}
                className={`flex items-center justify-center gap-2.5 py-2.5 rounded-lg
                             border ${p.border} bg-bg-secondary ${p.color} ${p.bg}
                             text-sm font-medium transition-all duration-200
                             hover:scale-[1.02] active:scale-[0.98]`}
              >
                {p.icon}
                {p.name}
              </a>
            ))}
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-[#2a2a3a]" />
            <span className="text-xs text-text-muted">or sign in with email</span>
            <div className="flex-1 h-px bg-[#2a2a3a]" />
          </div>

          {/* ── Email / password form ── */}
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">
                Email or username
              </label>
              <input
                type="text"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                className="w-full bg-bg-secondary border border-[#2a2a3a] rounded-lg
                           px-3 py-2.5 text-sm text-text-primary placeholder-text-muted
                           outline-none focus:border-indigo-500/60 transition-colors"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm text-text-secondary">Password</label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-indigo-400 hover:text-indigo-300"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-bg-secondary border border-[#2a2a3a] rounded-lg
                             px-3 py-2.5 pr-10 text-sm text-text-primary placeholder-text-muted
                             outline-none focus:border-indigo-500/60 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted
                             hover:text-text-secondary transition-colors"
                >
                  {showPass
                    ? <EyeSlashIcon className="w-4 h-4" />
                    : <EyeIcon      className="w-4 h-4" />
                  }
                </button>
              </div>
            </div>

            <motion.button
              whileTap={{ scale: 0.97 }}
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500
                         text-white font-medium text-sm disabled:opacity-60
                         disabled:cursor-not-allowed transition-colors
                         flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10"
                            stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in…
                </>
              ) : 'Sign in'}
            </motion.button>
          </form>

          {/* AI notice */}
          <div className="mt-5 p-3 rounded-lg bg-indigo-500/5 border border-indigo-500/20
                          flex items-start gap-2">
            <SparklesIcon className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-indigo-300">
              AI features are available for all accounts. Get intelligent code
              assistance the moment you sign in.
            </p>
          </div>
        </div>

        <p className="text-center text-sm text-text-muted mt-6">
          Don't have an account?{' '}
          <Link to="/register" className="text-indigo-400 hover:text-indigo-300 font-medium">
            Sign up for free
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default LoginPage;