import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BellIcon, MagnifyingGlassIcon, PlusIcon,
  ChevronDownIcon, SparklesIcon, Bars3Icon, XMarkIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../hooks/useAuth';

const Navbar: React.FC = () => {
  const { isAuthenticated, user, handleLogout } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showUser, setShowUser] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showCmd, setShowCmd] = useState(false);
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCmd(v => !v);
      }
      if (e.key === 'Escape') {
        setShowCmd(false);
        setShowSearch(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const notifications = [
    { id: 1, msg: 'PR merged in awesome-project', time: '2m', read: false },
    { id: 2, msg: 'New issue: Bug in auth flow',  time: '15m', read: false },
    { id: 3, msg: 'John starred your repo',        time: '1h',  read: true  },
    { id: 4, msg: 'AI analysis complete',          time: '2h',  read: true  },
  ];
  const unread = notifications.filter(n => !n.read).length;

  const createItems = [
    { label: 'New repository',   icon: '📦', path: '/new'               },
    { label: 'Import repository',icon: '📥', path: '/import'            },
    { label: 'New gist',         icon: '📝', path: '/gist/new'          },
    { label: 'New organization', icon: '🏢', path: '/organizations/new' },
    { label: 'New project',      icon: '📋', path: '/projects/new'      },
  ];

  const userMenuItems = [
    { label: 'Your profile',      path: `/profile/${user?.username}`                  },
    { label: 'Your repositories', path: `/repositories` },
    { label: 'Your projects',     path: '/projects'                           },
    { label: 'Your stars',        path: `/${user?.username}?tab=stars`        },
    { label: 'AI Dashboard',      path: '/ai-dashboard'                       },
    { label: 'Settings',          path: '/settings'                           },
  ];

  const cmdItems = [
    { icon: '📦', label: 'New repository',         key: 'N R' },
    { icon: '🤖', label: 'Open AI Assistant',       key: 'A I' },
    { icon: '🔍', label: 'Search repositories',     key: 'S R' },
    { icon: '⚙️', label: 'Open settings',           key: 'G S' },
    { icon: '🐛', label: 'AI Debug current file',   key: 'A D' },
    { icon: '📝', label: 'Create new issue',        key: 'C I' },
    { icon: '🔀', label: 'Create pull request',     key: 'C P' },
    { icon: '📊', label: 'View insights',           key: 'G I' },
  ];

  return (
    <>
      {/* ─── Main Nav ──────────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50 h-14 glass border-b border-[#2a2a3a]">
        <div className="max-w-screen-2xl mx-auto px-4 h-full flex items-center gap-3">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600
                            flex items-center justify-center shadow-glow">
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205
                  11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015
                  1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925
                  0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135
                  3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805
                  5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02
                  0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
              </svg>
            </div>
            <span className="font-bold text-lg gradient-text hidden sm:block">GitPage</span>
          </Link>

          {/* Search */}
          <div className="flex-1 max-w-md">
            <button
              onClick={() => setShowCmd(true)}
              className="w-full flex items-center gap-2 bg-bg-secondary border border-[#2a2a3a]
                         rounded-lg px-3 py-1.5 text-sm text-text-muted hover:border-indigo-500/50
                         transition-colors"
            >
              <MagnifyingGlassIcon className="w-4 h-4" />
              <span className="flex-1 text-left">Search or jump to…</span>
              <kbd className="hidden md:flex items-center gap-0.5 text-xs bg-bg-tertiary
                              border border-[#2a2a3a] rounded px-1.5 py-0.5">⌘K</kbd>
            </button>
          </div>

          {/* Desktop links */}
          <div className="hidden lg:flex items-center gap-1">
            {['Pull Requests','Issues','Marketplace','Explore'].map(item => (
              <Link
                key={item}
                to={`/${item.toLowerCase().replace(' ','-')}`}
                className="text-sm text-text-secondary hover:text-text-primary px-3 py-1.5
                           rounded-lg hover:bg-bg-tertiary transition-all whitespace-nowrap"
              >
                {item}
              </Link>
            ))}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2 ml-auto">

            {/* AI Button */}
            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/ai-dashboard')}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                         bg-gradient-to-r from-indigo-500/20 to-purple-600/20
                         border border-indigo-500/30 text-indigo-400 text-sm
                         hover:from-indigo-500/30 hover:to-purple-600/30 transition-all ai-glow"
            >
              <SparklesIcon className="w-4 h-4" />
              <span className="hidden xl:block">AI Assistant</span>
            </motion.button>

            {/* Create */}
            <div className="relative">
              <button
                onClick={() => setShowCreate(v => !v)}
                className="flex items-center gap-0.5 p-1.5 rounded-lg hover:bg-bg-tertiary
                           text-text-secondary hover:text-text-primary transition-colors"
              >
                <PlusIcon className="w-5 h-5" />
                <ChevronDownIcon className="w-3 h-3" />
              </button>
              <AnimatePresence>
                {showCreate && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -5 }}
                    animate={{ opacity: 1, scale: 1,    y: 0  }}
                    exit  ={{ opacity: 0, scale: 0.95, y: -5 }}
                    className="absolute right-0 top-full mt-2 w-52 bg-bg-card border border-[#2a2a3a]
                               rounded-xl shadow-card py-2 z-50"
                  >
                    {createItems.map(item => (
                      <button
                        key={item.label}
                        onClick={() => { navigate(item.path); setShowCreate(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm
                                   text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
                      >
                        <span>{item.icon}</span><span>{item.label}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotif(v => !v)}
                className="relative p-1.5 rounded-lg hover:bg-bg-tertiary
                           text-text-secondary hover:text-text-primary transition-colors"
              >
                <BellIcon className="w-5 h-5" />
                {unread > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent-danger rounded-full
                                   text-[10px] flex items-center justify-center text-white font-bold">
                    {unread}
                  </span>
                )}
              </button>
              <AnimatePresence>
                {showNotif && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -5 }}
                    animate={{ opacity: 1, scale: 1,    y: 0  }}
                    exit  ={{ opacity: 0, scale: 0.95, y: -5 }}
                    className="absolute right-0 top-full mt-2 w-80 bg-bg-card border border-[#2a2a3a]
                               rounded-xl shadow-card overflow-hidden z-50"
                  >
                    <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a3a]">
                      <h3 className="font-semibold text-text-primary">Notifications</h3>
                      <button className="text-xs text-indigo-400 hover:text-indigo-300">Mark all read</button>
                    </div>
                    <div className="max-h-72 overflow-y-auto">
                      {notifications.map(n => (
                        <div
                          key={n.id}
                          className={`px-4 py-3 hover:bg-bg-tertiary cursor-pointer transition-colors
                                      border-l-2 ${n.read ? 'border-transparent' : 'border-indigo-500'}`}
                        >
                          <p className="text-sm text-text-primary">{n.msg}</p>
                          <p className="text-xs text-text-muted mt-0.5">{n.time} ago</p>
                        </div>
                      ))}
                    </div>
                    <div className="px-4 py-2 border-t border-[#2a2a3a] text-center">
                      <Link to="/notifications" className="text-sm text-indigo-400 hover:text-indigo-300">
                        View all
                      </Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* User menu */}
            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setShowUser(v => !v)}
                  className="flex items-center gap-1.5"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500
                                  flex items-center justify-center text-white text-sm font-semibold
                                  ring-2 ring-transparent hover:ring-indigo-500/50 transition-all">
                    {user?.username?.slice(0,2).toUpperCase() || 'GP'}
                  </div>
                  <ChevronDownIcon className="w-3 h-3 text-text-muted hidden md:block" />
                </button>
                <AnimatePresence>
                  {showUser && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -5 }}
                      animate={{ opacity: 1, scale: 1,    y: 0  }}
                      exit  ={{ opacity: 0, scale: 0.95, y: -5 }}
                      className="absolute right-0 top-full mt-2 w-56 bg-bg-card border border-[#2a2a3a]
                                 rounded-xl shadow-card py-2 z-50"
                    >
                      <div className="px-4 py-3 border-b border-[#2a2a3a]">
                        <p className="text-sm font-medium text-text-primary">{user?.username}</p>
                        <p className="text-xs text-text-muted">{user?.email}</p>
                      </div>
                      {userMenuItems.map(item => (
                        <Link
                          key={item.label}
                          to={item.path}
                          onClick={() => setShowUser(false)}
                          className="flex px-4 py-2 text-sm text-text-secondary
                                     hover:text-text-primary hover:bg-bg-tertiary transition-colors"
                        >
                          {item.label}
                        </Link>
                      ))}
                      <div className="border-t border-[#2a2a3a] mt-2 pt-2">
                        <button
                          onClick={handleLogout}
                          className="w-full text-left px-4 py-2 text-sm text-accent-danger
                                     hover:bg-bg-tertiary transition-colors"
                        >
                          Sign out
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login"
                  className="text-sm text-text-secondary hover:text-text-primary px-3 py-1.5
                             rounded-lg hover:bg-bg-tertiary transition-colors">
                  Sign in
                </Link>
                <Link to="/register"
                  className="text-sm bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5
                             rounded-lg transition-colors">
                  Sign up
                </Link>
              </div>
            )}

            {/* Mobile toggle */}
            <button
              onClick={() => setMobile(v => !v)}
              className="lg:hidden p-1.5 rounded-lg hover:bg-bg-tertiary text-text-secondary"
            >
              {mobile ? <XMarkIcon className="w-5 h-5" /> : <Bars3Icon className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobile && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit  ={{ height: 0, opacity: 0 }}
              className="lg:hidden border-t border-[#2a2a3a] bg-bg-secondary overflow-hidden"
            >
              <div className="px-4 py-3 space-y-1">
                {['Pull Requests','Issues','Marketplace','Explore','AI Assistant'].map(item => (
                  <Link
                    key={item}
                    to={`/${item.toLowerCase().replace(/ /g,'-')}`}
                    onClick={() => setMobile(false)}
                    className="block px-3 py-2 text-sm text-text-secondary hover:text-text-primary
                               hover:bg-bg-tertiary rounded-lg transition-colors"
                  >
                    {item}
                  </Link>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ─── Command Palette ────────────────────────────────────────── */}
      <AnimatePresence>
        {showCmd && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit  ={{ opacity: 0 }}
            onClick={() => setShowCmd(false)}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm
                       flex items-start justify-center pt-20 px-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: -20 }}
              animate={{ scale: 1, y: 0 }}
              exit  ={{ scale: 0.95, y: -20 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-lg bg-bg-card border border-[#2a2a3a]
                         rounded-2xl shadow-glow-lg overflow-hidden"
            >
              <div className="flex items-center gap-3 px-4 py-3 border-b border-[#2a2a3a]">
                <MagnifyingGlassIcon className="w-5 h-5 text-indigo-400" />
                <input
                  autoFocus
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Type a command or search…"
                  className="flex-1 bg-transparent text-text-primary placeholder-text-muted outline-none text-sm"
                />
                <kbd className="text-xs text-text-muted bg-bg-tertiary border border-[#2a2a3a] rounded px-2 py-1">
                  ESC
                </kbd>
              </div>
              <div className="p-2 max-h-72 overflow-y-auto">
                {cmdItems
                  .filter(c => c.label.toLowerCase().includes(query.toLowerCase()))
                  .map(cmd => (
                    <div
                      key={cmd.label}
                      className="flex items-center justify-between px-3 py-2.5 rounded-lg
                                 hover:bg-bg-tertiary cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{cmd.icon}</span>
                        <span className="text-sm text-text-primary">{cmd.label}</span>
                      </div>
                      <kbd className="text-xs text-text-muted bg-bg-secondary border border-[#2a2a3a]
                                      rounded px-2 py-0.5">{cmd.key}</kbd>
                    </div>
                  ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;