import React from 'react';

/**
 * MinimalFixtureCard — Lightweight First-Touch Card for Upcoming Matches
 * Presents kickoff time, table standings, expected formations, win probabilities, and access gating CTA.
 */
export default function MinimalFixtureCard({ match, accessMeta, onSelectMatch }) {
  if (!match) return null;

  const homeStandings = match.home_standings;
  const awayStandings = match.away_standings;
  const homeFormation = match.home_formation || '4-3-3';
  const awayFormation = match.away_formation || '4-2-3-1';

  const homeProb = match.home_probability ?? 40;
  const drawProb = match.draw_probability ?? 30;
  const awayProb = match.away_probability ?? 30;

  const projXgHome = match.proj_xg?.home || match.stats?.[0]?.home || '1.50';
  const projXgAway = match.proj_xg?.away || match.stats?.[0]?.away || '1.20';

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

  return (
    <div
      onClick={() => onSelectMatch?.(match)}
      className="group cursor-pointer bg-white dark:bg-[#131B2E] hover:border-[#059669] dark:hover:border-[#10B981] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between gap-3.5"
    >
      {/* Top Meta Row: League, Kickoff Time & Access Gating Pill */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#64748B] dark:text-[#94A3B8] truncate">
          {match.is_marquee ? (
            <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-[9px] uppercase border border-amber-500/20">
              MARQUEE
            </span>
          ) : (
            <span className="px-1.5 py-0.5 rounded bg-[#ECFDF5] dark:bg-[#10B981]/10 text-[#059669] dark:text-[#10B981] font-bold text-[9px] uppercase">
              NEXT
            </span>
          )}
          <span className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] truncate">
            {match.competition}
          </span>
          <span>•</span>
          <span className="truncate">{formatKickoff(match.match_time)}</span>
        </div>

        {accessMeta && (
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold border shrink-0 ${accessMeta.badgeStyle}`}
          >
            <span className="material-symbols-outlined text-[13px]">{accessMeta.icon}</span>
            <span>{accessMeta.badgeText}</span>
          </span>
        )}
      </div>

      {/* Marquee Reason Pill if present */}
      {match.marquee_reason && match.is_marquee && (
        <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
          <span>{match.marquee_reason}</span>
        </div>
      )}

      {/* Matchup Header with Table Standings Chips */}
      <div className="space-y-2">
        {/* Home Team Row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-base font-bold text-[#0F172A] dark:text-[#F8FAFC] group-hover:text-[#059669] dark:group-hover:text-[#10B981] transition-colors truncate">
              {match.home_team}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#F1F5F9] dark:bg-[#0B0F17] text-[#64748B] dark:text-[#94A3B8]">
              {homeStandings ? `#${homeStandings.position} (${homeStandings.points} pts)` : '#--'}
            </span>
          </div>
        </div>

        {/* Away Team Row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-base font-bold text-[#0F172A] dark:text-[#F8FAFC] group-hover:text-[#0284C7] dark:group-hover:text-[#0EA5E9] transition-colors truncate">
              {match.away_team}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#F1F5F9] dark:bg-[#0B0F17] text-[#64748B] dark:text-[#94A3B8]">
              {awayStandings ? `#${awayStandings.position} (${awayStandings.points} pts)` : '#--'}
            </span>
          </div>
        </div>

        {/* Expected Formations Line */}
        <div className="flex items-center justify-between text-[11px] font-mono text-[#64748B] dark:text-[#94A3B8] pt-1">
          <span>
            Expected Formations: <strong className="text-slate-800 dark:text-slate-200">{homeFormation}</strong> vs <strong className="text-slate-800 dark:text-slate-200">{awayFormation}</strong>
          </span>
          <span className="text-[10px]">
            Proj xG: <strong className="text-[#059669] dark:text-[#10B981]">{projXgHome}</strong> - <strong className="text-[#0284C7] dark:text-[#0EA5E9]">{projXgAway}</strong>
          </span>
        </div>
      </div>

      {/* Win Probability Bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-[10px] font-mono text-[#64748B] dark:text-[#94A3B8]">
          <span>{match.home_team} {homeProb}%</span>
          <span>Draw {drawProb}%</span>
          <span>{match.away_team} {awayProb}%</span>
        </div>
        <div className="w-full h-1.5 rounded-full overflow-hidden flex bg-[#E2E8F0] dark:bg-[#0B0F17] gap-0.5">
          <div
            className="bg-[#059669] dark:bg-[#10B981] h-full transition-all duration-200"
            style={{ width: `${homeProb}%` }}
          />
          <div
            className="bg-[#94A3B8] dark:bg-[#475569] h-full transition-all duration-200"
            style={{ width: `${drawProb}%` }}
          />
          <div
            className="bg-[#0284C7] dark:bg-[#0EA5E9] h-full transition-all duration-200"
            style={{ width: `${awayProb}%` }}
          />
        </div>
      </div>

      {/* Footer Insight Pill & Access CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2.5 border-t border-[#E2E8F0] dark:border-[#1E293B]">
        <div className="inline-flex items-center gap-1.5 text-xs text-[#334155] dark:text-[#CBD5E1] truncate">
          <span className="material-symbols-outlined text-[15px] text-[#059669] dark:text-[#10B981] shrink-0">
            auto_awesome
          </span>
          <span className="truncate font-medium">{match.teaser_pill || 'AI Tactical Preview'}</span>
        </div>

        {accessMeta && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectMatch?.(match);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-xs shrink-0 ${accessMeta.ctaStyle}`}
          >
            <span>{accessMeta.ctaText}</span>
            <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
          </button>
        )}
      </div>
    </div>
  );
}
