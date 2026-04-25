import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { EyeIcon, EyeSlashIcon, CheckIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../hooks/useAuth';

const RegisterPage: React.FC = () => {
  const { handleRegister, loading, error } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [agreed, setAgreed]     = useState(false);

  const passwordStrength = (p: string) => {
    let score = 0;
    if (p.length >= 8)          score++;
    if (/[A-Z]/.test(p))        score++;
    if (/[0-9]/.test(p))        score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    return score;
  };

  const strength = passwordStrength(password);
  const strengthLabel = ['','Weak','Fair','Good','Strong'][strength];
  const strengthColor = ['','bg-red-500','bg-yellow-500','bg-blue-500','bg-green-500'][strength];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) return;
    handleRegister(username, email, password);
  };

  const perks = [
    'Unlimited public repositories',
    'AI code assistant included',
    '2,000 CI/CD minutes/month',
    'Community support',
  ];

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center px-4 py-20">
      {/* BG */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px]
                        bg-purple-600/8 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-4xl relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        {/* Left – Perks */}
        <motion.div
          initial={{ opacity:0, x:-20 }}
          animate={{ opacity:1, x:0 }}
          className="hidden md:block space-y-6"
        >
          <div>
            <h2 className="text-3xl font-black text-text-primary mb-2">
              Join <span className="gradient-text">GitPage</span> today
            </h2>
            <p className="text-text-muted">
              The AI-powered platform where millions of developers build, ship, and collaborate.
            </p>
          </div>
          <div className="space-y-3">
            {perks.map(p => (
              <div key={p} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-green-500/20 border border-green-500/30
                                flex items-center justify-center flex-shrink-0">
                  <CheckIcon className="w-3.5 h-3.5 text-green-400" />
                </div>
                <span className="text-text-secondary text-sm">{p}</span>
              </div>
            ))}
          </div>
          <div className="gradient-border p-4">
            <p className="text-text-muted text-xs leading-relaxed">
              🤖 <span className="text-indigo-400 font-medium">GitPage AI</span> is available on all plans —
              get instant code reviews, bug detection, and intelligent suggestions from your first commit.
            </p>
          </div>
        </motion.div>

        {/* Right – Form */}
        <motion.div
          initial={{ opacity:0, x:20 }}
          animate={{ opacity:1, x:0 }}
        >
          {/* Logo */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600
                              flex items-center justify-center shadow-glow">
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57
                    0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695
                    -.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99
                    .105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225
                    -.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3
                    .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225
                    0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0
                    .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                </svg>
              </div>
              <span className="text-xl font-black gradient-text">GitPage</span>
            </div>
            <h2 className="text-lg font-bold text-text-primary">Create your account</h2>
          </div>

          <div className="gradient-border p-6">
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20
                              text-red-400 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-sm text-text-secondary mb-1.5">Username</label>
                <input
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="johndoe"
                  required
                  pattern="[a-zA-Z0-9_-]+"
                  className="w-full bg-bg-secondary border border-[#2a2a3a] rounded-lg px-3 py-2.5
                             text-sm text-text-primary placeholder-text-muted outline-none
                             focus:border-indigo-500/60 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm text-text-secondary mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  className="w-full bg-bg-secondary border border-[#2a2a3a] rounded-lg px-3 py-2.5
                             text-sm text-text-primary placeholder-text-muted outline-none
                             focus:border-indigo-500/60 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm text-text-secondary mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    required
                    minLength={8}
                    className="w-full bg-bg-secondary border border-[#2a2a3a] rounded-lg px-3 py-2.5
                               pr-10 text-sm text-text-primary placeholder-text-muted outline-none
                               focus:border-indigo-500/60 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted
                               hover:text-text-secondary transition-colors"
                  >
                    {showPass ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                  </button>
                </div>
                {password && (
                  <div className="mt-2">
                    <div className="flex gap-1 mb-1">
                      {[1,2,3,4].map(i => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-all ${
                            i <= strength ? strengthColor : 'bg-[#2a2a3a]'
                          }`}
                        />
                      ))}
                    </div>
                    <p className={`text-xs ${
                      strength <= 1 ? 'text-red-400' :
                      strength === 2 ? 'text-yellow-400' :
                      strength === 3 ? 'text-blue-400' : 'text-green-400'
                    }`}>
                      {strengthLabel}
                    </p>
                  </div>
                )}
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <div
                  onClick={() => setAgreed(v => !v)}
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center
                              flex-shrink-0 mt-0.5 transition-colors cursor-pointer ${
                    agreed ? 'bg-indigo-600 border-indigo-600' : 'border-[#2a2a3a]'
                  }`}
                >
                  {agreed && <CheckIcon className="w-3 h-3 text-white" />}
                </div>
                <span className="text-xs text-text-muted leading-relaxed">
                  I agree to the{' '}
                  <Link to="/terms" className="text-indigo-400 hover:text-indigo-300">Terms of Service</Link>
                  {' '}and{' '}
                  <Link to="/privacy" className="text-indigo-400 hover:text-indigo-300">Privacy Policy</Link>
                </span>
              </label>

              <motion.button
                whileTap={{ scale:0.97 }}
                type="submit"
                disabled={loading || !agreed}
                className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500
                           text-white font-medium text-sm disabled:opacity-60
                           disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Creating account…
                  </>
                ) : 'Create account'}
              </motion.button>
            </form>
          </div>

          <p className="text-center text-sm text-text-muted mt-4">
            Already have an account?{' '}
            <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-medium">
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default RegisterPage;