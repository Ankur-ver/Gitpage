import dotenv from 'dotenv';
dotenv.config();
import User from '../models/User'
import Repository from '../models/Repository';
// ── Provider Types ───────────────────────────────────────────────
type AIProvider = 'gemini' | 'groq' | 'openai' | 'none';

/* ── Shared Types ─────────────────────────────────────────────── */
interface Label {
  name: string;
  color: string;
  description?: string;
}

interface SuggestLabelsResult {
  labels: Label[];
  reasoning: string;
}

interface TriageIssueInput {
  number: number;
  title: string;
  body: string;
  labels: Label[];
  state: string;
  createdAt: string;
}

interface TriageResult {
  issueNumber: number;
  suggestedLabels: Label[];
  priority: 'critical' | 'high' | 'medium' | 'low';
  summary: string;
  suggestedAssignee?: string;
}

// ── Detect active provider ───────────────────────────────────────
const getProvider = (): AIProvider => {
  const provider = process.env.AI_PROVIDER?.toLowerCase();

  if (provider === 'gemini' && process.env.GEMINI_API_KEY) return 'gemini';
  if (provider === 'groq'   && process.env.GROQ_API_KEY)   return 'groq';
  if (provider === 'openai' && process.env.OPENAI_API_KEY) return 'openai';

  if (process.env.GEMINI_API_KEY) return 'gemini';
  if (process.env.GROQ_API_KEY)   return 'groq';
  if (process.env.OPENAI_API_KEY) return 'openai';

  return 'none';
};

const PROVIDER: AIProvider = getProvider();

console.log(
  `🤖 AI Provider: ${PROVIDER === 'none' ? '❌ Not configured' : `✅ ${PROVIDER.toUpperCase()}`}`
);

// ── Models ───────────────────────────────────────────────────────
const DEFAULT_MODELS: Record<AIProvider, string> = {
  gemini: 'gemini-1.5-flash',
  groq:   'llama-3.3-70b-versatile',
  openai: 'gpt-4o-mini',
  none:   '',
};

const MODEL       = process.env.AI_MODEL       || DEFAULT_MODELS[PROVIDER];
const MAX_TOKENS  = parseInt(process.env.AI_MAX_TOKENS  || '2000');
const TEMPERATURE = parseFloat(process.env.AI_TEMPERATURE || '0.7');

// ── Helpers ──────────────────────────────────────────────────────
const notConfiguredMsg = (feature: string) =>
  `⚠️ AI not configured for ${feature}`;

/**
 * Extracts the first valid JSON array or object from a raw string,
 * even when the model wraps output in prose or markdown fences.
 */
function extractJSON<T>(raw: string, fallback: T): T {
  if (!raw) return fallback;

  // 1. Strip markdown fences  ```json … ``` or ``` … ```
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    try { return JSON.parse(fenceMatch[1].trim()); } catch { /* try next */ }
  }

  // 2. Find the first '[' or '{' and walk inward from the end
  const arrayStart  = raw.indexOf('[');
  const objectStart = raw.indexOf('{');
  const starts      = [arrayStart, objectStart].filter(i => i !== -1);
  if (starts.length === 0) return fallback;

  const start = Math.min(...starts);
  for (let end = raw.length; end > start; end--) {
    try { return JSON.parse(raw.slice(start, end)); } catch { /* shrink */ }
  }

  return fallback;
}

const safeJSON = <T>(str: string, fallback: T): T => {
  try {
    const cleaned = str
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/, '')
      .replace(/\s*```$/, '')
      .trim();
    return JSON.parse(cleaned);
  } catch {
    return fallback;
  }
};

// ── Core AI Call ─────────────────────────────────────────────────
const callAI = async (
  systemPrompt: string,
  userPrompt:   string,
  opts: { temperature?: number; maxTokens?: number } = {}
): Promise<string> => {
  const temperature = opts.temperature ?? TEMPERATURE;
  const maxTokens   = opts.maxTokens   ?? MAX_TOKENS;

  /* ── Gemini ── */
  if (PROVIDER === 'gemini') {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({
      model: MODEL,
      generationConfig: { temperature, maxOutputTokens: maxTokens },
      systemInstruction: systemPrompt,
    });
    const result = await model.generateContent(userPrompt);
    return result.response.text().trim();
  }

  /* ── Groq ── */
  if (PROVIDER === 'groq') {
    const Groq  = (await import('groq-sdk')).default;
    const client = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const res   = await client.chat.completions.create({
      model:MODEL,
      temperature,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt   },
      ],
    });
    return res.choices[0]?.message?.content?.trim() || '';
  }

  /* ── OpenAI ── */
  if (PROVIDER === 'openai') {
    const OpenAI = (await import('openai')).default;
    const client  = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const res     = await client.chat.completions.create({
      model: MODEL,
      temperature,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt   },
      ],
    });
    return res.choices[0]?.message?.content?.trim() || '';
  }

  throw new Error('No AI provider configured');
};

// ── Label colours used by triageIssues ───────────────────────────
const LABEL_COLORS: Record<string, string> = {
  'bug':             '#d73a4a',
  'enhancement':     '#a2eeef',
  'documentation':   '#0075ca',
  'good first issue':'#7057ff',
  'help wanted':     '#008672',
  'question':        '#e4e669',
  'invalid':         '#e4e4e4',
  'wontfix':         '#ffffff',
  'security':        '#e11d48',
  'performance':     '#f97316',
  'refactor':        '#8b5cf6',
  'test':            '#06b6d4',
  'ci/cd':           '#6366f1',
  'dependencies':    '#84cc16',
};

// ─────────────────────────────────────────────────────────────────
const aiService = {

  // ── Status ────────────────────────────────────────────────────
  getStatus() {
    return { configured: PROVIDER !== 'none', provider: PROVIDER, model: MODEL };
  },

  // ── Analyse code ──────────────────────────────────────────────
  async analyzeCode(code: string, language: string) {
    if (PROVIDER === 'none') {
      return [{
        id: '0', type: 'suggestion', severity: 'info',
        file: 'config', message: notConfiguredMsg('code analysis'),
        suggestion: 'Add API key',
      }];
    }
    const system = `You are a code-analysis engine.
Return ONLY a JSON array of issue objects with keys:
id, type, severity, file, line, message, suggestion.
No markdown, no prose.`;
    const user = `Language: ${language}\n\n${code}`;
    const raw  = await callAI(system, user);
    return extractJSON(raw, []);
  },
  async getInsights(userId: string, username: string) {
  // ── gather user data ────────────────────────────────────────────────────────
  const [user, repos] = await Promise.all([
    User.findById(userId).lean(),
    Repository.find({ owner: userId }).lean(),
  ]);

  if (!user) throw new Error('User not found');

  // ── build profile context ───────────────────────────────────────────────────
  const languages   = [...new Set(repos.map((r: any) => r.language).filter(Boolean))];
  const publicRepos = repos.filter((r: any) => !r.private);
  const totalStars  = repos.reduce((s: number, r: any) =>
    s + (Array.isArray(r.stars) ? r.stars.length : (r.stars ?? 0)), 0);
  const totalForks  = repos.reduce((s: number, r: any) =>
    s + (Array.isArray(r.forks) ? r.forks.length : (r.forks ?? 0)), 0);
  const hasReadme   = repos.some((r: any) => r.description?.length > 20);
  const hasTopics   = repos.some((r: any) => Array.isArray(r.topics) && r.topics.length > 0);

  const profileContext = {
    username,
    bio              : (user as any).bio      ?? null,
    location         : (user as any).location ?? null,
    website          : (user as any).website  ?? null,
    company          : (user as any).company  ?? null,
    followers        : Array.isArray((user as any).followers)
                         ? (user as any).followers.length
                         : ((user as any).followers ?? 0),
    following        : Array.isArray((user as any).following)
                         ? (user as any).following.length
                         : ((user as any).following ?? 0),
    totalRepos       : repos.length,
    publicRepos      : publicRepos.length,
    privateRepos     : repos.length - publicRepos.length,
    totalStars,
    totalForks,
    languages,
    hasReadme,
    hasTopics,
    repoDescriptions : publicRepos.filter((r: any) => r.description).length,
    topRepos         : publicRepos
                         .sort((a: any, b: any) => {
                           const sa = Array.isArray(a.stars) ? a.stars.length : (a.stars ?? 0);
                           const sb = Array.isArray(b.stars) ? b.stars.length : (b.stars ?? 0);
                           return sb - sa;
                         })
                         .slice(0, 5)
                         .map((r: any) => ({
                           name       : r.name,
                           description: r.description ?? '',
                           language   : r.language    ?? null,
                           stars      : Array.isArray(r.stars) ? r.stars.length : (r.stars ?? 0),
                           topics     : r.topics ?? [],
                         })),
  };

  // ── calculate profile score ─────────────────────────────────────────────────
  let score = 40;
  if ((user as any).bio)       score += 10;
  if ((user as any).location)  score += 5;
  if ((user as any).website)   score += 5;
  if ((user as any).avatar)    score += 5;
  if (publicRepos.length >= 5) score += 10;
  if (hasTopics)               score += 5;
  if (hasReadme)               score += 10;
  if (totalStars >= 10)        score += 5;
  if (languages.length >= 3)   score += 5;
  const profileScore = Math.min(100, score);

  // ── system + user prompts ───────────────────────────────────────────────────
  const system = `You are a senior developer career coach analyzing GitHub profiles.
Return ONLY a JSON object with keys: insights (array), profileScore (number).
No markdown, no prose.
Each insight must have: id, category, severity, title, message, action, tags, icon.
category  : "profile" | "project" | "techstack" | "activity" | "collaboration"
severity  : "info" | "suggestion" | "improvement" | "critical"
action    : short CTA string or null
tags      : string array
icon      : single emoji`;

  const userPrompt = `Profile data:
${JSON.stringify(profileContext, null, 2)}

Generate exactly 6 insights:
- 2 about improving their GitHub profile (bio, topics, readme, pinned repos)
- 2 project ideas with specific tech stack based on their languages: ${languages.join(', ') || 'general'}
- 1 about collaboration / open source community
- 1 about a trending technology they should learn given their stack
Use "critical" only if something important is missing (no bio, no public repos).
Make project suggestions concrete with a repo name idea and exact tech stack.`;

  // ── call AI ─────────────────────────────────────────────────────────────────
  const raw    = await callAI(system, userPrompt);
  const parsed = extractJSON(raw, { insights: [], profileScore });

  return {
    insights    : (parsed.insights    ?? [])          as any[],
    profileScore: (parsed.profileScore ?? profileScore) as number,
    generatedAt : new Date().toISOString(),
    cached      : false,
  };
},
  // ── Chat ──────────────────────────────────────────────────────
  async chat(message: string, history: any[]) {
    if (PROVIDER === 'none') return notConfiguredMsg('chat');
    const system = `You are an expert software-development assistant.
Be concise and helpful. Use markdown for code blocks.`;
    return callAI(system, message);
  },

  // ── Debug ─────────────────────────────────────────────────────
  async debugCode(code: string, error: string, language: string) {
    if (PROVIDER === 'none') return {};
    const system = `You are a debugging engine.
Return ONLY a JSON object with keys: rootCause, fix, explanation.
No markdown, no prose.`;
    const user = `Language: ${language}\nError: ${error}\n\nCode:\n${code}`;
    const raw  = await callAI(system, user);
    return extractJSON(raw, {});
  },

  // ── Review PR ─────────────────────────────────────────────────
  async reviewPR(diff: string) {
    const system = `You are a senior code reviewer.
Return ONLY a JSON object with keys:
summary, score (0-100), issues (array), suggestions (array).
No markdown, no prose.`;
    const raw = await callAI(system, diff);
    return extractJSON(raw, {});
  },

  // ── Commit message ────────────────────────────────────────────
  async suggestCommitMessage(diff: string) {
    const system = `You are a commit-message generator.
Return a single conventional-commit message string, nothing else.`;
    return callAI(system, diff);
  },

  // ── Explain code ──────────────────────────────────────────────
  async explainCode(code: string, language: string) {
    const system = `You are a code-explanation engine.
Give a clear, concise explanation in plain English.`;
    return callAI(system, `Language: ${language}\n\n${code}`);
  },

  // ── Generate tests ────────────────────────────────────────────
  async generateTests(code: string, language: string, framework: string) {
    const system = `You are a test-generation engine.
Return ONLY the test code, no explanation.`;
    return callAI(system, `Language: ${language} | Framework: ${framework}\n\n${code}`);
  },

  // ── Fix bug ───────────────────────────────────────────────────
  async fixBug(code: string, issue: string, language: string) {
    const system = `You are a bug-fix engine.
Return ONLY a JSON object with keys: fixedCode, explanation, changes (array).
No markdown, no prose.`;
    const user = `Language: ${language}\nIssue: ${issue}\n\nCode:\n${code}`;
    const raw  = await callAI(system, user);
    return extractJSON(raw, {});
  },
  
  // ── Optimise code ─────────────────────────────────────────────
  async optimizeCode(code: string, language: string) {
    const system = `You are a code-optimisation engine.
Return ONLY a JSON object with keys: optimizedCode, improvements (array), explanation.
No markdown, no prose.`;
    const raw = await callAI(system, `Language: ${language}\n\n${code}`);
    return extractJSON(raw, {});
  },

  // ── Repo insights ─────────────────────────────────────────────
  async getRepoInsights(owner: string, repo: string) {
    return { healthScore: 82, summary: `${owner}/${repo}` };
  },

  // ── Suggest labels ────────────────────────────────────────────
  async suggestIssueLabels(
    title:           string,
    body:            string,
    availableLabels: Label[]
  ): Promise<SuggestLabelsResult> {

    const labelList = availableLabels
      .map(l => `"${l.name}"${l.description ? ` (${l.description})` : ''}`)
      .join(', ');

    const system = [
      'You are a label-suggestion engine.',
      'Your ONLY output is raw JSON — no explanations, no markdown, no code fences.',
    ].join(' ');

    const user = [
      'TASK: Choose 1–3 labels from AVAILABLE LABELS for the issue below.',
      '',
      `ISSUE TITLE: ${title}`,
      `ISSUE BODY: ${body || '(empty)'}`,
      '',
      `AVAILABLE LABELS: [${labelList}]`,
      '',
      'Return ONLY this JSON shape, nothing else:',
      '{ "labels": ["label-name-1"], "reasoning": "One sentence." }',
      '',
      '⚠ Rules:',
      '  • Only use names from AVAILABLE LABELS — do NOT invent new ones.',
      '  • No text outside the JSON object.',
    ].join('\n');

    const raw    = await callAI(system, user, { temperature: 0.3 });
    console.log('[suggest-labels] raw:', raw.slice(0, 200));

    const parsed = extractJSON<{ labels: string[]; reasoning: string }>(
      raw,
      { labels: [], reasoning: '' }
    );

    const hydratedLabels = (parsed.labels ?? [])
      .map(name => availableLabels.find(l => l.name === name))
      .filter((l): l is Label => l !== undefined);

    // Keyword fallback when AI returns nothing usable
    if (hydratedLabels.length === 0) {
      const text      = (title + ' ' + body).toLowerCase();
      const heuristic = availableLabels.filter(l =>
        text.includes(l.name.toLowerCase()) ||
        (l.description && text.includes(l.description.toLowerCase()))
      ).slice(0, 2);

      return {
        labels:    heuristic,
        reasoning: parsed.reasoning || 'Labels chosen by keyword matching (AI returned no valid labels).',
      };
    }

    return { labels: hydratedLabels, reasoning: parsed.reasoning };
  },

  // ── Triage issues ─────────────────────────────────────────────
  async triageIssues(
    issues: TriageIssueInput[],
    repo:   { owner: string; name: string }
  ): Promise<TriageResult[]> {

    const issueList = issues
      .map(i =>
        `#${i.number}: "${i.title}"` +
        (i.body?.trim()
          ? ` — ${i.body.slice(0, 150).replace(/\n/g, ' ')}`
          : '')
      )
      .join('\n');

    const system = [
      'You are an issue-triage engine.',
      'Your ONLY output is a raw JSON array —',
      'no explanations, no markdown, no code fences, no extra text whatsoever.',
    ].join(' ');

    const user = [
      `REPOSITORY: ${repo.owner}/${repo.name}`,
      '',
      'ISSUES TO TRIAGE:',
      issueList,
      '',
      'Return a JSON array — one object per issue:',
      '[',
      '  {',
      '    "issueNumber": <number>,',
      '    "priority": "critical" | "high" | "medium" | "low",',
      '    "suggestedLabels": ["label1"],',
      '    "summary": "One sentence.",',
      '    "suggestedAssignee": "username (optional — omit key if unknown)"',
      '  }',
      ']',
      '',
      '⚠ Rules:',
      '  • critical = security hole, data loss, full outage.',
      '  • high     = severe bug affecting many users.',
      '  • medium   = bug with workaround, or notable feature request.',
      '  • low      = minor tweak, docs, question.',
      '  • suggestedLabels must come ONLY from:',
      '    bug, enhancement, documentation, good first issue, help wanted,',
      '    question, invalid, wontfix, security, performance, refactor,',
      '    test, ci/cd, dependencies',
      '  • Every issue MUST have an entry in the output array.',
      '  • No text outside the JSON array.',
    ].join('\n');

    const raw = await callAI(system, user, { temperature: 0.2 });
    console.log('[triage] raw (first 300):', raw.slice(0, 300));

    const parsed = extractJSON<Array<{
      issueNumber:       number;
      priority:          TriageResult['priority'];
      suggestedLabels:   string[];
      summary:           string;
      suggestedAssignee?: string;
    }>>(raw, []);

    console.log('[triage] parsed items:', parsed.length);

    // Heuristic fallback when AI returns nothing usable
    if (!parsed.length) {
      console.warn('[triage] falling back to heuristic');
      return issues.map(issue => {
        const text     = (issue.title + ' ' + (issue.body ?? '')).toLowerCase();
        const priority: TriageResult['priority'] =
          /crash|critical|urgent|down|outage|security|vuln/.test(text) ? 'critical' :
          /bug|error|fail|broken|exception/.test(text)                 ? 'high'     :
          /improve|enhance|feat|slow|perf/.test(text)                  ? 'medium'   : 'low';

        const labelName =
          /bug|error|crash/.test(text)  ? 'bug'           :
          /feat|enhance/.test(text)     ? 'enhancement'   :
          /doc|readme/.test(text)       ? 'documentation' :
          /question|how|why/.test(text) ? 'question'      : 'bug';

        return {
          issueNumber:     issue.number,
          priority,
          summary:         `Heuristic: appears to be a ${priority}-priority ${labelName}.`,
          suggestedLabels: [{ name: labelName, color: LABEL_COLORS[labelName] ?? '#94a3b8' }],
        };
      });
    }

    // Hydrate label names → { name, color }
    return parsed.map(item => ({
      issueNumber:       item.issueNumber,
      priority:          item.priority          ?? 'low',
      summary:           item.summary           ?? '',
      suggestedAssignee: item.suggestedAssignee,
      suggestedLabels:   (item.suggestedLabels ?? []).map(name => ({
        name,
        color: LABEL_COLORS[name] ?? '#94a3b8',
      })),
    }));
  },
};

export default aiService;