import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  ArrowPathIcon, FunnelIcon, BellIcon,
  CodeBracketIcon, ExclamationCircleIcon,
  ArrowsRightLeftIcon, StarIcon,
} from '@heroicons/react/24/outline';
import api from '../../services/api';

/* ── Types ─────────────────────────────────────────────────────── */
type EventType = 'issue' | 'pr' | 'push' | 'star' | 'fork' | 'comment' | 'release' | 'all';

type ActivityEvent = {
  id:        string;
  type:      Exclude<EventType, 'all'>;
  user:      string;
  owner:     string;
  repo:      string;
  detail:    string;
  timestamp: string;
  icon:      string;
  url?:      string;
  meta?: {
    branch?:    string;
    commits?:   number;
    issueNum?:  number;
    prNum?:     number;
    labels?:    string[];
  };
};

/* ── Helpers ───────────────────────────────────────────────────── */
const formatTime = (timestamp: string) => {
  const diff    = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60_000);
  const hours   = Math.floor(diff / 3_600_000);
  const days    = Math.floor(diff / 86_400_000);
  if (minutes < 1)  return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours   < 24) return `${hours}h ago`;
  if (days    <  7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
};

const TYPE_META: Record<Exclude<EventType,'all'>, { label: string; color: string; Icon: React.FC<any> }> = {
  issue:   { label: 'Issue',   color: 'text-green-400',  Icon: ExclamationCircleIcon   },
  pr:      { label: 'PR',      color: 'text-purple-400', Icon: ArrowsRightLeftIcon     },
  push:    { label: 'Push',    color: 'text-blue-400',   Icon: CodeBracketIcon         },
  star:    { label: 'Star',    color: 'text-yellow-400', Icon: StarIcon                },
  fork:    { label: 'Fork',    color: 'text-indigo-400', Icon: CodeBracketIcon         },
  comment: { label: 'Comment', color: 'text-text-muted', Icon: BellIcon               },
  release: { label: 'Release', color: 'text-pink-400',   Icon: BellIcon               },
};

const FILTERS: EventType[] = ['all', 'push', 'pr', 'issue', 'star', 'fork', 'comment', 'release'];

/* ════════════════════════════════════════════════════════════════ */
const ActivityFeed: React.FC<{ limit?: number }> = ({ limit = 30 }) => {
  const [events,       setEvents]       = useState<ActivityEvent[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [error,        setError]        = useState('');
  const [typeFilter,   setTypeFilter]   = useState<EventType>('all');
  const [showFilter,   setShowFilter]   = useState(false);
  const [page,         setPage]         = useState(1);
  const [hasMore,      setHasMore]      = useState(false);
  const [newCount,     setNewCount]     = useState(0);    // live badge

  /* ── fetch ── */
  const fetchFeed = useCallback(async (opts: { silent?: boolean; reset?: boolean } = {}) => {
    try {
      opts.silent ? setRefreshing(true) : setLoading(true);
      const p = opts.reset ? 1 : page;

      const { data } = await api.get<{
        events:  ActivityEvent[];
        hasMore: boolean;
        total:   number;
      }>(`/activity?type=${typeFilter}&page=${p}&limit=${limit}`);

      setEvents(prev =>
        opts.reset || p === 1 ? data.events : [...prev, ...data.events]
      );
      setHasMore(data.hasMore ?? false);
      setError('');
      setNewCount(0);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not load activity feed.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [typeFilter, page, limit]);

  /* initial + filter change */
  useEffect(() => {
    setPage(1);
    fetchFeed({ reset: true });
  }, [typeFilter]);

  /* poll for new events every 30 s */
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const { data } = await api.get<{ events: ActivityEvent[] }>(
          `/activity?type=${typeFilter}&page=1&limit=5`
        );
        const latest = data.events[0];
        if (latest && events.length && latest.id !== events[0]?.id) {
          setNewCount(c => c + 1);
        }
      } catch { /* silent */ }
    }, 30_000);
    return () => clearInterval(id);
  }, [typeFilter, events]);

  /* load more */
  const loadMore = () => {
    setPage(p => p + 1);
    fetchFeed();
  };

  const handleRefresh = () => {
    setPage(1);
    fetchFeed({ silent: true, reset: true });
  };

  /* ── filtered view ── */
  const visible = typeFilter === 'all'
    ? events
    : events.filter(e => e.type === typeFilter);

  /* ════════════════════════════════════════════════════════ */
  return (
    <div className="gradient-border p-5 space-y-4">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold text-text-primary text-sm">Recent Activity</h3>

        <div className="flex items-center gap-2">
          {/* new-events badge */}
          {newCount > 0 && (
            <button
              onClick={handleRefresh}
              className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full
                         bg-indigo-500/20 text-indigo-400 border border-indigo-500/30
                         hover:bg-indigo-500/30 transition-colors"
            >
              ↑ {newCount} new
            </button>
          )}

          {/* filter toggle */}
          <button
            onClick={() => setShowFilter(v => !v)}
            className={`p-1.5 rounded-lg border transition-colors ${
              showFilter || typeFilter !== 'all'
                ? 'border-indigo-500/40 bg-indigo-500/10 text-indigo-400'
                : 'border-[#2a2a3a] text-text-muted hover:text-text-primary hover:bg-bg-tertiary'
            }`}
            title="Filter by type"
          >
            <FunnelIcon className="w-3.5 h-3.5" />
          </button>

          {/* refresh */}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-1.5 rounded-lg border border-[#2a2a3a] text-text-muted
                       hover:text-text-primary hover:bg-bg-tertiary transition-colors
                       disabled:opacity-50"
            title="Refresh"
          >
            <ArrowPathIcon className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Filter chips ── */}
      <AnimatePresence>
        {showFilter && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap gap-1.5 pb-1">
              {FILTERS.map(f => (
                <button
                  key={f}
                  onClick={() => setTypeFilter(f)}
                  className={`px-2.5 py-1 rounded-full text-[11px] capitalize border transition-colors ${
                    typeFilter === f
                      ? 'bg-indigo-600 text-white border-indigo-500'
                      : 'border-[#2a2a3a] text-text-muted hover:text-text-primary hover:bg-bg-tertiary'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Body ── */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-start gap-3 animate-pulse">
              <div className="w-8 h-8 rounded-lg bg-bg-tertiary flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 bg-bg-tertiary rounded w-3/4" />
                <div className="h-2.5 bg-bg-tertiary rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-6">
          <ExclamationCircleIcon className="w-8 h-8 text-text-muted mx-auto mb-2" />
          <p className="text-xs text-text-muted">{error}</p>
          <button
            onClick={handleRefresh}
            className="mt-2 text-xs text-indigo-400 hover:underline"
          >
            Try again
          </button>
        </div>
      ) : visible.length === 0 ? (
        <div className="text-center py-6">
          <BellIcon className="w-8 h-8 text-text-muted mx-auto mb-2" />
          <p className="text-xs text-text-muted">
            {typeFilter === 'all' ? 'No recent activity yet.' : `No ${typeFilter} events yet.`}
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          <AnimatePresence initial={false}>
            {visible.map((ev, i) => {
              const meta = TYPE_META[ev.type] ?? TYPE_META.comment;
              return (
                <motion.div
                  key={ev.id}
                  initial={{ opacity: 0, x: -12, height: 0 }}
                  animate={{ opacity: 1, x: 0, height: 'auto' }}
                  exit={{ opacity: 0, x: 12, height: 0 }}
                  transition={{ delay: i < 10 ? i * 0.03 : 0, duration: 0.2 }}
                  className="flex items-start gap-3 py-2.5 px-2 rounded-lg
                             hover:bg-bg-tertiary transition-colors group"
                >
                  {/* icon */}
                  <div className="w-8 h-8 rounded-lg bg-bg-tertiary flex items-center
                                  justify-center flex-shrink-0 mt-0.5 text-sm">
                    {ev.icon}
                  </div>

                  {/* content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary leading-snug">
                      <Link
                        to={`/${ev.user}`}
                        className="text-indigo-400 hover:underline font-medium"
                      >
                        {ev.user}
                      </Link>
                      {' · '}
                      <Link
                        to={`/${ev.owner}/${ev.repo}`}
                        className="text-indigo-400 hover:underline"
                      >
                        {ev.owner}/{ev.repo}
                      </Link>
                    </p>

                    <p className="text-xs text-text-muted mt-0.5 leading-snug">
                      {ev.detail}
                    </p>

                    {/* meta badges */}
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {/* type badge */}
                      <span className={`text-[10px] font-medium ${meta.color}`}>
                        {meta.label}
                      </span>

                      {ev.meta?.branch && (
                        <span className="text-[10px] text-green-400 font-mono bg-green-500/10
                                         px-1.5 py-0.5 rounded">
                          {ev.meta.branch}
                        </span>
                      )}

                      {ev.meta?.commits !== undefined && (
                        <span className="text-[10px] text-text-muted">
                          {ev.meta.commits} commit{ev.meta.commits !== 1 ? 's' : ''}
                        </span>
                      )}

                      {(ev.meta?.issueNum || ev.meta?.prNum) && (
                        <span className="text-[10px] text-indigo-400">
                          #{ev.meta.issueNum ?? ev.meta.prNum}
                        </span>
                      )}

                      {ev.meta?.labels?.map(l => (
                        <span
                          key={l}
                          className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-500/10
                                     text-indigo-300 border border-indigo-500/20"
                        >
                          {l}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* timestamp */}
                  <span className="text-[11px] text-text-muted flex-shrink-0 mt-0.5
                                   group-hover:text-text-secondary transition-colors">
                    {formatTime(ev.timestamp)}
                  </span>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* ── Load more ── */}
      {hasMore && !loading && (
        <button
          onClick={loadMore}
          className="w-full text-xs text-text-muted hover:text-text-primary
                     hover:bg-bg-tertiary rounded-lg py-2 transition-colors border
                     border-[#2a2a3a] border-dashed"
        >
          Load more
        </button>
      )}
    </div>
  );
};

export default ActivityFeed;