import React, { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';
import toast from 'react-hot-toast';

const ERROR_MESSAGES: Record<string, string> = {
  github_denied: 'GitHub login was cancelled.',
  github_failed: 'GitHub login failed. Please try again.',
  google_denied: 'Google login was cancelled.',
  google_failed: 'Google login failed. Please try again.',
};

const OAuthCallbackPage: React.FC = () => {
  const [params]           = useSearchParams();
  const navigate           = useNavigate();
  const { loginWithToken } = useAuthContext();  // ← now always a function
  const handled            = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const token    = params.get('token');
    const provider = params.get('provider') ?? 'OAuth';
    const error    = params.get('error');
    console.log(token,provider,error)
    // ── error from backend redirect ──────────────────────────────────────────
    if (error) {
      toast.error(ERROR_MESSAGES[error] ?? 'OAuth login failed.');
      navigate('/login', { replace: true });
      return;
    }

    // ── no token ─────────────────────────────────────────────────────────────
    if (!token) {
      toast.error('No token received. Please try again.');
      navigate('/login', { replace: true });
      return;
    }

    // ── complete sign-in ──────────────────────────────────────────────────────
    console.log("tokenP:",token)
    loginWithToken(token)
      .then(() => {
        toast.success(`Signed in with ${provider}! 🎉`);
        navigate('/dashboard', { replace: true });
      })
      .catch((err) => {
        console.error('OAuthCallback error:', err);
        toast.error('Failed to complete sign-in. Please try again.');
        // navigate('/login', { replace: true });
      });

  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center">
      <div className="text-center space-y-4">
        {/* Spinner */}
        <div className="relative w-16 h-16 mx-auto">
          <div className="absolute inset-0 rounded-full border-4 border-[#2a2a3a]" />
          <div className="absolute inset-0 rounded-full border-4 border-t-indigo-500 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
        </div>
        <p className="text-text-primary font-medium">Completing sign-in…</p>
        <p className="text-text-muted text-xs">Please wait, this will only take a moment.</p>
      </div>
    </div>
  );
};

export default OAuthCallbackPage;