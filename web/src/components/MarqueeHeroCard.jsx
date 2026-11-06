import React from 'react';

/**
 * MarqueeHeroCard — High-Impact Spotlight Component for the Matchday Headline Fixture
 * Displays countdown/kickoff, table positions, expected formations, win probabilities, and primary CTA.
 */
export default function MarqueeHeroCard({ match, onSelectMatch }) {
  if (!match) return null;

  const homeStandings = match.home_standings;
  const awayStandings = match.away_standings;
  const homeFormation = match.home_formation || '4-3-3';
  const awayFormation = match.away_formation || '4-2-3-1';

  const homeProb = match.home_probability ?? 40;
  const drawProb = match.draw_probability ?? 30;
  const awayProb = match.away_probability ?? 30;

  const projXgHome = match.proj_xg?.home || match.stats?.[0]?.home || '1.75';
  const projXgAway = match.proj_xg?.away || match.stats?.[0]?.away || '1.45';

  const formatKickoff = (dateStr) => {
    if (!dateStr) return 'Upcoming';
    try {
      const dt = new Date(dateStr.replace(' ', 'T'));
      if (isNaN(dt.getTime())) return dateStr;
      return dt.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const formatTeamMonogram = (name = '') => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 3).toUpperCase();
  };

  return (
    <article
      onClick={() => onSelectMatch?.(match)}
      className="relative w-full overflow-hidden rounded-2xl border border-emerald-500/30 dark:border-emerald-500/20 bg-gradient-to-br from-white via-[#F8FAFC] to-emerald-50/20 dark:from-[#131B2E] dark:via-[#0F172A] dark:to-[#082F49]/40 p-5 sm:p-6 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group"
    >
      {/* Decorative Glow Orb */}
      <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-emerald-500/10 dark:bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top Meta Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 mb-5 relative z-10">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-pulse" />
            <span>{match.marquee_reason || '⚔️ Matchday Headline'}</span>
          </span>

          <span className="text-xs font-mono font-medium text-slate-500 dark:text-slate-400">
            {match.competition} • {formatKickoff(match.match_time)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {match.venue && (
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono text-slate-500 dark:text-slate-400">
              <span className="material-symbols-outlined text-[14px]">stadium</span>
              <span>{match.venue}</span>
            </span>
          )}
          <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-[11px] font-mono font-bold">
            Impact {match.impact_score || 95}/100
          </span>
        </div>
      </div>

      {/* Center Matchup Showcase */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-4 items-center mb-5 relative z-10">
        
        {/* Home Team */}
        <div className="md:col-span-3 flex items-center gap-3.5">
          <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-800 text-white font-mono font-extrabold text-base sm:text-lg flex items-center justify-center shadow-sm shrink-0 border border-emerald-400/30">
            {formatTeamMonogram(match.home_team)}
          </div>
          <div className="space-y-1 min-w-0">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              {match.home_team}
            </h2>
            <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-700">
                {homeStandings ? `#${homeStandings.position} (${homeStandings.points} pts)` : '#--'}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Fmt: <strong className="text-emerald-700 dark:text-emerald-400 font-semibold">{homeFormation}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Center VS & Proj xG */}
        <div className="md:col-span-1 flex flex-row md:flex-col items-center justify-center gap-2 py-1">
          <div className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
            VS
          </div>
          <div className="text-center font-mono text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
            xG <strong className="text-emerald-600 dark:text-emerald-400">{projXgHome}</strong> - <strong className="text-sky-600 dark:text-sky-400">{projXgAway}</strong>
          </div>
        </div>

        {/* Away Team */}
        <div className="md:col-span-3 flex items-center justify-start md:justify-end gap-3.5 md:text-right">
          <div className="space-y-1 min-w-0 order-2 md:order-1">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white truncate group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
              {match.away_team}
            </h2>
            <div className="flex flex-wrap items-center justify-start md:justify-end gap-1.5 text-xs font-mono">
              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-700">
                {awayStandings ? `#${awayStandings.position} (${awayStandings.points} pts)` : '#--'}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Fmt: <strong className="text-sky-600 dark:text-sky-400 font-semibold">{awayFormation}</strong>
              </span>
            </div>
          </div>
          <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-sky-600 to-indigo-800 text-white font-mono font-extrabold text-base sm:text-lg flex items-center justify-center shadow-sm shrink-0 border border-sky-400/30 order-1 md:order-2">
            {formatTeamMonogram(match.away_team)}
          </div>
        </div>

      </div>

      {/* Calibrated Win Probability Bar */}
      <div className="space-y-1.5 mb-5 relative z-10">
        <div className="flex justify-between text-[11px] font-mono text-slate-600 dark:text-slate-300 font-semibold">
          <span className="text-emerald-700 dark:text-emerald-400">{match.home_team} {homeProb}%</span>
          <span className="text-slate-500 dark:text-slate-400">Draw {drawProb}%</span>
          <span className="text-sky-600 dark:text-sky-400">{match.away_team} {awayProb}%</span>
        </div>
        <div className="w-full h-2 rounded-full overflow-hidden flex bg-slate-200 dark:bg-slate-800 gap-0.5">
          <div
            className="bg-emerald-600 dark:bg-emerald-500 h-full transition-all duration-300"
            style={{ width: `${homeProb}%` }}
            title={`${match.home_team} win: ${homeProb}%`}
          />
          <div
            className="bg-slate-400 dark:bg-slate-600 h-full transition-all duration-300"
            style={{ width: `${drawProb}%` }}
            title={`Draw: ${drawProb}%`}
          />
          <div
            className="bg-sky-600 dark:bg-sky-500 h-full transition-all duration-300"
            style={{ width: `${awayProb}%` }}
            title={`${match.away_team} win: ${awayProb}%`}
          />
        </div>
      </div>

      {/* Bottom Insights Teaser & CTA */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3.5 border-t border-slate-200/80 dark:border-slate-800 relative z-10">
        <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 min-w-0">
          <span className="material-symbols-outlined text-[18px] text-emerald-600 dark:text-emerald-400 shrink-0">
            auto_awesome
          </span>
          <span className="truncate font-medium">
            {match.teaser_pill || match.narrativeP1 || 'Full statistical modeling & tactical scouting ready.'}
          </span>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelectMatch?.(match);
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white dark:text-slate-950 shadow-sm transition-all active:scale-95 shrink-0"
        >
          <span>Analyze Match Intelligence</span>
          <span className="material-symbols-outlined text-[17px]">arrow_forward</span>
        </button>
      </div>
    </article>
  );
}
