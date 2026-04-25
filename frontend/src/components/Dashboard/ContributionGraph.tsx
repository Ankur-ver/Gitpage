import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';

/* ── Constants ─────────────────────────────────────────────────── */
const LEVEL_COLORS = ['#1a1a24', '#1e3a5f', '#1e40af', '#4f46e5', '#818cf8'];
const MONTHS       = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAY_LABELS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

type WeekRange = 16 | 26 | 52;

type ContributionCell = {
  date:  Date;
  count: number;
  level: number;
};

interface ContributionGraphProps {
  username?:       string;
  onTotalChange?:  (count: number) => void;
}

/* ── Helpers ───────────────────────────────────────────────────── */
const getDateKey  = (d: Date) => d.toISOString().slice(0, 10);

const getStartDate = (weeks: number) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - weeks * 7 + 1);
  return d;
};

const getLevel = (count: number, max: number) => {
  if (count === 0) return 0;
  if (max <= 1)    return 1;
  const r = count / max;
  if (r <= 0.25) return 1;
  if (r <= 0.50) return 2;
  if (r <= 0.75) return 3;
  return 4;
};

const buildGraph = (
  dailyCounts: Record<string, number>,
  weeks: WeekRange
): ContributionCell[][] => {
  const start = getStartDate(weeks);
  const cells: ContributionCell[] = [];

  for (let i = 0; i < weeks * 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    cells.push({ date: d, count: dailyCounts[getDateKey(d)] ?? 0, level: 0 });
  }

  const max = Math.max(...cells.map(c => c.count), 1);
  const graph: ContributionCell[][] = [];

  for (let w = 0; w < weeks; w++) {
    const week: ContributionCell[] = [];
    for (let d = 0; d < 7; d++) {
      const c = cells[w * 7 + d];
      week.push({ ...c, level: getLevel(c.count, max) });
    }
    graph.push(week);
  }
  return graph;
};

/* ── Tooltip ───────────────────────────────────────────────────── */
interface TooltipState {
  cell:    ContributionCell;
  x:       number;
  y:       number;
  visible: boolean;
}

/* ════════════════════════════════════════════════════════════════ */
const ContributionGraph: React.FC<ContributionGraphProps> = ({
  username,
  onTotalChange,
}) => {
  const [graph,      setGraph]      = useState<ContributionCell[][]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [total,      setTotal]      = useState(0);
  const [weeks,      setWeeks]      = useState<WeekRange>(52);
  const [streak,     setStreak]     = useState(0);
  const [tooltip,    setTooltip]    = useState<TooltipState | null>(null);
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);  // YYYY-MM-DD

  /* daily counts kept for range switching without re-fetching */
  const [dailyCounts, setDailyCounts] = useState<Record<string, number>>({});

  const containerRef = useRef<HTMLDivElement>(null);

  /* ── Fetch ── */
  const fetchContributions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const q = username ? `?username=${encodeURIComponent(username)}` : '';
      const { data } = await api.get<{
        total:       number;
        streak:      number;
        dailyCounts: Record<string, number>;
      }>(`/contributions${q}`);

      setDailyCounts(data.dailyCounts);
      setTotal(data.total);
      setStreak(data.streak ?? 0);
      setGraph(buildGraph(data.dailyCounts, weeks));
      onTotalChange?.(data.total);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to load contributions.');
    } finally {
      setLoading(false);
    }
  }, [username, onTotalChange]);    // ← weeks deliberately excluded here

  /* rebuild graph when range changes (no extra fetch) */
  useEffect(() => {
    if (Object.keys(dailyCounts).length) {
      setGraph(buildGraph(dailyCounts, weeks));
    }
  }, [weeks, dailyCounts]);

  useEffect(() => { fetchContributions(); }, [fetchContributions]);

  /* ── Month labels ── */
  const monthLabels = useMemo(() =>
    graph.map((week, w) => {
      const m    = week[0].date.getMonth();
      const prev = w > 0 ? graph[w - 1][0].date.getMonth() : -1;
      return m !== prev ? MONTHS[m] : '';
    }),
  [graph]);

  /* ── Stats ── */
  const activeDays  = useMemo(() =>
    graph.flat().filter(c => c.count > 0).length,
  [graph]);

  const busiest = useMemo(() => {
    const flat = graph.flat();
    return flat.reduce((a, b) => (b.count > a.count ? b : a), flat[0] ?? { count: 0, date: new Date() });
  }, [graph]);

  /* ── Tooltip handlers ── */
  const showTooltip = (
    e:    React.MouseEvent<HTMLDivElement>,
    cell: ContributionCell
  ) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const cont = containerRef.current?.getBoundingClientRect();
    setTooltip({
      cell,
      x: rect.left - (cont?.left ?? 0) + rect.width / 2,
      y: rect.top  - (cont?.top  ?? 0) - 8,
      visible: true,
    });
    setHoveredDay(getDateKey(cell.date));
  };

  const hideTooltip = () => {
    setTooltip(null);
    setHoveredDay(null);
  };

  /* ════════════════════════════════════════════════════════ */
  return (
    <div className="space-y-4">

      {/* ── Stats row ── */}
      {!loading && !error && (
        <div className="flex items-center gap-4 flex-wrap">
          {[
            { label: 'Total',       value: total.toLocaleString(),  color: 'text-indigo-400' },
            { label: 'Day streak',  value: `${streak}d`,            color: 'text-green-400'  },
            { label: 'Active days', value: activeDays.toString(),   color: 'text-blue-400'   },
            { label: 'Busiest day', value: `${busiest.count}`,      color: 'text-yellow-400' },
          ].map(s => (
            <div key={s.label} className="flex flex-col">
              <span className={`text-sm font-bold ${s.color}`}>{s.value}</span>
              <span className="text-[10px] text-text-muted">{s.label}</span>
            </div>
          ))}

          {/* range picker */}
          <div className="ml-auto flex items-center gap-1">
            {([16, 26, 52] as WeekRange[]).map(w => (
              <button
                key={w}
                onClick={() => setWeeks(w)}
                className={`px-2 py-1 rounded text-[11px] transition-colors ${
                  weeks === w
                    ? 'bg-indigo-600 text-white'
                    : 'text-text-muted hover:text-text-primary hover:bg-bg-tertiary border border-[#2a2a3a]'
                }`}
              >
                {w === 52 ? '1y' : w === 26 ? '6m' : '4m'}
              </button>
            ))}

            <button
              onClick={fetchContributions}
              className="ml-1 p-1 rounded border border-[#2a2a3a] text-text-muted
                         hover:text-text-primary hover:bg-bg-tertiary transition-colors"
              title="Refresh"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" strokeWidth="2">
                <path d="M1 4v6h6M23 20v-6h-6"/>
                <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* ── Graph ── */}
      <div ref={containerRef} className="relative overflow-x-auto pb-2">

        {/* Tooltip */}
        <AnimatePresence>
          {tooltip?.visible && (
            <motion.div
              initial={{ opacity: 0, y: 4, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1    }}
              exit={{    opacity: 0, y: 4, scale: 0.95 }}
              transition={{ duration: 0.12 }}
              className="absolute z-20 pointer-events-none -translate-x-1/2 -translate-y-full"
              style={{ left: tooltip.x, top: tooltip.y }}
            >
              <div className="bg-bg-secondary border border-[#2a2a3a] rounded-lg px-2.5 py-1.5
                              shadow-xl text-center min-w-[110px]">
                <p className="text-xs font-semibold text-text-primary">
                  {tooltip.cell.count} contribution{tooltip.cell.count !== 1 ? 's' : ''}
                </p>
                <p className="text-[10px] text-text-muted mt-0.5">
                  {tooltip.cell.date.toLocaleDateString('en-US', {
                    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
                  })}
                </p>
              </div>
              {/* arrow */}
              <div className="w-2 h-2 bg-bg-secondary border-r border-b border-[#2a2a3a]
                              rotate-45 mx-auto -mt-1" />
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          /* skeleton */
          <div className="flex gap-1 animate-pulse">
            {[...Array(weeks)].map((_, w) => (
              <div key={w} className="flex flex-col gap-1">
                {[...Array(7)].map((_, d) => (
                  <div key={d} className="w-3 h-3 rounded-sm bg-bg-tertiary" />
                ))}
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-6">
            <p className="text-xs text-text-muted">{error}</p>
            <button
              onClick={fetchContributions}
              className="mt-2 text-xs text-indigo-400 hover:underline"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="flex gap-1 min-w-max">

            {/* Day-of-week labels */}
            <div className="flex flex-col gap-1 mr-1 mt-6 flex-shrink-0">
              {DAY_LABELS.map((label, i) => (
                <div key={i}
                  className="h-3 text-[10px] text-text-muted leading-none flex items-center w-6">
                  {i % 2 === 1 ? label : ''}
                </div>
              ))}
            </div>

            <div>
              {/* Month labels */}
              <div className="flex gap-1 mb-1 h-4">
                {monthLabels.map((label, w) => (
                  <div key={w} className="w-3 text-[10px] text-text-muted leading-none">
                    {label}
                  </div>
                ))}
              </div>

              {/* Grid */}
              <div className="flex gap-1">
                {graph.map((week, w) => (
                  <div key={w} className="flex flex-col gap-1">
                    {week.map((cell, d) => {
                      const key       = getDateKey(cell.date);
                      const isHovered = hoveredDay === key;
                      const isFuture  = cell.date > new Date();

                      return (
                        <motion.div
                          key={d}
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: isFuture ? 0.2 : 1 }}
                          transition={{
                            delay:    Math.min((w * 7 + d) * 0.001, 0.4),
                            duration: 0.15,
                          }}
                          whileHover={{ scale: isFuture ? 1 : 1.5, zIndex: 10 }}
                          className="w-3 h-3 rounded-sm cursor-pointer relative"
                          style={{
                            backgroundColor: LEVEL_COLORS[cell.level],
                            outline:   isHovered ? `2px solid #818cf8` : 'none',
                            outlineOffset: '1px',
                          }}
                          onMouseEnter={e => !isFuture && showTooltip(e, cell)}
                          onMouseLeave={hideTooltip}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Legend ── */}
        {!loading && !error && (
          <div className="flex items-center gap-2 mt-3 justify-end">
            <span className="text-[11px] text-text-muted">Less</span>
            {LEVEL_COLORS.map((c, i) => (
              <motion.div
                key={i}
                whileHover={{ scale: 1.3 }}
                className="w-3 h-3 rounded-sm cursor-default"
                style={{ backgroundColor: c }}
                title={['None', 'Low', 'Medium', 'High', 'Very high'][i]}
              />
            ))}
            <span className="text-[11px] text-text-muted">More</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContributionGraph;