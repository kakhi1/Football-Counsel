import React, { useState, useEffect, useRef } from 'react';
import { TELEGRAM_BOT_URL, fetchMatchById, sendAgentQuery } from '../services/api';
import { useApp } from '../context/AppContext';
import StatBallLogo from '../components/StatBallLogo';

export default function MatchAgentScreen() {
  const {
    setCurrentScreen,
    activeMatch,
    matches,
    unlockedMatchIds,
    selectMatchForAnalysis,
    user
  } = useApp();

  const [detailedMatch, setDetailedMatch] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [regeneratingSummary, setRegeneratingSummary] = useState(false);
  const [showHistoricalGames, setShowHistoricalGames] = useState(false);
  const [showLineups, setShowLineups] = useState(false);

  // Embedded Match Chat State
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isQueryingChat, setIsQueryingChat] = useState(false);
  const [expandedSqlIds, setExpandedSqlIds] = useState({});
  const chatEndRef = useRef(null);

  const currentMatchId = activeMatch?.id || (matches.length > 0 ? matches[0].id : null);

  // Fetch full match details (AI summary, insights, historical profiles, lineups) when match changes
  useEffect(() => {
    if (!currentMatchId) return;
    let isCurrent = true;

    async function loadDetails() {
      setLoadingDetails(true);
      const res = await fetchMatchById(currentMatchId, false);
      if (isCurrent && res) {
        setDetailedMatch(res);
        // Reset match-scoped chat welcome message for this specific fixture
        const h = res.home_team || 'Home';
        const a = res.away_team || 'Away';
        const hGames = res.home_profile?.matches_played || 0;
        const aGames = res.away_profile?.matches_played || 0;
        const hCor = res.home_profile?.avg_corners_for || 5.2;
        const aCor = res.away_profile?.avg_corners_for || 4.8;
        const hFouls = res.home_profile?.avg_fouls || 11.5;
        const aFouls = res.away_profile?.avg_fouls || 11.2;
        const hXg = res.home_profile?.avg_xg_for || 1.5;
        const aXg = res.away_profile?.avg_xg_for || 1.3;

        setChatMessages([
          {
            id: `init_${res.id}`,
            isWelcome: true,
            query: `Ask Counsel AI about ${h} vs ${a}`,
            sql: `SELECT * FROM match_stats WHERE home_team IN ('${h}', '${a}') OR away_team IN ('${h}', '${a}') AND home_score IS NOT NULL;`,
            reasoning: `Loaded ${hGames} historical ${h} matches & ${aGames} historical ${a} matches for live querying.`,
            narrative: `Have a specific question about ${h} vs ${a}? Ask below or click a prompt chip to query both teams' historical records (corners, fouls, cards, xG, player ratings, or last 5 games):`,
            detail: `Historical baseline: ${h} averages ${hXg} xG, ${hCor} corners, ${hFouls} fouls/game • ${a} averages ${aXg} xG, ${aCor} corners, ${aFouls} fouls/game.`,
            metric_label: `${h} vs ${a} — Historical Baseline`,
            chartData: [
              { team: `${h} Avg xG`, value: Number(hXg), percent: Math.min(100, Math.round((hXg / 3.0) * 100)), color: 'emerald' },
              { team: `${a} Avg xG`, value: Number(aXg), percent: Math.min(100, Math.round((aXg / 3.0) * 100)), color: 'cyan' },
              { team: `${h} Corners/G`, value: Number(hCor), percent: Math.min(100, Math.round((hCor / 10.0) * 100)), color: 'emerald' },
              { team: `${a} Corners/G`, value: Number(aCor), percent: Math.min(100, Math.round((aCor / 10.0) * 100)), color: 'cyan' },
            ],
            followUps: [
              `Compare ${h} vs ${a} corners`,
              `Show fouls and yellow cards for ${h} vs ${a}`,
              `Show last 5 matches form for both teams`,
              `Who are the top rated players in ${h} vs ${a}?`
            ]
          }
        ]);
      }
      if (isCurrent) setLoadingDetails(false);
    }
    loadDetails();

    return () => {
      isCurrent = false;
    };
  }, [currentMatchId]);

  const match = detailedMatch || activeMatch || (matches.length > 0 ? matches[0] : null);

  const handleRegenerateSummary = async () => {
    if (!match?.id || regeneratingSummary) return;
    setRegeneratingSummary(true);
    const res = await fetchMatchById(match.id, true);
    if (res) {
      setDetailedMatch(res);
    }
    setRegeneratingSummary(false);
  };

  const handleSendChat = async (promptText) => {
    const q = (promptText || chatInput).trim();
    if (!q || isQueryingChat || !match) return;

    const h = match.home_team || 'Home';
    const a = match.away_team || 'Away';
    setChatInput('');
    setIsQueryingChat(true);

    try {
      const response = await sendAgentQuery(q, `${h} vs ${a}`, h, a);
      if (response) {
        setChatMessages(prev => [...prev, response]);
        setTimeout(() => {
          chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
      }
    } catch (err) {
      console.error('Match chat query failed:', err);
    } finally {
      setIsQueryingChat(false);
    }
  };

  const toggleSql = (msgId) => {
    setExpandedSqlIds(prev => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  if (!match) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-3">
        <span className="material-symbols-outlined text-4xl text-[#64748B]">analytics</span>
        <h3 className="text-base font-bold text-[#0F172A] dark:text-[#F8FAFC]">No Upcoming Match Selected</h3>
        <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
          Select an upcoming game from the Next Games page to view its AI Summary and ask questions.
        </p>
        <button
          onClick={() => setCurrentScreen('matches')}
          className="px-4 py-2 rounded-xl bg-[#059669] text-white text-xs font-semibold"
        >
          Browse Next Games
        </button>
      </div>
    );
  }

  const homeTeam = match.home_team || 'Home';
  const awayTeam = match.away_team || 'Away';
  const competition = match.venue
    ? `${match.competition} • ${match.venue}`
    : match.competition || 'League Match';
  const matchTime = match.match_time || 'Scheduled';
  const pills = match.pills || [];
  const aiSummary = match.ai_summary || match.narrativeP1 || 'Tactical analysis generated by Counsel Match Intelligence.';
  const narrativeP2 = match.narrativeP2 || '';
  const aiInsights = match.ai_insights || [];
  const tags = match.tags || [];
  const stats = match.stats || [];
  const lineups = match.lineups || { home: [], away: [] };
  const homeRecent = match.home_profile?.recent_matches || [];
  const awayRecent = match.away_profile?.recent_matches || [];

  const quickMatchPrompts = [
    `Compare ${homeTeam} vs ${awayTeam} corners`,
    `Show fouls & yellow cards for ${homeTeam} vs ${awayTeam}`,
    `Show last 5 matches form for both teams`,
    `Who are the top rated players in ${homeTeam} vs ${awayTeam}?`,
    `Compare shots & big chances for ${homeTeam} vs ${awayTeam}`,
    `Head-to-head history between ${homeTeam} and ${awayTeam}`
  ];

  return (
    <div className="flex-1 flex flex-col items-center pt-2 pb-28 md:py-6 px-3 sm:px-6 lg:px-8 max-w-[920px] mx-auto w-full overflow-y-auto custom-scroll transition-colors duration-200">
      
      {/* Top Navigation & Quick Upcoming Match Switcher Bar */}
      <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
        <button
          onClick={() => setCurrentScreen('matches')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#64748B] dark:text-[#94A3B8] hover:text-[#059669] dark:hover:text-[#10B981] bg-white dark:bg-[#131B2E] border border-[#E2E8F0] dark:border-[#1E293B] px-3 py-1.5 rounded-lg transition-colors self-start shadow-xs"
        >
          <span className="material-symbols-outlined text-[15px]">arrow_back</span>
          <span>Back to Next Games</span>
        </button>

        {/* Quick Switcher Pills for upcoming matches */}
        <div className="flex items-center gap-1.5 overflow-x-auto custom-scroll pb-0.5">
          {matches.slice(0, 5).map((m) => {
            const isCurrent = m.id === match.id;
            const isUnlocked = unlockedMatchIds.includes(m.id) || user.isPro;
            return (
              <button
                key={m.id}
                onClick={() => selectMatchForAnalysis(m)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono whitespace-nowrap flex items-center gap-1 border transition-all ${
                  isCurrent
                    ? 'bg-[#ECFDF5] dark:bg-[#10B981]/15 text-[#059669] dark:text-[#10B981] border-[#A7F3D0] dark:border-[#10B981]/40 font-bold'
                    : 'bg-white dark:bg-[#131B2E] text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] border-[#E2E8F0] dark:border-[#1E293B]'
                }`}
              >
                {!isUnlocked && !isCurrent && (
                  <span className="material-symbols-outlined text-[12px] text-[#0284C7] dark:text-[#0EA5E9]">
                    {!user.isAuthenticated && unlockedMatchIds.length >= 1 ? 'lock' : 'bolt'}
                  </span>
                )}
                <span>{m.home_team} v {m.away_team}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 1. Upcoming Match Header Card */}
      <section className="w-full bg-white dark:bg-[#131B2E] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl p-4 sm:p-5 shadow-xs mb-3 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded bg-[#ECFDF5] dark:bg-[#10B981]/15 text-[#059669] dark:text-[#10B981] text-[10px] font-mono font-bold uppercase">
                UPCOMING FIXTURE
              </span>
              <span className="text-xs font-mono font-medium text-[#64748B] dark:text-[#94A3B8]">{competition}</span>
              <span className="text-[#CBD5E1] dark:text-[#1E293B]">•</span>
              <span className="text-xs font-mono text-[#0F172A] dark:text-[#F8FAFC] font-semibold">{matchTime}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] tracking-tight flex items-center gap-2.5 pt-0.5">
              <span>{homeTeam}</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#F1F5F9] dark:bg-[#0B0F17] text-[#64748B] dark:text-[#94A3B8] font-semibold">
                VS
              </span>
              <span>{awayTeam}</span>
            </h1>
          </div>

          {/* Win Probability Summary Box */}
          <div className="flex flex-col gap-1 min-w-[210px] bg-[#F8FAFC] dark:bg-[#0B0F17] border border-[#E2E8F0] dark:border-[#1E293B] rounded-lg p-2.5">
            <div className="flex justify-between text-[10px] font-mono text-[#64748B] dark:text-[#94A3B8]">
              <span className="font-semibold text-[#059669] dark:text-[#10B981]">{homeTeam} {match.home_probability}%</span>
              <span>Draw {match.draw_probability}%</span>
              <span className="font-semibold text-[#0284C7] dark:text-[#0EA5E9]">{awayTeam} {match.away_probability}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full overflow-hidden flex bg-[#E2E8F0] dark:bg-[#1E293B] gap-0.5">
              <div className="bg-[#059669] dark:bg-[#10B981] h-full" style={{ width: `${match.home_probability}%` }} />
              <div className="bg-[#94A3B8] dark:bg-[#475569] h-full" style={{ width: `${match.draw_probability}%` }} />
              <div className="bg-[#0284C7] dark:bg-[#0EA5E9] h-full" style={{ width: `${match.away_probability}%` }} />
            </div>
          </div>
        </div>
      </section>

      {/* 2. Key Historical Insights Pills */}
      {pills.length > 0 && (
        <section className="w-full grid grid-cols-1 md:grid-cols-3 gap-2.5 mb-3">
          {pills.map((pill, idx) => {
            const isCyan = pill.color === 'cyan';
            return (
              <div
                key={idx}
                className={`bg-white dark:bg-[#131B2E] border rounded-lg p-3 flex items-start gap-2.5 transition-all shadow-xs ${
                  isCyan
                    ? 'border-[#BAE6FD] dark:border-[#0EA5E9]/30'
                    : 'border-[#A7F3D0] dark:border-[#10B981]/30'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 border ${
                    isCyan
                      ? 'bg-[#F0F9FF] dark:bg-[#0EA5E9]/15 border-[#BAE6FD] dark:border-[#0EA5E9]/30 text-[#0284C7] dark:text-[#0EA5E9]'
                      : 'bg-[#ECFDF5] dark:bg-[#10B981]/15 border-[#A7F3D0] dark:border-[#10B981]/30 text-[#059669] dark:text-[#10B981]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {pill.icon === 'whistle' ? 'sports' : pill.icon === 'target' ? 'my_location' : 'flag'}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span
                    className={`text-[10px] uppercase font-mono tracking-wider font-semibold ${
                      isCyan ? 'text-[#0284C7] dark:text-[#0EA5E9]' : 'text-[#059669] dark:text-[#10B981]'
                    }`}
                  >
                    {pill.title}
                  </span>
                  <span className="text-xs font-medium leading-snug text-[#0F172A] dark:text-[#F8FAFC]">
                    {pill.text}
                  </span>
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* 3. AI MATCH SUMMARY & HISTORICAL COMPARISON CARD */}
      <section className="w-full bg-white dark:bg-[#131B2E] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl p-4 sm:p-6 shadow-sm flex flex-col gap-5 transition-colors mb-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          
          {/* LEFT COLUMN: AI Pre-Match Summary & Bullet Insights */}
          <div className="md:col-span-7 flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0] dark:border-[#1E293B]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-[#059669] dark:text-[#10B981]">
                  auto_awesome
                </span>
                <span className="text-xs sm:text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC] uppercase tracking-wider">
                  AI Pre-Match Tactical Summary
                </span>
              </div>
              <button
                onClick={handleRegenerateSummary}
                disabled={regeneratingSummary || loadingDetails}
                className="text-[11px] font-mono text-[#059669] dark:text-[#10B981] hover:underline flex items-center gap-1 disabled:opacity-50"
                title="Refresh AI Summary from historical stats"
              >
                <span className={`material-symbols-outlined text-[14px] ${regeneratingSummary ? 'animate-spin' : ''}`}>
                  refresh
                </span>
                <span>{regeneratingSummary ? 'Analyzing...' : 'Refresh AI'}</span>
              </button>
            </div>

            {loadingDetails ? (
              <div className="space-y-2 animate-pulse py-2">
                <div className="h-4 bg-[#E2E8F0] dark:bg-[#1E293B] rounded w-full" />
                <div className="h-4 bg-[#E2E8F0] dark:bg-[#1E293B] rounded w-11/12" />
                <div className="h-4 bg-[#E2E8F0] dark:bg-[#1E293B] rounded w-4/5" />
              </div>
            ) : (
              <>
                <p className="text-xs sm:text-[13.5px] text-[#334155] dark:text-[#CBD5E1] leading-relaxed whitespace-pre-line">
                  {aiSummary}
                </p>
                {narrativeP2 && narrativeP2 !== aiSummary && (
                  <p className="text-xs sm:text-[13px] text-[#475569] dark:text-[#94A3B8] leading-relaxed">
                    {narrativeP2}
                  </p>
                )}
              </>
            )}

            {/* Key Data Analyst Bullet Insights */}
            {aiInsights.length > 0 && (
              <div className="bg-[#F8FAFC] dark:bg-[#0B0F17] border border-[#E2E8F0] dark:border-[#1E293B] rounded-lg p-3 space-y-1.5 mt-1">
                <div className="text-[10px] font-mono uppercase font-bold text-[#059669] dark:text-[#10B981] tracking-wider">
                  Key Historical Findings Used for Prediction
                </div>
                <ul className="space-y-1.5">
                  {aiInsights.map((insight, idx) => (
                    <li key={idx} className="text-xs text-[#334155] dark:text-[#CBD5E1] flex items-start gap-2 leading-snug">
                      <span className="text-[#059669] dark:text-[#10B981] font-bold mt-0.5">•</span>
                      <span>{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Qualitative Tactical Tags */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {tags.map((tag, idx) => (
                <span
                  key={idx}
                  className={`text-[11px] font-mono px-2 py-0.5 rounded border transition-colors ${
                    idx === 0
                      ? 'bg-[#ECFDF5] dark:bg-[#10B981]/15 text-[#059669] dark:text-[#10B981] border-[#A7F3D0] dark:border-[#10B981]/30 font-semibold'
                      : 'bg-[#F8FAFC] dark:bg-[#0B0F17] text-[#64748B] dark:text-[#94A3B8] border-[#E2E8F0] dark:border-[#1E293B]'
                  }`}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* RIGHT COLUMN: Dual Historical Stat Comparison Bars */}
          <div className="md:col-span-5 bg-[#F8FAFC] dark:bg-[#0B0F17] border border-[#E2E8F0] dark:border-[#1E293B] rounded-lg p-3.5 sm:p-4 flex flex-col gap-3.5 transition-colors">
            <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0] dark:border-[#1E293B] text-xs font-medium">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#059669] dark:bg-[#10B981]" />
                <span className="text-[#0F172A] dark:text-[#F8FAFC] font-semibold truncate max-w-[90px]">{homeTeam}</span>
              </div>
              <span className="text-[10px] uppercase font-mono text-[#64748B] dark:text-[#94A3B8]">Historical Avg</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[#0F172A] dark:text-[#F8FAFC] font-semibold truncate max-w-[90px]">{awayTeam}</span>
                <span className="w-2.5 h-2.5 rounded-sm bg-[#0284C7] dark:bg-[#0EA5E9]" />
              </div>
            </div>

            {stats.map((row, idx) => (
              <div key={idx} className="flex flex-col gap-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-mono font-semibold text-[#059669] dark:text-[#10B981]">{row.home}</span>
                  <span className="text-[11px] font-medium text-[#64748B] dark:text-[#94A3B8]">{row.label}</span>
                  <span className="font-mono font-semibold text-[#0284C7] dark:text-[#0EA5E9]">{row.away}</span>
                </div>
                <div className="w-full flex h-2 rounded-full overflow-hidden bg-[#E2E8F0] dark:bg-[#1E293B] gap-0.5">
                  <div
                    className="bg-[#059669] dark:bg-[#10B981] rounded-l-full shadow-xs"
                    style={{ width: `${row.homePct}%` }}
                  />
                  <div
                    className="bg-[#0284C7] dark:bg-[#0EA5E9] rounded-r-full shadow-xs"
                    style={{ width: `${row.awayPct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Collapsible Drawers: Historical Matches Used for Analysis & Projected Lineups */}
        <div className="pt-3 border-t border-[#E2E8F0] dark:border-[#1E293B] flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowHistoricalGames(prev => !prev)}
            className="px-3 py-1.5 rounded-lg bg-[#F8FAFC] dark:bg-[#0B0F17] hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#1E293B] text-xs font-mono text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-1.5 transition-colors"
          >
            <span className="material-symbols-outlined text-[15px] text-[#059669] dark:text-[#10B981]">history</span>
            <span>{showHistoricalGames ? 'Hide' : 'View'} Last 5 Historical Games Used for Analysis</span>
            <span className="material-symbols-outlined text-[15px]">
              {showHistoricalGames ? 'expand_less' : 'expand_more'}
            </span>
          </button>

          {(lineups.home.length > 0 || lineups.away.length > 0) && (
            <button
              type="button"
              onClick={() => setShowLineups(prev => !prev)}
              className="px-3 py-1.5 rounded-lg bg-[#F8FAFC] dark:bg-[#0B0F17] hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#1E293B] text-xs font-mono text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-1.5 transition-colors"
            >
              <span className="material-symbols-outlined text-[15px] text-[#0284C7] dark:text-[#0EA5E9]">groups</span>
              <span>{showLineups ? 'Hide' : 'View'} Projected Starting XI ({lineups.home.length + lineups.away.length} Players)</span>
              <span className="material-symbols-outlined text-[15px]">
                {showLineups ? 'expand_less' : 'expand_more'}
              </span>
            </button>
          )}
        </div>

        {/* Historical Last 5 Games Drawer */}
        {showHistoricalGames && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs font-mono">
            <div className="bg-[#F8FAFC] dark:bg-[#0B0F17] border border-[#E2E8F0] dark:border-[#1E293B] rounded-lg p-3 space-y-2">
              <div className="font-bold text-[#059669] dark:text-[#10B981] pb-1 border-b border-[#E2E8F0] dark:border-[#1E293B]">
                {homeTeam} — Last 5 Historical Matches
              </div>
              {homeRecent.map((m, i) => (
                <div key={i} className="flex items-center justify-between text-[11px] py-0.5 text-[#334155] dark:text-[#CBD5E1]">
                  <span className="truncate">
                    <strong className={m.result === 'W' ? 'text-[#059669]' : m.result === 'L' ? 'text-rose-500' : 'text-slate-400'}>
                      [{m.result}]
                    </strong>{' '}
                    {m.score} vs {m.opponent} ({m.venue})
                  </span>
                  <span className="text-[10px] text-[#64748B] shrink-0">
                    xG {m.xg ?? '-'} • {m.corners ?? '-'} cor
                  </span>
                </div>
              ))}
            </div>

            <div className="bg-[#F8FAFC] dark:bg-[#0B0F17] border border-[#E2E8F0] dark:border-[#1E293B] rounded-lg p-3 space-y-2">
              <div className="font-bold text-[#0284C7] dark:text-[#0EA5E9] pb-1 border-b border-[#E2E8F0] dark:border-[#1E293B]">
                {awayTeam} — Last 5 Historical Matches
              </div>
              {awayRecent.map((m, i) => (
                <div key={i} className="flex items-center justify-between text-[11px] py-0.5 text-[#334155] dark:text-[#CBD5E1]">
                  <span className="truncate">
                    <strong className={m.result === 'W' ? 'text-[#059669]' : m.result === 'L' ? 'text-rose-500' : 'text-slate-400'}>
                      [{m.result}]
                    </strong>{' '}
                    {m.score} vs {m.opponent} ({m.venue})
                  </span>
                  <span className="text-[10px] text-[#64748B] shrink-0">
                    xG {m.xg ?? '-'} • {m.corners ?? '-'} cor
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Projected Squad Lineups Drawer */}
        {showLineups && (lineups.home.length > 0 || lineups.away.length > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs font-mono">
            <div className="bg-[#F8FAFC] dark:bg-[#0B0F17] border border-[#E2E8F0] dark:border-[#1E293B] rounded-lg p-3 space-y-1.5">
              <div className="flex items-center justify-between font-bold text-[#059669] dark:text-[#10B981] pb-1 border-b border-[#E2E8F0] dark:border-[#1E293B]">
                <span>{homeTeam} Regular Starters</span>
                <span>{match.home_formation || '4-3-3'}</span>
              </div>
              {lineups.home.slice(0, 11).map((p, i) => (
                <div key={i} className="flex justify-between items-center text-[11px] py-0.5 text-[#334155] dark:text-[#CBD5E1]">
                  <span className="truncate">#{p.shirt || i + 1} {p.name}</span>
                  <span className="text-[#059669] dark:text-[#10B981] font-bold">
                    {p.starts ? `${p.starts} starts` : ''} {p.rating ? `(${p.rating.toFixed(1)})` : ''}
                  </span>
                </div>
              ))}
            </div>

            <div className="bg-[#F8FAFC] dark:bg-[#0B0F17] border border-[#E2E8F0] dark:border-[#1E293B] rounded-lg p-3 space-y-1.5">
              <div className="flex items-center justify-between font-bold text-[#0284C7] dark:text-[#0EA5E9] pb-1 border-b border-[#E2E8F0] dark:border-[#1E293B]">
                <span>{awayTeam} Regular Starters</span>
                <span>{match.away_formation || '4-2-3-1'}</span>
              </div>
              {lineups.away.slice(0, 11).map((p, i) => (
                <div key={i} className="flex justify-between items-center text-[11px] py-0.5 text-[#334155] dark:text-[#CBD5E1]">
                  <span className="truncate">#{p.shirt || i + 1} {p.name}</span>
                  <span className="text-[#0284C7] dark:text-[#0EA5E9] font-bold">
                    {p.starts ? `${p.starts} starts` : ''} {p.rating ? `(${p.rating.toFixed(1)})` : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 4. EMBEDDED MATCH CHAT SECTION ("ASK AI ABOUT THIS GAME") */}
      <section className="w-full bg-white dark:bg-[#131B2E] border-2 border-[#059669]/30 dark:border-[#10B981]/30 rounded-2xl p-4 sm:p-6 shadow-md flex flex-col gap-4 transition-colors">
        {/* Chat Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E2E8F0] dark:border-[#1E293B]">
          <div className="flex items-center gap-2.5">
            <StatBallLogo size={22} />
            <div>
              <h2 className="text-sm sm:text-base font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                Ask Counsel AI About {homeTeam} vs {awayTeam}
              </h2>
              <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                Interactive SQL Agent querying historical match stats, corners, fouls, xG, and player ratings for this matchup
              </p>
            </div>
          </div>

          <a
            href={TELEGRAM_BOT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="self-start sm:self-center px-3 py-1.5 rounded-lg bg-[#F8FAFC] dark:bg-[#0B0F17] hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] border border-[#E2E8F0] dark:border-[#1E293B] text-[11px] font-mono font-semibold flex items-center gap-1.5 transition-colors"
          >
            <span className="material-symbols-outlined text-[14px] text-[#0284C7] dark:text-[#0EA5E9]">send</span>
            <span>Telegram Bot</span>
          </a>
        </div>

        {/* Conversation Thread */}
        <div className="flex flex-col gap-4 max-h-[540px] overflow-y-auto custom-scroll pr-1">
          {chatMessages.map((item) => (
            <div key={item.id} className="space-y-3">
              {/* User Question Bubble (if not the initial welcome message) */}
              {!item.isWelcome && (
                <div className="flex justify-end w-full">
                  <div className="bg-[#059669] dark:bg-[#10B981] text-white dark:text-[#0B0F17] font-medium text-xs sm:text-sm rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[85%] shadow-xs">
                    {item.query}
                  </div>
                </div>
              )}

              {/* Collapsible SQL Reasoning Pill */}
              <div className="flex justify-start">
                <button
                  type="button"
                  onClick={() => toggleSql(item.id)}
                  className="bg-[#F8FAFC] dark:bg-[#0B0F17] hover:bg-[#F1F5F9] dark:hover:bg-[#1A243D] border border-[#E2E8F0] dark:border-[#1E293B] text-[11px] text-[#64748B] dark:text-[#94A3B8] px-3 py-1 rounded-full inline-flex items-center gap-1.5 transition-colors"
                >
                  <span className="material-symbols-outlined text-[13px] text-[#059669] dark:text-[#10B981]">terminal</span>
                  <span className="truncate max-w-[260px] sm:max-w-[440px] font-mono">{item.reasoning}</span>
                  <span className="material-symbols-outlined text-[13px]">
                    {expandedSqlIds[item.id] ? 'expand_less' : 'expand_more'}
                  </span>
                </button>
              </div>

              {expandedSqlIds[item.id] && item.sql && (
                <div className="bg-[#0E1420] text-[#10B981] p-3 rounded-xl border border-[#1E293B] text-[11px] font-mono overflow-x-auto">
                  <div className="text-[9px] text-[#94A3B8] uppercase font-bold mb-1">Executed Historical SQL:</div>
                  <pre className="whitespace-pre-wrap">{item.sql}</pre>
                </div>
              )}

              {/* AI Answer & Chart Card */}
              <div className="bg-[#F8FAFC] dark:bg-[#0B0F17] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl p-3.5 sm:p-4 flex flex-col lg:flex-row gap-4">
                <div className="lg:w-[50%] flex flex-col justify-between gap-3">
                  <div>
                    <p className="text-xs sm:text-sm text-[#0F172A] dark:text-[#F8FAFC] leading-relaxed font-medium">
                      {item.narrative}
                    </p>
                    {item.detail && (
                      <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-1.5 leading-normal">
                        {item.detail}
                      </p>
                    )}
                  </div>

                  {item.followUps && item.followUps.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {item.followUps.map((chip, idx) => (
                        <button
                          key={idx}
                          type="button"
                          disabled={isQueryingChat}
                          onClick={() => handleSendChat(chip)}
                          className="bg-white dark:bg-[#131B2E] hover:border-[#059669] dark:hover:border-[#10B981] border border-[#E2E8F0] dark:border-[#1E293B] text-[11px] text-[#0F172A] dark:text-[#F8FAFC] px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 transition-colors active:scale-95 disabled:opacity-50"
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${idx % 2 === 0 ? 'bg-[#059669] dark:bg-[#10B981]' : 'bg-[#0284C7] dark:bg-[#0EA5E9]'}`} />
                          <span>{chip}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right: Horizontal Comparison Bar Chart */}
                {item.chartData && item.chartData.length > 0 && (
                  <div className="lg:w-[50%] flex flex-col bg-white dark:bg-[#131B2E] border border-[#E2E8F0] dark:border-[#1E293B] rounded-lg p-3">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#E2E8F0] dark:border-[#1E293B]">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
                        {item.metric_label || 'MATCH TELEMETRY'}
                      </span>
                      <span className="font-mono text-[10px] text-[#059669] dark:text-[#10B981]">
                        Historical DB
                      </span>
                    </div>

                    <div className="flex flex-col gap-2">
                      {item.chartData.map((row, rIdx) => (
                        <div key={rIdx} className="flex items-center h-5 text-xs">
                          <span className="w-[125px] shrink-0 text-[#0F172A] dark:text-[#F8FAFC] font-mono text-[11px] text-right pr-2.5 truncate" title={row.team}>
                            {row.team}
                          </span>
                          <div className="flex-1 flex items-center h-full">
                            <div
                              className={`h-[14px] rounded-sm transition-all duration-500 ${
                                row.color === 'emerald'
                                  ? 'bg-[#059669] dark:bg-[#10B981]'
                                  : 'bg-[#0284C7] dark:bg-[#0EA5E9]'
                              }`}
                              style={{ width: `${row.percent}%` }}
                            />
                            <span className="ml-2 font-mono text-[11px] text-[#0F172A] dark:text-[#F8FAFC] font-semibold">
                              {typeof row.value === 'number' ? row.value.toFixed(1) : row.value}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isQueryingChat && (
            <div className="flex justify-start">
              <div className="bg-[#F8FAFC] dark:bg-[#0B0F17] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl p-3 flex items-center gap-2.5 text-xs font-mono text-[#64748B] dark:text-[#94A3B8]">
                <span className="material-symbols-outlined text-[16px] animate-spin text-[#059669] dark:text-[#10B981]">
                  refresh
                </span>
                <span>Querying historical records for {homeTeam} vs {awayTeam}...</span>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Quick Prompts Bar + Chat Input Form */}
        <div className="pt-2 border-t border-[#E2E8F0] dark:border-[#1E293B] space-y-2.5">
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scroll pb-1">
            {quickMatchPrompts.map((p, idx) => (
              <button
                key={idx}
                type="button"
                disabled={isQueryingChat}
                onClick={() => handleSendChat(p)}
                className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-[#F8FAFC] dark:bg-[#0B0F17] hover:bg-[#ECFDF5] dark:hover:bg-[#10B981]/15 border border-[#E2E8F0] dark:border-[#1E293B] text-[#64748B] dark:text-[#94A3B8] hover:text-[#059669] dark:hover:text-[#10B981] whitespace-nowrap transition-colors disabled:opacity-50"
              >
                {p}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendChat();
            }}
            className="flex items-center gap-2 bg-[#F8FAFC] dark:bg-[#0B0F17] border border-[#E2E8F0] dark:border-[#1E293B] focus-within:border-[#059669] dark:focus-within:border-[#10B981] rounded-xl px-3.5 py-2 transition-colors"
          >
            <input
              type="text"
              value={chatInput}
              disabled={isQueryingChat}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={`Ask any question about ${homeTeam} vs ${awayTeam} (e.g., corners, fouls, xG, players, form)...`}
              className="flex-1 bg-transparent border-0 text-xs sm:text-sm text-[#0F172A] dark:text-[#F8FAFC] placeholder-[#94A3B8] dark:placeholder-[#64748B] focus:ring-0 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!chatInput.trim() || isQueryingChat}
              className="px-3 py-1.5 rounded-lg bg-[#059669] hover:bg-[#047857] dark:bg-[#10B981] dark:hover:bg-[#059669] disabled:opacity-40 text-white dark:text-[#0B0F17] text-xs font-semibold flex items-center gap-1 transition-all shadow-xs active:scale-95"
            >
              <span>Ask AI</span>
              <span className="material-symbols-outlined text-[16px]">
                {isQueryingChat ? 'hourglass_top' : 'send'}
              </span>
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
