import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useParams, Link } from 'react-router-dom';
import {
  MapPinIcon, LinkIcon, BuildingOfficeIcon,
  StarIcon, CodeBracketIcon, ArrowPathIcon,
  CalendarIcon, SparklesIcon,
} from '@heroicons/react/24/outline';
import ContributionGraph from '../../components/Dashboard/ContributionGraph';
import { getLanguageColor, formatNumber } from '../../utils/helpers';

type Tab = 'overview'|'repositories'|'projects'|'packages'|'stars';

const REPOS = [
  { name:'awesome-project',  lang:'TypeScript', stars:234, forks:12, desc:'Full-stack web application with modern tech', updated:'2h ago',  private:false },
  { name:'react-components', lang:'JavaScript', stars:89,  forks:5,  desc:'Reusable React component library',             updated:'1d ago',  private:false },
  { name:'api-gateway',      lang:'Python',     stars:45,  forks:3,  desc:'Microservices API Gateway',                    updated:'3d ago',  private:false },
  { name:'ml-models',        lang:'Python',     stars:178, forks:23, desc:'Machine learning model collection',            updated:'5d ago',  private:false },
  { name:'cli-tools',        lang:'Go',         stars:56,  forks:8,  desc:'Developer CLI toolkit',                       updated:'1w ago',  private:false },
  { name:'devutils',         lang:'Rust',       stars:123, forks:14, desc:'High-performance dev utilities',               updated:'2w ago',  private:false },
];

const PINNED = REPOS.slice(0, 4);

const ProfilePage: React.FC = () => {
  const { username } = useParams<{ username:string }>();
  const [tab, setTab]         = useState<Tab>('overview');
  const [following, setFollowing] = useState(false);
  const [contributionCount, setContributionCount] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-bg-primary pt-14">
      <div className="max-w-screen-xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

          {/* ── Left: Profile sidebar ─────────────────────────────── */}
          <div className="lg:col-span-1 space-y-5">
            {/* Avatar */}
            <motion.div
              initial={{ opacity:0, y:20 }}
              animate={{ opacity:1, y:0 }}
              className="flex flex-col items-center lg:items-start"
            >
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-indigo-400 to-purple-600
                              flex items-center justify-center text-4xl font-black text-white
                              shadow-glow ring-4 ring-[#2a2a3a] mb-4">
                {username?.slice(0,2).toUpperCase()}
              </div>
              <h1 className="text-2xl font-black text-text-primary">{username}</h1>
              <p className="text-text-muted text-sm">@{username}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="badge badge-success">Pro</span>
                <span className="badge badge-primary ai-glow">AI Beta</span>
              </div>
            </motion.div>

            {/* Bio */}
            <p className="text-text-secondary text-sm leading-relaxed">
              Full-stack developer passionate about open source, AI, and building tools
              that developers love. ✨
            </p>

            {/* Follow button */}
            <motion.button
              whileTap={{ scale:0.95 }}
              onClick={() => setFollowing(v => !v)}
              className={`w-full py-2 rounded-lg text-sm font-medium transition-all ${
                following
                  ? 'border border-[#2a2a3a] text-text-secondary hover:bg-bg-tertiary bg-bg-secondary'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white'
              }`}
            >
              {following ? 'Following' : 'Follow'}
            </motion.button>

            {/* Meta */}
            <div className="space-y-2">
              {[
                { icon:<BuildingOfficeIcon className="w-4 h-4" />, text:'GitPage Inc.' },
                { icon:<MapPinIcon className="w-4 h-4" />,         text:'San Francisco, CA' },
                { icon:<LinkIcon className="w-4 h-4" />,           text:'gitpage.io', link:true },
                { icon:<CalendarIcon className="w-4 h-4" />,       text:'Joined January 2022' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-text-muted">
                  <span className="flex-shrink-0">{item.icon}</span>
                  {item.link
                    ? <a href="#" className="text-indigo-400 hover:underline">{item.text}</a>
                    : <span>{item.text}</span>
                  }
                </div>
              ))}
            </div>

            {/* Followers/Following */}
            <div className="flex items-center gap-4 text-sm">
              <Link to="#" className="text-text-secondary hover:text-text-primary transition-colors">
                <span className="font-bold text-text-primary">1.2k</span> followers
              </Link>
              <Link to="#" className="text-text-secondary hover:text-text-primary transition-colors">
                <span className="font-bold text-text-primary">234</span> following
              </Link>
            </div>

            {/* Top languages */}
            <div className="gradient-border p-4">
              <h4 className="text-xs text-text-muted uppercase tracking-wider mb-3">Top Languages</h4>
              {[
                { lang:'TypeScript', pct:45 },
                { lang:'Python',     pct:28 },
                { lang:'JavaScript', pct:17 },
                { lang:'Go',         pct:10 },
              ].map(item => (
                <div key={item.lang} className="mb-2">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="flex items-center gap-1.5 text-text-secondary">
                      <span className="w-2 h-2 rounded-full"
                            style={{ background: getLanguageColor(item.lang) }} />
                      {item.lang}
                    </span>
                    <span className="text-text-muted">{item.pct}%</span>
                  </div>
                  <div className="h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width:0 }}
                      animate={{ width:`${item.pct}%` }}
                      transition={{ duration:1, delay:0.3 }}
                      className="h-full rounded-full"
                      style={{ background: getLanguageColor(item.lang) }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Achievements */}
            <div className="gradient-border p-4">
              <h4 className="text-xs text-text-muted uppercase tracking-wider mb-3">Achievements</h4>
              <div className="flex flex-wrap gap-2">
                {['🦈 Shark','⭐ Starstruck','🧊 Arctic Code','🤖 AI Pioneer','🔒 Security Expert'].map(a => (
                  <span key={a} className="text-xs bg-bg-tertiary border border-[#2a2a3a]
                                           rounded-lg px-2 py-1 text-text-secondary">
                    {a}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* ── Right: Main content ──────────────────────────────── */}
          <div className="lg:col-span-3 space-y-6">
            {/* Tabs */}
            <div className="flex items-center gap-1 border-b border-[#2a2a3a] overflow-x-auto">
              {(['overview','repositories','projects','packages','stars'] as Tab[]).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-4 py-2 text-sm capitalize whitespace-nowrap transition-colors ${
                    tab === t
                      ? 'text-text-primary border-b-2 border-indigo-500 -mb-px'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {t}
                  {t === 'repositories' && (
                    <span className="ml-1.5 badge badge-primary">{REPOS.length}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Overview Tab */}
            {tab === 'overview' && (
              <motion.div
                initial={{ opacity:0 }}
                animate={{ opacity:1 }}
                className="space-y-6"
              >
                {/* Contribution Graph */}
                <div className="gradient-border p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-text-primary">
                      <span className="text-indigo-400">{contributionCount ?? 847}</span> contributions in 2024
                    </h3>
                  </div>
                  <ContributionGraph username={username} onTotalChange={setContributionCount} />
                </div>

                {/* Pinned Repos */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-text-primary text-sm">Pinned</h3>
                    <button className="text-xs text-indigo-400 hover:text-indigo-300">Customize</button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {PINNED.map((repo, i) => (
                      <motion.div
                        key={repo.name}
                        initial={{ opacity:0, y:10 }}
                        animate={{ opacity:1, y:0 }}
                        transition={{ delay: i * 0.07 }}
                      >
                        <Link
                          to={`/${username}/${repo.name}`}
                          className="block gradient-border p-4 hover:shadow-glow transition-all group"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <CodeBracketIcon className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                            <span className="text-indigo-400 font-medium text-sm
                                             group-hover:text-indigo-300 transition-colors truncate">
                              {repo.name}
                            </span>
                          </div>
                          <p className="text-text-muted text-xs mb-3 line-clamp-2">{repo.desc}</p>
                          <div className="flex items-center gap-3 text-xs text-text-muted">
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full"
                                    style={{ background: getLanguageColor(repo.lang) }} />
                              {repo.lang}
                            </span>
                            <span className="flex items-center gap-1">
                              <StarIcon className="w-3 h-3" />{repo.stars}
                            </span>
                            <span className="flex items-center gap-1">
                              <ArrowPathIcon className="w-3 h-3" />{repo.forks}
                            </span>
                          </div>
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Repositories Tab */}
            {tab === 'repositories' && (
              <motion.div
                initial={{ opacity:0 }}
                animate={{ opacity:1 }}
                className="space-y-3"
              >
                {REPOS.map((repo, i) => (
                  <motion.div
                    key={repo.name}
                    initial={{ opacity:0, y:10 }}
                    animate={{ opacity:1, y:0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Link
                      to={`/${username}/${repo.name}`}
                      className="block gradient-border p-4 hover:shadow-glow transition-all group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-indigo-400 font-semibold text-sm
                                             group-hover:text-indigo-300 transition-colors">
                              {repo.name}
                            </span>
                            {repo.private && <span className="badge badge-warning text-[10px]">Private</span>}
                          </div>
                          <p className="text-text-muted text-xs mb-3">{repo.desc}</p>
                          <div className="flex items-center gap-4 text-xs text-text-muted">
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full"
                                    style={{ background: getLanguageColor(repo.lang) }} />
                              {repo.lang}
                            </span>
                            <span className="flex items-center gap-1">
                              <StarIcon className="w-3 h-3" />{formatNumber(repo.stars)}
                            </span>
                            <span className="flex items-center gap-1">
                              <ArrowPathIcon className="w-3 h-3" />{repo.forks}
                            </span>
                            <span>Updated {repo.updated}</span>
                          </div>
                        </div>
                        <button
                          onClick={e => e.preventDefault()}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#2a2a3a]
                                     text-text-muted hover:text-yellow-400 hover:border-yellow-500/30
                                     text-xs transition-all flex-shrink-0"
                        >
                          <StarIcon className="w-3.5 h-3.5" />
                          Star
                        </button>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </motion.div>
            )}

            {/* Stars Tab */}
            {tab === 'stars' && (
              <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} className="space-y-3">
                {REPOS.slice(0,3).map((repo, i) => (
                  <motion.div
                    key={repo.name}
                    initial={{ opacity:0, y:10 }}
                    animate={{ opacity:1, y:0 }}
                    transition={{ delay: i * 0.07 }}
                    className="gradient-border p-4"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <StarIcon className="w-4 h-4 text-yellow-400" />
                      <span className="text-indigo-400 font-medium text-sm">{username}/{repo.name}</span>
                    </div>
                    <p className="text-xs text-text-muted">{repo.desc}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-text-muted">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full"
                              style={{ background: getLanguageColor(repo.lang) }} />
                        {repo.lang}
                      </span>
                      <span className="flex items-center gap-1">
                        <StarIcon className="w-3 h-3" />{repo.stars}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}

            {/* Projects / Packages placeholder */}
            {(tab === 'projects' || tab === 'packages') && (
              <motion.div
                initial={{ opacity:0 }}
                animate={{ opacity:1 }}
                className="gradient-border p-12 text-center"
              >
                <SparklesIcon className="w-12 h-12 text-text-muted mx-auto mb-3" />
                <h3 className="font-semibold text-text-primary capitalize">{tab}</h3>
                <p className="text-text-muted text-sm mt-1">No {tab} yet.</p>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;