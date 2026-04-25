import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  UserIcon, ShieldCheckIcon, BellIcon, CodeBracketIcon,
  SparklesIcon, KeyIcon, TrashIcon, CheckIcon,
} from '@heroicons/react/24/outline';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import toast from 'react-hot-toast';

type Section = 'profile'|'account'|'security'|'notifications'|'ai'|'ssh'|'danger';

const sections: { id:Section; label:string; icon:React.ReactNode }[] = [
  { id:'profile',       label:'Public profile',   icon:<UserIcon className="w-4 h-4" />         },
  { id:'account',       label:'Account',           icon:<KeyIcon className="w-4 h-4" />          },
  { id:'security',      label:'Password & auth',   icon:<ShieldCheckIcon className="w-4 h-4" />  },
  { id:'notifications', label:'Notifications',     icon:<BellIcon className="w-4 h-4" />         },
  { id:'ai',            label:'AI Settings',       icon:<SparklesIcon className="w-4 h-4" />     },
  { id:'ssh',           label:'SSH & GPG keys',    icon:<CodeBracketIcon className="w-4 h-4" />  },
  { id:'danger',        label:'Danger zone',       icon:<TrashIcon className="w-4 h-4" />        },
];

const SettingsPage: React.FC = () => {
  const { user } = useSelector((s: RootState) => s.auth);
  const [section, setSection] = useState<Section>('profile');

  // Profile form state
  const [name,     setName]     = useState(user?.username || '');
  const [bio,      setBio]      = useState(user?.bio || '');
  const [website,  setWebsite]  = useState(user?.website || '');
  const [company,  setCompany]  = useState(user?.company || '');
  const [location, setLocation] = useState(user?.location || '');

  // AI settings
  const [aiEnabled,      setAiEnabled]      = useState(true);
  const [aiAutoReview,   setAiAutoReview]   = useState(true);
  const [aiSuggestions,  setAiSuggestions]  = useState(true);
  const [aiSecurityScan, setAiSecurityScan] = useState(true);
  const [aiModel,        setAiModel]        = useState('gpt-4');

  // Notification settings
  const [notifEmail,  setNotifEmail]  = useState(true);
  const [notifPR,     setNotifPR]     = useState(true);
  const [notifIssues, setNotifIssues] = useState(true);
  const [notifAI,     setNotifAI]     = useState(true);

  const saveProfile = () => {
    toast.success('Profile updated successfully!');
  };

  const Toggle: React.FC<{ value:boolean; onChange:(v:boolean)=>void }> = ({ value, onChange }) => (
    <button
      onClick={() => onChange(!value)}
      className={`relative w-11 h-6 rounded-full transition-colors ${
        value ? 'bg-indigo-600' : 'bg-[#2a2a3a]'
      }`}
    >
      <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow
      transition-transform ${value ? 'translate-x-5' : 'translate-x-0'}`}
      />
    </button>
  );

  return (
    <div className="min-h-screen bg-bg-primary pt-14">
      <div className="max-w-screen-xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

          {/* ── Sidebar ─────────────────────────────────────────── */}
          <div className="lg:col-span-1">
            <h2 className="font-bold text-text-primary text-lg mb-4">Settings</h2>
            <nav className="space-y-0.5">
              {sections.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSection(s.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm
                              transition-colors text-left ${
                    section === s.id
                      ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                      : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
                  } ${s.id === 'danger' ? '!text-red-400 hover:!bg-red-500/10' : ''}`}
                >
                  {s.icon}
                  {s.label}
                </button>
              ))}
            </nav>
          </div>

          {/* ── Content ─────────────────────────────────────────── */}
          <div className="lg:col-span-3">
            <motion.div
              key={section}
              initial={{ opacity:0, y:10 }}
              animate={{ opacity:1, y:0 }}
              transition={{ duration:0.2 }}
            >

              {/* ── PROFILE ─────────────────────────────────────── */}
              {section === 'profile' && (
                <div className="space-y-6">
                  <div className="gradient-border p-6">
                    <h3 className="font-bold text-text-primary text-lg mb-6">Public Profile</h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Avatar */}
                      <div className="md:col-span-1 flex flex-col items-center gap-3">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-400
                                        to-purple-600 flex items-center justify-center text-3xl
                                        font-black text-white shadow-glow">
                          {name.slice(0,2).toUpperCase() || 'GP'}
                        </div>
                        <button className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
                          Upload photo
                        </button>
                        <p className="text-xs text-text-muted text-center">
                          PNG, JPG, GIF up to 10MB
                        </p>
                      </div>

                      {/* Fields */}
                      <div className="md:col-span-2 space-y-4">
                        <div>
                          <label className="block text-sm text-text-secondary mb-1.5">Name</label>
                          <input
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full bg-bg-secondary border border-[#2a2a3a] rounded-lg
                                       px-3 py-2.5 text-sm text-text-primary outline-none
                                       focus:border-indigo-500/60 transition-colors"
                          />
                        </div>

                        <div>
                          <label className="block text-sm text-text-secondary mb-1.5">Bio</label>
                          <textarea
                            value={bio}
                            onChange={e => setBio(e.target.value)}
                            rows={3}
                            maxLength={160}
                            placeholder="Tell us a little about yourself"
                            className="w-full bg-bg-secondary border border-[#2a2a3a] rounded-lg
                                       px-3 py-2.5 text-sm text-text-primary placeholder-text-muted
                                       outline-none resize-none focus:border-indigo-500/60 transition-colors"
                          />
                          <p className="text-xs text-text-muted mt-1">{bio.length}/160</p>
                        </div>

                        <div>
                          <label className="block text-sm text-text-secondary mb-1.5">Website</label>
                          <input
                            value={website}
                            onChange={e => setWebsite(e.target.value)}
                            placeholder="https://example.com"
                            className="w-full bg-bg-secondary border border-[#2a2a3a] rounded-lg
                                       px-3 py-2.5 text-sm text-text-primary placeholder-text-muted
                                       outline-none focus:border-indigo-500/60 transition-colors"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm text-text-secondary mb-1.5">Company</label>
                            <input
                              value={company}
                              onChange={e => setCompany(e.target.value)}
                              placeholder="@company"
                              className="w-full bg-bg-secondary border border-[#2a2a3a] rounded-lg
                                         px-3 py-2.5 text-sm text-text-primary placeholder-text-muted
                                         outline-none focus:border-indigo-500/60 transition-colors"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-text-secondary mb-1.5">Location</label>
                            <input
                              value={location}
                              onChange={e => setLocation(e.target.value)}
                              placeholder="City, Country"
                              className="w-full bg-bg-secondary border border-[#2a2a3a] rounded-lg
                                         px-3 py-2.5 text-sm text-text-primary placeholder-text-muted
                                         outline-none focus:border-indigo-500/60 transition-colors"
                            />
                          </div>
                        </div>

                        <button
                          onClick={saveProfile}
                          className="flex items-center gap-2 px-5 py-2 rounded-lg bg-indigo-600
                                     hover:bg-indigo-500 text-white text-sm transition-colors"
                        >
                          <CheckIcon className="w-4 h-4" />
                          Save profile
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── ACCOUNT ─────────────────────────────────────── */}
              {section === 'account' && (
                <div className="space-y-4">
                  <div className="gradient-border p-6">
                    <h3 className="font-bold text-text-primary text-lg mb-6">Account Settings</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm text-text-secondary mb-1.5">Username</label>
                        <div className="flex gap-2">
                          <input
                            defaultValue={user?.username}
                            className="flex-1 bg-bg-secondary border border-[#2a2a3a] rounded-lg
                                       px-3 py-2.5 text-sm text-text-primary outline-none
                                       focus:border-indigo-500/60 transition-colors"
                          />
                          <button
                            onClick={() => toast.success('Username updated!')}
                            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500
                                       text-white text-sm transition-colors whitespace-nowrap"
                          >
                            Update
                          </button>
                        </div>
                        <p className="text-xs text-text-muted mt-1">
                          Changing username may break existing links to your repositories.
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm text-text-secondary mb-1.5">Email</label>
                        <div className="flex gap-2">
                          <input
                            defaultValue={user?.email}
                            type="email"
                            className="flex-1 bg-bg-secondary border border-[#2a2a3a] rounded-lg
                                       px-3 py-2.5 text-sm text-text-primary outline-none
                                       focus:border-indigo-500/60 transition-colors"
                          />
                          <button
                            onClick={() => toast.success('Email updated!')}
                            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500
                                       text-white text-sm transition-colors"
                          >
                            Update
                          </button>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-[#2a2a3a]">
                        <h4 className="font-semibold text-text-primary text-sm mb-3">Plan</h4>
                        <div className="gradient-border p-4 flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-text-primary flex items-center gap-2">
                              Free Plan
                              <span className="badge badge-success">Active</span>
                            </p>
                            <p className="text-xs text-text-muted mt-1">
                              Unlimited public repos · 2,000 CI/CD mins/mo · AI included
                            </p>
                          </div>
                          <button
                            className="px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600
                                       text-white text-sm font-medium hover:opacity-90 transition-opacity"
                          >
                            Upgrade to Pro
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── SECURITY ────────────────────────────────────── */}
              {section === 'security' && (
                <div className="space-y-4">
                  <div className="gradient-border p-6">
                    <h3 className="font-bold text-text-primary text-lg mb-6">Password & Security</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm text-text-secondary mb-1.5">Current password</label>
                        <input
                          type="password"
                          placeholder="••••••••"
                          className="w-full bg-bg-secondary border border-[#2a2a3a] rounded-lg
                                     px-3 py-2.5 text-sm text-text-primary placeholder-text-muted
                                     outline-none focus:border-indigo-500/60 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-text-secondary mb-1.5">New password</label>
                        <input
                          type="password"
                          placeholder="••••••••"
                          className="w-full bg-bg-secondary border border-[#2a2a3a] rounded-lg
                                     px-3 py-2.5 text-sm text-text-primary placeholder-text-muted
                                     outline-none focus:border-indigo-500/60 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-text-secondary mb-1.5">Confirm new password</label>
                        <input
                          type="password"
                          placeholder="••••••••"
                          className="w-full bg-bg-secondary border border-[#2a2a3a] rounded-lg
                                     px-3 py-2.5 text-sm text-text-primary placeholder-text-muted
                                     outline-none focus:border-indigo-500/60 transition-colors"
                        />
                      </div>
                      <button
                        onClick={() => toast.success('Password updated!')}
                        className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500
                                   text-white text-sm transition-colors"
                      >
                        Update password
                      </button>
                    </div>
                  </div>

                  <div className="gradient-border p-6">
                    <h4 className="font-semibold text-text-primary mb-1">Two-factor authentication</h4>
                    <p className="text-text-muted text-sm mb-4">
                      Add an extra layer of security to your account.
                    </p>
                    <button
                      onClick={() => toast.success('2FA setup initiated!')}
                      className="px-5 py-2 rounded-lg border border-[#2a2a3a] hover:bg-bg-tertiary
                                 text-text-secondary hover:text-text-primary text-sm transition-colors"
                    >
                      Enable 2FA
                    </button>
                  </div>

                  <div className="gradient-border p-6">
                    <h4 className="font-semibold text-text-primary mb-1">Active sessions</h4>
                    <p className="text-text-muted text-sm mb-4">
                      Manage devices that are currently signed in to your account.
                    </p>
                    {[
                      { device:'Chrome on macOS', location:'San Francisco, CA', current:true,  time:'Now'     },
                      { device:'Firefox on Windows', location:'New York, NY',  current:false, time:'3d ago'  },
                      { device:'Safari on iPhone',   location:'Los Angeles, CA',current:false, time:'1w ago'  },
                    ].map((sess, i) => (
                      <div key={i}
                           className="flex items-center justify-between py-3 border-b border-[#2a2a3a] last:border-0">
                        <div>
                          <p className="text-sm text-text-primary flex items-center gap-2">
                            {sess.device}
                            {sess.current && <span className="badge badge-success text-[10px]">Current</span>}
                          </p>
                          <p className="text-xs text-text-muted mt-0.5">
                            {sess.location} · {sess.time}
                          </p>
                        </div>
                        {!sess.current && (
                          <button
                            onClick={() => toast.success('Session revoked')}
                            className="text-xs text-red-400 hover:text-red-300 transition-colors"
                          >
                            Revoke
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── NOTIFICATIONS ───────────────────────────────── */}
              {section === 'notifications' && (
                <div className="gradient-border p-6">
                  <h3 className="font-bold text-text-primary text-lg mb-6">Notification Preferences</h3>
                  <div className="space-y-0">
                    {[
                      { label:'Email notifications',    desc:'Receive updates via email',                    value:notifEmail,  set:setNotifEmail  },
                      { label:'Pull request activity',  desc:'Notify on PR reviews, comments, merges',       value:notifPR,     set:setNotifPR     },
                      { label:'Issue activity',         desc:'Notify on issue comments and status changes',  value:notifIssues, set:setNotifIssues },
                      { label:'AI insights',            desc:'Notify when AI finds issues in your code',     value:notifAI,     set:setNotifAI     },
                    ].map((item, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between py-4 border-b border-[#2a2a3a] last:border-0"
                      >
                        <div>
                          <p className="text-sm font-medium text-text-primary">{item.label}</p>
                          <p className="text-xs text-text-muted mt-0.5">{item.desc}</p>
                        </div>
                        <Toggle value={item.value} onChange={item.set} />
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => toast.success('Notification settings saved!')}
                    className="mt-6 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500
                               text-white text-sm transition-colors"
                  >
                    Save preferences
                  </button>
                </div>
              )}

              {/* ── AI SETTINGS ─────────────────────────────────── */}
              {section === 'ai' && (
                <div className="space-y-4">
                  <div className="gradient-border p-6">
                    <h3 className="font-bold text-text-primary text-lg mb-1 flex items-center gap-2">
                      <SparklesIcon className="w-5 h-5 text-indigo-400" />
                      AI Assistant Settings
                    </h3>
                    <p className="text-text-muted text-sm mb-6">
                      Configure how GitPage AI behaves across your repositories.
                    </p>

                    <div className="space-y-0">
                      {[
                        { label:'Enable AI features',      desc:'Turn on all AI-powered features',                value:aiEnabled,      set:setAiEnabled      },
                        { label:'Auto PR review',           desc:'AI automatically reviews pull requests',         value:aiAutoReview,   set:setAiAutoReview   },
                        { label:'Inline suggestions',       desc:'Show AI suggestions while coding',               value:aiSuggestions,  set:setAiSuggestions  },
                        { label:'Security scanning',        desc:'AI scans commits for vulnerabilities',           value:aiSecurityScan, set:setAiSecurityScan },
                      ].map((item, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between py-4 border-b border-[#2a2a3a] last:border-0"
                        >
                          <div>
                            <p className="text-sm font-medium text-text-primary">{item.label}</p>
                            <p className="text-xs text-text-muted mt-0.5">{item.desc}</p>
                          </div>
                          <Toggle value={item.value} onChange={item.set} />
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 pt-6 border-t border-[#2a2a3a]">
                      <label className="block text-sm text-text-secondary mb-1.5">AI Model</label>
                      <select
                        value={aiModel}
                        onChange={e => setAiModel(e.target.value)}
                        className="w-full max-w-xs bg-bg-secondary border border-[#2a2a3a] rounded-lg
                                   px-3 py-2.5 text-sm text-text-primary outline-none"
                      >
                        <option value="gpt-4">GPT-4 (Recommended)</option>
                        <option value="gpt-4-turbo">GPT-4 Turbo (Faster)</option>
                        <option value="gpt-3.5">GPT-3.5 (Lighter)</option>
                        <option value="claude-3">Claude 3 Opus</option>
                        <option value="gemini-pro">Gemini Pro</option>
                      </select>
                      <p className="text-xs text-text-muted mt-1">
                        The model used for code analysis and chat assistance.
                      </p>
                    </div>

                    <div className="mt-6">
                      <label className="block text-sm text-text-secondary mb-1.5">
                        OpenAI API Key <span className="text-text-muted">(optional)</span>
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="password"
                          placeholder="sk-••••••••••••••••••••••••"
                          className="flex-1 bg-bg-secondary border border-[#2a2a3a] rounded-lg
                                     px-3 py-2.5 text-sm text-text-primary placeholder-text-muted
                                     outline-none focus:border-indigo-500/60 transition-colors"
                        />
                        <button
                          onClick={() => toast.success('API key saved!')}
                          className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500
                                     text-white text-sm transition-colors"
                        >
                          Save
                        </button>
                      </div>
                      <p className="text-xs text-text-muted mt-1">
                        Provide your own API key for increased rate limits.
                      </p>
                    </div>

                    <button
                      onClick={() => toast.success('AI settings saved!')}
                      className="mt-6 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500
                                 text-white text-sm transition-colors"
                    >
                      Save AI settings
                    </button>
                  </div>
                </div>
              )}

              {/* ── SSH KEYS ────────────────────────────────────── */}
              {section === 'ssh' && (
                <div className="space-y-4">
                  <div className="gradient-border p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="font-bold text-text-primary text-lg">SSH Keys</h3>
                      <button
                        onClick={() => toast.success('Add SSH key dialog')}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-600
                                   hover:bg-indigo-500 text-white text-sm transition-colors"
                      >
                        + New SSH key
                      </button>
                    </div>
                    {[
                      { title:'MacBook Pro', fingerprint:'SHA256:abc123def456...', added:'Jan 12, 2024', last:'Today' },
                      { title:'Work Laptop', fingerprint:'SHA256:xyz789uvw012...', added:'Mar 5, 2024',  last:'3d ago' },
                    ].map((key, i) => (
                      <div key={i}
                           className="py-4 border-b border-[#2a2a3a] last:border-0 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-text-primary flex items-center gap-2">
                            <KeyIcon className="w-4 h-4 text-indigo-400" />
                            {key.title}
                          </p>
                          <code className="text-xs text-text-muted font-mono">{key.fingerprint}</code>
                          <p className="text-xs text-text-muted mt-0.5">
                            Added {key.added} · Last used {key.last}
                          </p>
                        </div>
                        <button
                          onClick={() => toast.success('SSH key deleted')}
                          className="text-xs text-red-400 hover:text-red-300 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="gradient-border p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="font-bold text-text-primary text-lg">GPG Keys</h3>
                      <button
                        onClick={() => toast.success('Add GPG key dialog')}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-600
                                   hover:bg-indigo-500 text-white text-sm transition-colors"
                      >
                        + New GPG key
                      </button>
                    </div>
                    <p className="text-text-muted text-sm">No GPG keys added yet.</p>
                  </div>
                </div>
              )}

              {/* ── DANGER ZONE ─────────────────────────────────── */}
              {section === 'danger' && (
                <div className="space-y-4">
                  <div className="gradient-border border-red-500/20 p-6">
                    <h3 className="font-bold text-red-400 text-lg mb-1">⚠ Danger Zone</h3>
                    <p className="text-text-muted text-sm mb-6">
                      These actions are irreversible. Please proceed with caution.
                    </p>
                    <div className="space-y-4">
                      {[
                        {
                          title:'Export account data',
                          desc:'Download a copy of all your data including repositories, issues, and settings.',
                          action:'Export data',
                          style:'border border-[#2a2a3a] text-text-secondary hover:bg-bg-tertiary',
                        },
                        {
                          title:'Make account private',
                          desc:'Hide your profile and repositories from non-authenticated users.',
                          action:'Make private',
                          style:'border border-yellow-500/30 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20',
                        },
                        {
                          title:'Delete account',
                          desc:'Permanently delete your account and all associated data. This cannot be undone.',
                          action:'Delete my account',
                          style:'border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20',
                        },
                      ].map((item, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-4 rounded-xl border border-[#2a2a3a] bg-bg-secondary"
                        >
                          <div>
                            <p className="text-sm font-semibold text-text-primary">{item.title}</p>
                            <p className="text-xs text-text-muted mt-0.5 max-w-sm">{item.desc}</p>
                          </div>
                          <button
                            onClick={() => toast.error(`Action: ${item.action}`)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
                                        whitespace-nowrap ml-4 ${item.style}`}
                          >
                            {item.action}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;