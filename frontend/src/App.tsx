import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Layout/Navbar';
import Footer from './components/Layout/Footer';
import { useSelector } from 'react-redux';
import { RootState } from './store';
import OAuthCallbackPage from './pages/OAuthCallbackPage';
import MyRepositoriesPage from './pages/MyRepositoriesPage/MyRepositoriesPage';

const LandingPage    = lazy(() => import('./pages/Landing/LandingPage'));
const Dashboard      = lazy(() => import('./pages/Dashboard/Dashboard'));
const ProfilePage    = lazy(() => import('./pages/Profile/ProfilePage'));
const RepositoryPage = lazy(() => import('./pages/Repository/RepositoryPage'));
const IssuesPage     = lazy(() => import('./pages/Repository/IssuesPage'));
const PullRequestsPage = lazy(() => import('./pages/Repository/PullRequestsPage'));
const ActionsPage    = lazy(() => import('./pages/Repository/ActionsPage'));
const NewRepositoryPage = lazy(() => import('./pages/Repository/NewRepositoryPage'));
const AIDashboard    = lazy(() => import('./pages/AI/AIDashboard'));
const SettingsPage   = lazy(() => import('./pages/Settings/SettingsPage'));
const LoginPage      = lazy(() => import('./pages/Auth/LoginPage'));
const RegisterPage   = lazy(() => import('./pages/Auth/RegisterPage'));

const LoadingScreen: React.FC = () => (
  <div className="min-h-screen bg-bg-primary flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-glow animate-pulse-glow">
        <svg viewBox="0 0 24 24" className="w-7 h-7 text-white fill-current">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
        </svg>
      </div>
      <div className="flex gap-1">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  </div>
);

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

const App: React.FC = () => {
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);

  return (
    <div className="min-h-screen bg-bg-primary">
      <Navbar />
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route path="/" element={ <LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          {/* <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} /> */}
          <Route path="profile/:username" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/repositories" element = {<ProtectedRoute><MyRepositoriesPage /></ProtectedRoute>}/>
          <Route path="/:username/:repo" element={<RepositoryPage />} />
          <Route path="/:username/:repo/issues" element={<IssuesPage />} />
          <Route path="/:username/:repo/pulls" element={<PullRequestsPage />} />
          <Route path="/:username/:repo/actions" element={<ActionsPage />} />
          <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
          <Route path="/new" element={<ProtectedRoute><NewRepositoryPage /></ProtectedRoute>} />
          <Route path="/ai-dashboard" element={<ProtectedRoute><AIDashboard /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      <Footer />
    </div>
  );
};

export default App;