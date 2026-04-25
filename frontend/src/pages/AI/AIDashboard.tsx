import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  SparklesIcon, BugAntIcon, ShieldCheckIcon,
  BoltIcon, CodeBracketIcon, ChatBubbleLeftRightIcon,
  ArrowPathIcon, DocumentTextIcon, CheckCircleIcon,
  XCircleIcon, ClipboardDocumentIcon,
} from '@heroicons/react/24/outline';
import AIAssistant  from '../../components/AI/AIAssistant';
import AIDebugger   from '../../components/AI/AIDebugger';
import AIInsights   from '../../components/AI/AIInsights';
import AICodeReview from '../../components/AI/AICodeReview';
import { AIAnalysis } from '../../types';
import aiService    from '../../services/aiService';
import toast        from 'react-hot-toast';

// ── Types ────────────────────────────────────────────────────────
type Tool        = 'assistant' | 'debugger' | 'insights' | 'review' | 'explain' | 'tests';
type Language    = 'typescript' | 'javascript' | 'python' | 'java' | 'go' | 'rust' | 'cpp' | 'php';
type TestFramework = 'jest' | 'vitest' | 'mocha' | 'pytest' | 'junit';

interface ExplainResult {
  raw: string;
  sections: { title: string; content: string }[];
}

interface TestResult {
  code:      string;
  framework: string;
  count:     number;
}

interface InsightResult {
  analyses:    AIAnalysis[];
  scannedAt:   string;
  totalIssues: number;
  score:       number;
}

// ── Constants ─────────────────────────────────────────────────────
const TOOLS: { id: Tool; label: string; desc: string; icon: React.ReactNode; color: string }[] = [
  { id:'assistant', label:'AI Chat',        desc:'Ask anything about code',      icon:<ChatBubbleLeftRightIcon className="w-5 h-5"/>, color:'from-indigo-500 to-purple-600' },
  { id:'debugger',  label:'AI Debugger',    desc:'Debug errors with AI',         icon:<BugAntIcon className="w-5 h-5"/>,              color:'from-red-500 to-orange-600'    },
  { id:'insights',  label:'Code Insights',  desc:'Analyse quality & security',   icon:<ShieldCheckIcon className="w-5 h-5"/>,         color:'from-green-500 to-emerald-600' },
  { id:'review',    label:'PR Review',      desc:'AI-powered diff review',       icon:<ArrowPathIcon className="w-5 h-5"/>,           color:'from-blue-500 to-cyan-600'     },
  { id:'explain',   label:'Explain Code',   desc:'Understand any snippet',       icon:<CodeBracketIcon className="w-5 h-5"/>,         color:'from-yellow-500 to-amber-600'  },
  { id:'tests',     label:'Generate Tests', desc:'Auto-generate unit tests',     icon:<DocumentTextIcon className="w-5 h-5"/>,        color:'from-pink-500 to-rose-600'     },
];

const LANGUAGES: Language[]     = ['typescript','javascript','python','java','go','rust','cpp','php'];
const FRAMEWORKS: TestFramework[] = ['jest','vitest','mocha','pytest','junit'];

const LANGUAGE_FRAMEWORK_MAP: Record<Language, TestFramework[]> = {
  typescript:  ['jest','vitest','mocha'],
  javascript:  ['jest','vitest','mocha'],
  python:      ['pytest'],
  java:        ['junit'],
  go:          ['jest'],
  rust:        ['jest'],
  cpp:         ['jest'],
  php:         ['jest'],
};

const STATS_KEYS = [
  { label:'Issues Fixed',    icon:'🐛', storageKey:'issues_fixed'    },
  { label:'PRs Reviewed',    icon:'🔀', storageKey:'prs_reviewed'    },
  { label:'Code Explained',  icon:'💡', storageKey:'code_explained'  },
  { label:'Tests Generated', icon:'🧪', storageKey:'tests_generated' },
];

// ── Helpers ──────────────────────────────────────────────────────
const getStats = () => ({
  issues_fixed:    parseInt(localStorage.getItem('ai_issues_fixed')    || '0'),
  prs_reviewed:    parseInt(localStorage.getItem('ai_prs_reviewed')    || '0'),
  code_explained:  parseInt(localStorage.getItem('ai_code_explained')  || '0'),
  tests_generated: parseInt(localStorage.getItem('ai_tests_generated') || '0'),
});

const incrementStat = (key: string) => {
  const current = parseInt(localStorage.getItem(`ai_${key}`) || '0');
  localStorage.setItem(`ai_${key}`, String(current + 1));
};

const parseExplanation = (raw: string): ExplainResult => {
  const sections: { title: string; content: string }[] = [];
  const lines     = raw.split('\n');
  let currentTitle   = '';
  let currentContent: string[] = [];

  lines.forEach(line => {
    if (line.startsWith('## ') || line.startsWith('# ')) {
      if (currentTitle) {
        sections.push({ title: currentTitle, content: currentContent.join('\n').trim() });
      }
      currentTitle   = line.replace(/^#+\s*/, '');
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  });

  if (currentTitle) {
    sections.push({ title: currentTitle, content: currentContent.join('\n').trim() });
  }

  return { raw, sections: sections.length > 0 ? sections : [{ title: 'Explanation', content: raw }] };
};

// ── Loading Spinner ───────────────────────────────────────────────
const LoadingDots: React.FC<{ message?: string }> = ({ message = 'Processing…' }) => (
  <div className="flex items-center gap-3 text-indigo-400 text-sm p-4">
    <div className="flex gap-1">
      {[0,1,2].map(i => (
        <motion.div
          key={i}
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
          className="w-2 h-2 rounded-full bg-indigo-400"
        />
      ))}
    </div>
    <span>{message}</span>
  </div>
);

// ── Code Score Ring ───────────────────────────────────────────────
const ScoreRing: React.FC<{ score: number }> = ({ score }) => {
  const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';
  const dash  = (score / 100) * 100;
  return (
    <div className="relative w-20 h-20 flex-shrink-0">
      <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
        <circle cx="18" cy="18" r="15.9" fill="none" stroke="#2a2a3a" strokeWidth="3"/>
        <motion.circle
          cx="18" cy="18" r="15.9" fill="none"
          stroke={color} strokeWidth="3" strokeLinecap="round"
          initial={{ strokeDasharray: '0 100' }}
          animate={{ strokeDasharray: `${dash} ${100 - dash}` }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold" style={{ color }}>{score}</span>
      </div>
    </div>
  );
};

// ── Copy Button ───────────────────────────────────────────────────
const CopyButton: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied!');
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary
                 bg-bg-secondary border border-[#2a2a3a] rounded-md px-2.5 py-1.5 transition-colors"
    >
      <ClipboardDocumentIcon className="w-3.5 h-3.5" />
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
};

// ── Main Component ────────────────────────────────────────────────
const AIDashboard: React.FC = () => {
  const [activeTool,   setActiveTool]   = useState<Tool>('assistant');
  const [stats,        setStats]        = useState(getStats());

  // Explain state
  const [explainCode,  setExplainCode]  = useState('// Paste your code here\n');
  const [explainLang,  setExplainLang]  = useState<Language>('typescript');
  const [explainResult,setExplainResult]= useState<ExplainResult | null>(null);
  const [explaining,   setExplaining]   = useState(false);

  // Tests state
  const [testCode,     setTestCode]     = useState('// Paste your code here\n');
  const [testLang,     setTestLang]     = useState<Language>('typescript');
  const [testFramework,setTestFramework]= useState<TestFramework>('jest');
  const [testResult,   setTestResult]   = useState<TestResult | null>(null);
  const [generatingTests, setGeneratingTests] = useState(false);

  // Insights state
  const [insightCode,  setInsightCode]  = useState('// Paste your code here\n');
  const [insightLang,  setInsightLang]  = useState<Language>('typescript');
  const [insightResult,setInsightResult]= useState<InsightResult | null>(null);
  const [analysing,    setAnalysing]    = useState(false);

  // ── Refresh stats from localStorage
  const refreshStats = useCallback(() => {
    setStats(getStats());
  }, []);

  // ── Handle Language change for tests
  const handleTestLangChange = (lang: Language) => {
    setTestLang(lang);
    const frameworks = LANGUAGE_FRAMEWORK_MAP[lang];
    if (!frameworks.includes(testFramework)) {
      setTestFramework(frameworks[0]);
    }
  };

  // ── Explain Code ─────────────────────────────────────────────────
  const handleExplain = async () => {
    if (!explainCode.trim() || explainCode.trim() === '// Paste your code here') {
      toast.error('Please paste some code to explain');
      return;
    }
    setExplaining(true);
    setExplainResult(null);

    const toastId = toast.loading('AI is analysing your code…');
    try {
      const response = await aiService.explainCode(explainCode, explainLang);
      const parsed   = parseExplanation(
        typeof response === 'string' ? response : (response as any).explanation || JSON.stringify(response)
      );
      setExplainResult(parsed);
      incrementStat('code_explained');
      refreshStats();
      toast.success('Explanation ready!', { id: toastId });
    } catch (err: any) {
      toast.error(err.message || 'Explanation failed', { id: toastId });
    } finally {
      setExplaining(false);
    }
  };

  // ── Generate Tests ────────────────────────────────────────────────
  const handleGenerateTests = async () => {
    if (!testCode.trim() || testCode.trim() === '// Paste your code here') {
      toast.error('Please paste some code to test');
      return;
    }
    setGeneratingTests(true);
    setTestResult(null);

    const toastId = toast.loading('AI is generating tests…');
    try {
      const response = await aiService.generateTests(testCode, testLang, testFramework);
      const code     = typeof response === 'string' ? response : (response as any).tests || '';

      // Count test cases roughly
      const count = (code.match(/\bit\s*\(|test\s*\(|def\s+test_/g) || []).length;

      setTestResult({ code, framework: testFramework, count: Math.max(count, 1) });
      incrementStat('tests_generated');
      refreshStats();
      toast.success(`Generated ${Math.max(count, 1)} test case${count !== 1 ? 's' : ''}!`, { id: toastId });
    } catch (err: any) {
      toast.error(err.message || 'Test generation failed', { id: toastId });
    } finally {
      setGeneratingTests(false);
    }
  };

  // ── Analyse Insights ──────────────────────────────────────────────
  const handleAnalyseInsights = async () => {
    if (!insightCode.trim() || insightCode.trim() === '// Paste your code here') {
      toast.error('Please paste some code to analyse');
      return;
    }
    setAnalysing(true);
    setInsightResult(null);

    const toastId = toast.loading('AI is scanning your code…');
    try {
      const response = await aiService.analyzeCode(insightCode, insightLang);
      const analyses: AIAnalysis[] = Array.isArray(response) ? response : [];

      // Calculate quality score based on severity
      const penaltyMap = { critical:25, high:15, medium:8, low:3, info:1 };
      const penalty = analyses.reduce((acc, a) => {
        return acc + (penaltyMap[a.severity as keyof typeof penaltyMap] || 0);
      }, 0);
      const score = Math.max(0, Math.min(100, 100 - penalty));

      setInsightResult({
        analyses,
        scannedAt:   new Date().toLocaleTimeString(),
        totalIssues: analyses.length,
        score,
      });

      if (analyses.length > 0) {
        incrementStat('issues_fixed');
        refreshStats();
      }

      toast.success(
        analyses.length === 0
          ? 'No issues found! Clean code 🎉'
          : `Found ${analyses.length} issue${analyses.length !== 1 ? 's' : ''}`,
        { id: toastId }
      );
    } catch (err: any) {
      toast.error(err.message || 'Analysis failed', { id: toastId });
    } finally {
      setAnalysing(false);
    }
  };

  // ── Tool change ───────────────────────────────────────────────────
  const handleToolChange = (tool: Tool) => {
    setActiveTool(tool);
    // Reset results when switching tools
    setExplainResult(null);
    setTestResult(null);
    setInsightResult(null);
  };

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-bg-primary pt-14">
      <div className="max-w-screen-xl mx-auto px-4 py-8 space-y-8">

        {/* ── Header ─────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity:0, y:20 }}
          animate={{ opacity:1, y:0 }}
          className="text-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full
                          bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm mb-4 ai-glow">
            <SparklesIcon className="w-4 h-4" />
            GitPage AI Dashboard
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-text-primary mb-2">
            AI-Powered <span className="gradient-text">Developer Tools</span>
          </h1>
          <p className="text-text-secondary max-w-xl mx-auto text-sm">
            Supercharge your workflow with intelligent code analysis, debugging,
            review, and generation — all powered by real AI.
          </p>
        </motion.div>

        {/* ── Live Stats ─────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {STATS_KEYS.map((s, i) => {
            const val = stats[s.storageKey as keyof typeof stats];
            return (
              <motion.div
                key={s.label}
                initial={{ opacity:0, y:20 }}
                animate={{ opacity:1, y:0 }}
                transition={{ delay: i * 0.07 }}
                className="gradient-border p-4 text-center"
              >
                <div className="text-3xl mb-1">{s.icon}</div>
                <motion.p
                  key={val}
                  initial={{ scale: 1.3, color: '#818cf8' }}
                  animate={{ scale: 1,   color: '#818cf8' }}
                  className="text-2xl font-black text-indigo-400"
                >
                  {val}
                </motion.p>
                <p className="text-xs text-text-primary font-medium">{s.label}</p>
                <p className="text-xs text-green-400 mt-1">
                  {val > 0 ? `+${val} total` : 'None yet'}
                </p>
              </motion.div>
            );
          })}
        </div>

        {/* ── Tool Selector ───────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {TOOLS.map((tool, i) => (
            <motion.button
              key={tool.id}
              initial={{ opacity:0, scale:0.9 }}
              animate={{ opacity:1, scale:1 }}
              transition={{ delay: i * 0.06 }}
              whileTap={{ scale:0.95 }}
              onClick={() => handleToolChange(tool.id)}
              className={`gradient-border p-4 text-center transition-all duration-200 ${
                activeTool === tool.id
                  ? 'border-indigo-500/60 shadow-glow bg-indigo-500/5'
                  : 'hover:border-indigo-500/30 hover:bg-bg-tertiary/50'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${tool.color}
                               flex items-center justify-center text-white mx-auto mb-2
                               transition-shadow ${activeTool === tool.id ? 'shadow-glow' : ''}`}>
                {tool.icon}
              </div>
              <p className="text-xs font-semibold text-text-primary">{tool.label}</p>
              <p className="text-[10px] text-text-muted mt-0.5 leading-tight">{tool.desc}</p>
            </motion.button>
          ))}
        </div>

        {/* ── Active Tool Panel ───────────────────────────────────── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTool}
            initial={{ opacity:0, y:10 }}
            animate={{ opacity:1, y:0 }}
            exit={{ opacity:0, y:-10 }}
            transition={{ duration:0.25 }}
          >

            {/* ── AI Chat ──────────────────────────────────────── */}
            {activeTool === 'assistant' && (
              <div className="h-[650px]">
                <AIAssistant />
              </div>
            )}

            {/* ── AI Debugger ───────────────────────────────────── */}
            {activeTool === 'debugger' && <AIDebugger />}

            {/* ── Code Insights ─────────────────────────────────── */}
            {activeTool === 'insights' && (
              <div className="space-y-5">
                {/* Input panel */}
                <div className="gradient-border overflow-hidden">
                  <div className="px-4 py-3 border-b border-[#2a2a3a] bg-bg-tertiary
                                  flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <ShieldCheckIcon className="w-4 h-4 text-green-400" />
                      <span className="text-sm font-medium text-text-secondary">
                        Paste code to analyse
                      </span>
                      <select
                        value={insightLang}
                        onChange={e => setInsightLang(e.target.value as Language)}
                        className="bg-bg-secondary border border-[#2a2a3a] rounded-lg px-2 py-1
                                   text-xs text-text-primary outline-none"
                      >
                        {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </div>
                    <motion.button
                      whileTap={{ scale:0.95 }}
                      onClick={handleAnalyseInsights}
                      disabled={analysing}
                      className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-indigo-600
                                 hover:bg-indigo-500 text-white text-sm disabled:opacity-50
                                 transition-colors"
                    >
                      <SparklesIcon className="w-4 h-4" />
                      {analysing ? 'Scanning…' : 'Analyse with AI'}
                    </motion.button>
                  </div>
                  <textarea
                    value={insightCode}
                    onChange={e => setInsightCode(e.target.value)}
                    placeholder="Paste your code here…"
                    className="w-full h-56 bg-[#0d0d14] text-text-primary placeholder-text-muted
                               p-4 text-sm font-mono outline-none resize-none"
                  />
                </div>

                {/* Loading */}
                {analysing && (
                  <div className="gradient-border">
                    <LoadingDots message="AI is scanning your code for issues…" />
                  </div>
                )}

                {/* Results */}
                {insightResult && !analysing && (
                  <motion.div
                    initial={{ opacity:0, y:10 }}
                    animate={{ opacity:1, y:0 }}
                    className="space-y-4"
                  >
                    {/* Score summary */}
                    <div className="gradient-border p-5 flex items-center gap-5 flex-wrap">
                      <ScoreRing score={insightResult.score} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-text-primary">Code Quality Score</h3>
                          <span className="text-xs text-text-muted">· Scanned at {insightResult.scannedAt}</span>
                        </div>
                        <p className="text-sm text-text-secondary mb-3">
                          {insightResult.totalIssues === 0
                            ? '🎉 No issues found! Your code looks great.'
                            : `Found ${insightResult.totalIssues} issue${insightResult.totalIssues !== 1 ? 's' : ''} to review.`
                          }
                        </p>
                        <div className="flex gap-2 flex-wrap">
                          {(['critical','high','medium','low','info'] as const).map(sev => {
                            const count = insightResult.analyses.filter(a => a.severity === sev).length;
                            if (count === 0) return null;
                            const badgeMap = {
                              critical: 'badge-danger',
                              high:     'badge-warning',
                              medium:   'badge-warning',
                              low:      'badge-info',
                              info:     'badge-gray',
                            };
                            return (
                              <span key={sev} className={`badge ${badgeMap[sev]} capitalize text-xs`}>
                                {count} {sev}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                      <button
                        onClick={handleAnalyseInsights}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#2a2a3a]
                                   text-text-muted hover:text-text-primary hover:bg-bg-tertiary text-xs transition-colors"
                      >
                        <ArrowPathIcon className="w-3.5 h-3.5" />
                        Re-scan
                      </button>
                    </div>

                    {/* Issues */}
                    <AIInsights analyses={insightResult.analyses} />
                  </motion.div>
                )}
              </div>
            )}

            {/* ── PR Review ─────────────────────────────────────── */}
            {activeTool === 'review' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <ArrowPathIcon className="w-5 h-5 text-blue-400" />
                  <h3 className="font-semibold text-text-primary">AI Pull Request Review</h3>
                  <span className="badge badge-primary text-[10px]">Live AI</span>
                </div>
                <AICodeReview />
              </div>
            )}

            {/* ── Explain Code ──────────────────────────────────── */}
            {activeTool === 'explain' && (
              <div className="space-y-4">
                {/* Input */}
                <div className="gradient-border overflow-hidden">
                  <div className="px-4 py-3 border-b border-[#2a2a3a] bg-bg-tertiary
                                  flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <CodeBracketIcon className="w-4 h-4 text-yellow-400" />
                      <span className="text-sm font-medium text-text-secondary">Paste code to explain</span>
                      <select
                        value={explainLang}
                        onChange={e => setExplainLang(e.target.value as Language)}
                        className="bg-bg-secondary border border-[#2a2a3a] rounded-lg px-2 py-1
                                   text-xs text-text-primary outline-none"
                      >
                        {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </div>
                    <motion.button
                      whileTap={{ scale:0.95 }}
                      onClick={handleExplain}
                      disabled={explaining}
                      className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-indigo-600
                                 hover:bg-indigo-500 text-white text-sm disabled:opacity-50 transition-colors"
                    >
                      <SparklesIcon className="w-4 h-4" />
                      {explaining ? 'Explaining…' : 'Explain with AI'}
                    </motion.button>
                  </div>
                  <textarea
                    value={explainCode}
                    onChange={e => setExplainCode(e.target.value)}
                    placeholder="Paste your code here…"
                    className="w-full h-56 bg-[#0d0d14] text-text-primary placeholder-text-muted
                               p-4 text-sm font-mono outline-none resize-none"
                  />
                </div>

                {/* Loading */}
                {explaining && (
                  <div className="gradient-border">
                    <LoadingDots message="AI is reading and explaining your code…" />
                  </div>
                )}

                {/* Result */}
                {explainResult && !explaining && (
                  <motion.div
                    initial={{ opacity:0, y:10 }}
                    animate={{ opacity:1, y:0 }}
                    className="gradient-border overflow-hidden"
                  >
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-[#2a2a3a] bg-bg-tertiary
                                    flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircleIcon className="w-4 h-4 text-green-400" />
                        <span className="text-sm font-medium text-text-primary">AI Explanation</span>
                        <span className="badge badge-success text-[10px]">Complete</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CopyButton text={explainResult.raw} />
                        <button
                          onClick={handleExplain}
                          className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary
                                     bg-bg-secondary border border-[#2a2a3a] rounded-md px-2.5 py-1.5 transition-colors"
                        >
                          <ArrowPathIcon className="w-3.5 h-3.5" />
                          Re-explain
                        </button>
                      </div>
                    </div>

                    {/* Sections */}
                    <div className="p-5 space-y-5 max-h-[600px] overflow-y-auto">
                      {explainResult.sections.map((section, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity:0, x:-10 }}
                          animate={{ opacity:1, x:0 }}
                          transition={{ delay: i * 0.08 }}
                        >
                          {section.title && (
                            <h4 className="font-bold text-text-primary mb-2 flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-indigo-500/20 border border-indigo-500/30
                                               flex items-center justify-center text-indigo-400 text-[10px] font-bold
                                               flex-shrink-0">
                                {i + 1}
                              </span>
                              {section.title}
                            </h4>
                          )}
                          <div className="pl-7">
                            {section.content.split('\n').map((line, j) => {
                              // Code block detection
                              if (line.startsWith('```') || line.endsWith('```')) return null;
                              // Bold text
                              const formatted = line.replace(
                                /\*\*(.*?)\*\*/g,
                                '<strong class="text-text-primary font-semibold">\$1</strong>'
                              ).replace(
                                /`(.*?)`/g,
                                '<code class="text-indigo-400 bg-indigo-500/10 px-1 py-0.5 rounded text-xs font-mono">\$1</code>'
                              );
                              // List items
                              if (line.startsWith('- ') || line.startsWith('* ')) {
                                return (
                                  <div key={j} className="flex items-start gap-2 mb-1">
                                    <span className="text-indigo-400 mt-1 text-xs flex-shrink-0">•</span>
                                    <p
                                      className="text-sm text-text-secondary leading-relaxed"
                                      dangerouslySetInnerHTML={{ __html: formatted.replace(/^[-*]\s*/, '') }}
                                    />
                                  </div>
                                );
                              }
                              // Numbered list
                              if (/^\d+\.\s/.test(line)) {
                                return (
                                  <div key={j} className="flex items-start gap-2 mb-1">
                                    <span className="text-indigo-400 text-xs flex-shrink-0 font-mono mt-0.5">
                                      {line.match(/^(\d+)\./)?.[1]}.
                                    </span>
                                    <p
                                      className="text-sm text-text-secondary leading-relaxed"
                                      dangerouslySetInnerHTML={{ __html: formatted.replace(/^\d+\.\s*/, '') }}
                                    />
                                  </div>
                                );
                              }
                              // Empty lines
                              if (!line.trim()) return <div key={j} className="h-2" />;
                              // Normal text
                              return (
                                <p
                                  key={j}
                                  className="text-sm text-text-secondary leading-relaxed mb-1"
                                  dangerouslySetInnerHTML={{ __html: formatted }}
                                />
                              );
                            })}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Empty state */}
                {!explainResult && !explaining && (
                  <div className="gradient-border p-10 text-center">
                    <CodeBracketIcon className="w-12 h-12 text-text-muted mx-auto mb-3" />
                    <p className="text-text-muted text-sm">
                      Paste any code above and click <strong className="text-indigo-400">Explain with AI</strong>
                    </p>
                    <p className="text-text-muted text-xs mt-1">
                      Supports TypeScript, JavaScript, Python, Java, Go, Rust and more
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ── Generate Tests ────────────────────────────────── */}
            {activeTool === 'tests' && (
              <div className="space-y-4">
                {/* Input */}
                <div className="gradient-border overflow-hidden">
                  <div className="px-4 py-3 border-b border-[#2a2a3a] bg-bg-tertiary
                                  flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <DocumentTextIcon className="w-4 h-4 text-pink-400" />
                      <span className="text-sm font-medium text-text-secondary">Paste code to test</span>
                      <select
                        value={testLang}
                        onChange={e => handleTestLangChange(e.target.value as Language)}
                        className="bg-bg-secondary border border-[#2a2a3a] rounded-lg px-2 py-1
                                   text-xs text-text-primary outline-none"
                      >
                        {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                      <select
                        value={testFramework}
                        onChange={e => setTestFramework(e.target.value as TestFramework)}
                        className="bg-bg-secondary border border-[#2a2a3a] rounded-lg px-2 py-1
                                   text-xs text-text-primary outline-none"
                      >
                        {LANGUAGE_FRAMEWORK_MAP[testLang].map(f => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </div>
                    <motion.button
                      whileTap={{ scale:0.95 }}
                      onClick={handleGenerateTests}
                      disabled={generatingTests}
                      className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-indigo-600
                                 hover:bg-indigo-500 text-white text-sm disabled:opacity-50 transition-colors"
                    >
                      <SparklesIcon className="w-4 h-4" />
                      {generatingTests ? 'Generating…' : 'Generate Tests'}
                    </motion.button>
                  </div>
                  <textarea
                    value={testCode}
                    onChange={e => setTestCode(e.target.value)}
                    placeholder="Paste your code here…"
                    className="w-full h-56 bg-[#0d0d14] text-text-primary placeholder-text-muted
                               p-4 text-sm font-mono outline-none resize-none"
                  />
                </div>

                {/* Loading */}
                {generatingTests && (
                  <div className="gradient-border">
                    <LoadingDots message={`AI is writing ${testFramework} tests…`} />
                  </div>
                )}

                {/* Result */}
                {testResult && !generatingTests && (
                  <motion.div
                    initial={{ opacity:0, y:10 }}
                    animate={{ opacity:1, y:0 }}
                    className="gradient-border overflow-hidden"
                  >
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-[#2a2a3a] bg-bg-tertiary
                                    flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <CheckCircleIcon className="w-4 h-4 text-green-400" />
                        <span className="text-sm font-medium text-text-primary">Generated Tests</span>
                        <span className="badge badge-success text-[10px]">
                          {testResult.count} test{testResult.count !== 1 ? 's' : ''}
                        </span>
                        <span className="badge badge-primary text-[10px] capitalize">
                          {testResult.framework}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CopyButton text={testResult.code} />
                        <button
                          onClick={handleGenerateTests}
                          className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary
                                     bg-bg-secondary border border-[#2a2a3a] rounded-md px-2.5 py-1.5 transition-colors"
                        >
                          <ArrowPathIcon className="w-3.5 h-3.5" />
                          Regenerate
                        </button>
                      </div>
                    </div>

                    {/* Code */}
                    <div className="relative">
                      <pre className="p-4 text-xs font-mono text-green-400 overflow-x-auto
                                      max-h-[500px] overflow-y-auto leading-relaxed bg-[#0d0d14]
                                      whitespace-pre">
                        {testResult.code}
                      </pre>
                    </div>

                    {/* Tips */}
                    <div className="px-4 py-3 border-t border-[#2a2a3a] bg-indigo-500/5">
                      <p className="text-xs text-indigo-300 flex items-center gap-2">
                        <SparklesIcon className="w-3.5 h-3.5 flex-shrink-0" />
                        Copy the generated tests into your project and run{' '}
                        <code className="bg-indigo-500/20 px-1 rounded">
                          npm test
                        </code>
                        . Review and adjust mocks as needed.
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Empty state */}
                {!testResult && !generatingTests && (
                  <div className="gradient-border p-10 text-center">
                    <DocumentTextIcon className="w-12 h-12 text-text-muted mx-auto mb-3" />
                    <p className="text-text-muted text-sm">
                      Paste any code above, choose your language & framework, then click{' '}
                      <strong className="text-indigo-400">Generate Tests</strong>
                    </p>
                    <p className="text-text-muted text-xs mt-1">
                      Supports Jest, Vitest, Mocha, Pytest, JUnit
                    </p>
                  </div>
                )}
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AIDashboard;