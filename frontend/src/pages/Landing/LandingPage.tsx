import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  SparklesIcon, ShieldCheckIcon, BoltIcon, CodeBracketIcon,
  ArrowRightIcon, StarIcon, UserGroupIcon, ServerIcon,
} from '@heroicons/react/24/outline';

const features = [
  {
    icon: <SparklesIcon className="w-6 h-6" />,
    title: 'AI-Powered Coding',
    desc: 'Get intelligent code suggestions, auto-debugging, and AI-driven PR reviews in real time.',
    color: 'from-indigo-500 to-purple-600',
  },
  {
    icon: <ShieldCheckIcon className="w-6 h-6" />,
    title: 'Security Scanning',
    desc: 'AI automatically scans every commit for vulnerabilities, secrets, and security anti-patterns.',
    color: 'from-green-500 to-emerald-600',
  },
  {
    icon: <BoltIcon className="w-6 h-6" />,
    title: 'Lightning CI/CD',
    desc: 'Built-in workflows with parallel runners, smart caching, and AI-optimized pipelines.',
    color: 'from-yellow-500 to-orange-600',
  },
  {
    icon: <CodeBracketIcon className="w-6 h-6" />,
    title: 'Smart Code Review',
    desc: 'AI assists reviewers with context-aware suggestions, style enforcement, and complexity analysis.',
    color: 'from-blue-500 to-cyan-600',
  },
  {
    icon: <UserGroupIcon className="w-6 h-6" />,
    title: 'Team Collaboration',
    desc: 'Real-time editing, threaded discussions, project boards, and org-level access control.',
    color: 'from-pink-500 to-rose-600',
  },
  {
    icon: <ServerIcon className="w-6 h-6" />,
    title: 'GitPage Packages',
    desc: 'Host and manage npm, Docker, Maven, NuGet, and RubyGems packages alongside your code.',
    color: 'from-purple-500 to-violet-600',
  },
];

const stats = [
  { value: '10M+', label: 'Developers' },
  { value: '50M+', label: 'Repositories' },
  { value: '200+', label: 'Countries' },
  { value: '99.9%', label: 'Uptime SLA' },
];

const LandingPage: React.FC = () => {
  const [email, setEmail] = useState('');

  return (
    <div className="min-h-screen bg-bg-primary overflow-hidden">
      {/* ─── Hero ──────────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-24 px-4 text-center overflow-hidden">
        {/* Background glow blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px]
                          bg-indigo-600/10 rounded-full blur-3xl" />
          <div className="absolute top-40 left-1/4 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl" />
          <div className="absolute top-40 right-1/4 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl" />
        </div>

        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full
                     bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm mb-6"
        >
          <SparklesIcon className="w-4 h-4" />
          <span>Now with AI-Powered Development</span>
          <span className="badge badge-primary">New</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-5xl md:text-7xl font-black mb-6 leading-tight"
        >
          Code Better,<br />
          <span className="gradient-text">Ship Faster</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-text-secondary text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          GitPage is the AI-powered platform where developers collaborate, review code,
          manage projects, and ship software — all with intelligent assistance built-in.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
        >
          <div className="flex bg-bg-secondary border border-[#2a2a3a] rounded-xl overflow-hidden
                          w-full max-w-sm shadow-card">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="flex-1 bg-transparent px-4 py-3 text-text-primary
                         placeholder-text-muted outline-none text-sm"
            />
            <Link
              to="/register"
              className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-sm
                         font-medium transition-colors whitespace-nowrap flex items-center gap-1"
            >
              Get started
              <ArrowRightIcon className="w-4 h-4" />
            </Link>
          </div>

          <Link
            to="/login"
            className="flex items-center gap-2 px-6 py-3 rounded-xl border border-[#2a2a3a]
                       text-text-secondary hover:text-text-primary hover:bg-bg-secondary
                       text-sm transition-all"
          >
            Sign in
          </Link>
        </motion.div>

        {/* Hero preview */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0,  scale: 1 }}
          transition={{ delay: 0.4, type: 'spring', stiffness: 100 }}
          className="max-w-5xl mx-auto gradient-border overflow-hidden shadow-glow-lg"
        >
          <div className="flex items-center gap-2 px-4 py-3 bg-bg-tertiary border-b border-[#2a2a3a]">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="ml-2 text-xs text-text-muted font-mono">gitpage.io/johndoe/awesome-project</span>
          </div>
          <div className="grid grid-cols-5 h-72 overflow-hidden">
            {/* File tree */}
            <div className="col-span-1 border-r border-[#2a2a3a] p-3 text-left hidden md:block">
              {['📁 src','  📄 App.tsx','  📄 main.tsx','📁 components','  📄 Hero.tsx','📄 package.json'].map((f,i) => (
                <div key={i} className={`text-xs font-mono py-0.5 cursor-pointer
                  ${i === 1 ? 'text-indigo-400 bg-indigo-500/10 rounded px-1' : 'text-text-muted hover:text-text-secondary'}`}>
                  {f}
                </div>
              ))}
            </div>
            {/* Code */}
            <div className="col-span-5 md:col-span-3 p-4 text-left overflow-hidden">
              <pre className="text-xs font-mono text-text-secondary leading-relaxed">
                <span className="text-purple-400">import</span>
                <span className="text-text-primary"> React </span>
                <span className="text-purple-400">from</span>
                <span className="text-green-400"> 'react'</span>{'\n'}
                <span className="text-purple-400">import</span>
                <span className="text-text-primary"> {'{ motion }'} </span>
                <span className="text-purple-400">from</span>
                <span className="text-green-400"> 'framer-motion'</span>{'\n\n'}
                <span className="text-blue-400">const</span>
                <span className="text-yellow-400"> Hero</span>
                <span className="text-text-primary">: React.FC = () </span>
                <span className="text-blue-400">=&gt;</span>
                <span className="text-text-primary"> {'{'}</span>{'\n'}
                <span className="text-text-primary">  </span>
                <span className="text-purple-400">return</span>
                <span className="text-text-primary"> {'('}</span>{'\n'}
                <span className="text-text-primary">    </span>
                <span className="text-orange-400">&lt;motion.div</span>{'\n'}
                <span className="text-text-primary">      </span>
                <span className="text-blue-400">initial</span>
                <span className="text-text-primary">={'{{ opacity: 0 }}'}</span>{'\n'}
                <span className="text-text-primary">      </span>
                <span className="text-blue-400">animate</span>
                <span className="text-text-primary">={'{{ opacity: 1 }}'}</span>{'\n'}
                <span className="text-orange-400">    &gt;</span>{'\n'}
                <span className="text-text-primary">      </span>
                <span className="text-orange-400">&lt;h1&gt;</span>
                <span className="text-text-primary">Hello GitPage</span>
                <span className="text-orange-400">&lt;/h1&gt;</span>{'\n'}
                <span className="text-orange-400">    &lt;/motion.div&gt;</span>{'\n'}
                <span className="text-text-primary">  )</span>{'\n'}
                <span className="text-text-primary">{'}'}</span>
              </pre>
            </div>
            {/* AI Panel */}
            <div className="col-span-5 md:col-span-1 border-l border-[#2a2a3a] p-3 bg-indigo-500/5 text-left hidden md:block">
              <div className="flex items-center gap-1.5 mb-3">
                <SparklesIcon className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-xs text-indigo-400 font-medium">AI Insights</span>
              </div>
              {[
                { type: 'tip',  msg: 'Add accessibility attributes to heading' },
                { type: 'opt',  msg: 'Consider React.memo for performance' },
                { type: 'good', msg: 'Good use of Framer Motion!' },
              ].map((item, i) => (
                <div key={i} className={`text-[10px] p-1.5 rounded mb-1.5 ${
                  item.type === 'tip'  ? 'bg-yellow-500/10 text-yellow-400' :
                  item.type === 'opt'  ? 'bg-blue-500/10 text-blue-400' :
                  'bg-green-500/10 text-green-400'}`}>
                  {item.msg}
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* ─── Stats ─────────────────────────────────────────────────── */}
      <section className="py-16 px-4 border-y border-[#2a2a3a] bg-bg-secondary">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
            >
              <p className="text-4xl font-black gradient-text">{s.value}</p>
              <p className="text-text-muted text-sm mt-1">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─── Features ──────────────────────────────────────────────── */}
      <section className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-4xl md:text-5xl font-black mb-4"
            >
              Everything you need to <span className="gradient-text">build great software</span>
            </motion.h2>
            <p className="text-text-secondary text-lg max-w-2xl mx-auto">
              From first commit to production, GitPage has AI-powered tools to supercharge every step of your workflow.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                viewport={{ once: true }}
                className="gradient-border p-6 group hover:shadow-glow transition-all duration-300"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.color}
                                 flex items-center justify-center text-white mb-4
                                 group-hover:scale-110 transition-transform`}>
                  {f.icon}
                </div>
                <h3 className="font-bold text-text-primary mb-2">{f.title}</h3>
                <p className="text-text-muted text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ───────────────────────────────────────────────────── */}
      <section className="py-24 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="gradient-border p-12 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-600/5 pointer-events-none" />
            <SparklesIcon className="w-12 h-12 text-indigo-400 mx-auto mb-4 animate-float" />
            <h2 className="text-3xl md:text-4xl font-black mb-4">
              Start building with <span className="gradient-text">AI today</span>
            </h2>
            <p className="text-text-secondary mb-8">
              Join millions of developers who ship faster with GitPage. Free forever for open source.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to="/register"
                className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white
                           rounded-xl font-medium transition-colors flex items-center gap-2 justify-center"
              >
                Create free account
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
              <Link
                to="/explore"
                className="px-8 py-3 border border-[#2a2a3a] hover:bg-bg-tertiary text-text-secondary
                           hover:text-text-primary rounded-xl font-medium transition-colors flex items-center gap-2 justify-center"
              >
                <StarIcon className="w-4 h-4" />
                Explore repositories
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;