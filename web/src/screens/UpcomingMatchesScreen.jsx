import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { fetchMatches, syncUpcomingFixtures } from '../services/api';
import MarqueeHeroCard from '../components/MarqueeHeroCard';
import MinimalFixtureCard from '../components/MinimalFixtureCard';

export default function UpcomingMatchesScreen() {
  const {
    matches,
    setMatches,
    curatedData,
    setCuratedData,
    loadingMatches,
    dbStats,
    user,
    unlockedMatchIds,
    selectMatchForAnalysis
  } = useApp();

  const [feedMode, setFeedMode] = useState('curated'); // 'curated' | 'all'
  const [selectedLeague, setSelectedLeague] = useState('All');
  const [curatedTab, setCuratedTab] = useState('All Marquee'); // 'All Marquee' | 'Midweek' | 'Weekend'
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await syncUpcomingFixtures();
      const res = await fetchMatches();
      if (res && res.data) {
        const raw = res.data;
        const allList = Array.isArray(raw) ? raw : (raw.all_fixtures || []);
        const curated = Array.isArray(raw)
          ? { hero_match: raw[0] || null, midweek: [], weekend: [], all_fixtures: raw }
          : raw;
        setMatches(allList);
        setCuratedData(curated);
      }
    } catch (err) {
      console.error('Refresh error:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const leagues = [
    'All',
    'Premier League',
    'LaLiga',
    'Serie A',
    'Bundesliga',
    'Ligue 1',
    'Champions League',
    'Europa League'
  ];

  const filterByLeague = (list = []) => {
    if (selectedLeague === 'All') return list;
    return list.filter(m =>
      (m.competition || '').toLowerCase().replace(/\s+/g, '') ===
      selectedLeague.toLowerCase().replace(/\s+/g, '')
    );
  };

  const getMatchAccessMeta = (match) => {
    const isUnlocked = unlockedMatchIds.includes(match.id);

    if (isUnlocked) {
      return {
        state: 'unlocked',
        badgeText: 'Unlocked • Ready',
        badgeStyle:
          'bg-[#ECFDF5] dark:bg-[#10B981]/15 text-[#059669] dark:text-[#10B981] border-[#A7F3D0] dark:border-[#10B981]/30',
        icon: 'check_circle',
        ctaText: 'Open AI Summary & Chat',
        ctaStyle:
          'bg-[#059669] hover:bg-[#047857] dark:bg-[#10B981] dark:hover:bg-[#059669] text-white dark:text-[#0B0F17]'
      };
    }

    if (user.isPro) {
      return {
        state: 'pro',
        badgeText: 'Pro Unlimited',
        badgeStyle:
          'bg-[#ECFDF5] dark:bg-[#10B981]/15 text-[#059669] dark:text-[#10B981] border-[#A7F3D0] dark:border-[#10B981]/30',
        icon: 'workspace_premium',
        ctaText: 'AI Summary & Chat',
        ctaStyle:
          'bg-[#059669] hover:bg-[#047857] dark:bg-[#10B981] dark:hover:bg-[#059669] text-white dark:text-[#0B0F17]'
      };
    }

    if (!user.isAuthenticated) {
      if (unlockedMatchIds.length < 1) {
        return {
          state: 'free_first',
          badgeText: '1st Game Free • No Login',
          badgeStyle:
            'bg-[#ECFDF5] dark:bg-[#10B981]/15 text-[#059669] dark:text-[#10B981] border-[#A7F3D0] dark:border-[#10B981]/30',
          icon: 'bolt',
          ctaText: 'AI Summary & Chat (Free)',
          ctaStyle:
            'bg-[#059669] hover:bg-[#047857] dark:bg-[#10B981] dark:hover:bg-[#059669] text-white dark:text-[#0B0F17]'
        };
      }
      return {
        state: 'signin_gate',
        badgeText: 'Sign In to Unlock (Free)',
        badgeStyle:
          'bg-[#F0F9FF] dark:bg-[#0EA5E9]/15 text-[#0284C7] dark:text-[#0EA5E9] border-[#BAE6FD] dark:border-[#0EA5E9]/30',
        icon: 'lock',
        ctaText: 'Sign In for AI Summary & Chat',
        ctaStyle:
          'bg-[#0284C7] hover:bg-[#0369A1] dark:bg-[#0EA5E9] dark:hover:bg-[#0284C7] text-white dark:text-[#0B0F17]'
      };
    }

    if (unlockedMatchIds.length < 3) {
      const remaining = 3 - unlockedMatchIds.length;
      return {
        state: 'member_free',
        badgeText: `${remaining} Free Daily ${remaining === 1 ? 'Game' : 'Games'} Left`,
        badgeStyle:
          'bg-[#ECFDF5] dark:bg-[#10B981]/15 text-[#059669] dark:text-[#10B981] border-[#A7F3D0] dark:border-[#10B981]/30',
        icon: 'analytics',
        ctaText: `AI Summary & Chat (${unlockedMatchIds.length + 1}/3 Free)`,
        ctaStyle:
          'bg-[#059669] hover:bg-[#047857] dark:bg-[#10B981] dark:hover:bg-[#059669] text-white dark:text-[#0B0F17]'
      };
    }

    return {
      state: 'pro_gate',
      badgeText: 'Daily Quota Reached (3/3)',
      badgeStyle:
        'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
      icon: 'workspace_premium',
      ctaText: 'Upgrade to Pro to Analyze',
      ctaStyle:
        'bg-amber-500 hover:bg-amber-600 text-slate-950'
    };
  };

  // Derive Hero match
  const rawHero = curatedData?.hero_match || (matches.length > 0 ? matches[0] : null);
  const heroMatchesLeague = rawHero && (selectedLeague === 'All' ||
    (rawHero.competition || '').toLowerCase().replace(/\s+/g, '') ===
    selectedLeague.toLowerCase().replace(/\s+/g, ''));
  const heroMatch = heroMatchesLeague ? rawHero : null;

  // Derive Midweek and Weekend fixtures
  const rawMidweek = curatedData?.midweek || matches.filter(m => {
    try {
      const clean = (m.match_time || '').split('T')[0].split(' ')[0];
      const d = new Date(clean);
      const day = d.getUTCDay();
      return day === 2 || day === 3 || day === 4;
    } catch {
      return false;
    }
  });

  const rawWeekend = curatedData?.weekend || matches.filter(m => {
    try {
      const clean = (m.match_time || '').split('T')[0].split(' ')[0];
      const d = new Date(clean);
      const day = d.getUTCDay();
      return day !== 2 && day !== 3 && day !== 4;
    } catch {
      return true;
    }
  });

  // Filter and deduplicate against hero match
  const midweekFixtures = filterByLeague(rawMidweek).filter(m => m.id !== heroMatch?.id);
  const weekendFixtures = filterByLeague(rawWeekend).filter(m => m.id !== heroMatch?.id);
  const allFilteredFixtures = filterByLeague(matches);

  const showMidweek = curatedTab === 'All Marquee' || curatedTab === 'Midweek';
  const showWeekend = curatedTab === 'All Marquee' || curatedTab === 'Weekend';

  return (
    <div className="flex-1 flex flex-col items-center pt-3 pb-24 md:py-6 px-3 sm:px-6 lg:px-8 max-w-[1040px] mx-auto w-full overflow-y-auto custom-scroll transition-colors duration-200">
      
      {/* 1. Top Header & Matchday Intelligence Banner */}
      <section className="w-full bg-white dark:bg-[#131B2E] border border-[#E2E8F0] dark:border-[#1E293B] rounded-2xl p-4 sm:p-5 shadow-xs mb-4 transition-colors">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-[#ECFDF5] dark:bg-[#10B981]/10 border border-[#A7F3D0] dark:border-[#10B981]/30 text-[#059669] dark:text-[#10B981] text-[11px] font-mono font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#059669] dark:bg-[#10B981] animate-pulse" />
              <span>
                MATCHDAY HOME • POWERED BY {dbStats.metrics?.matches || '1,636'} HISTORICAL MATCHES
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] tracking-tight">
              Curated Matchday Intelligence
            </h1>
            <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8]">
              100% live upcoming fixtures for the next 2 weeks across Europe's top 5 leagues, UCL & UEL — complete with live standings, expected formations, and AI tactical models.
            </p>
          </div>

          {/* Access Funnel Badge + Free API Sync Button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 bg-[#F8FAFC] dark:bg-[#0B0F17] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl p-3 shrink-0">
            <div className="flex flex-col gap-1 pr-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                <span className="material-symbols-outlined text-[16px] text-[#059669] dark:text-[#10B981]">
                  {user.isPro ? 'workspace_premium' : user.isAuthenticated ? 'verified_user' : 'person_outline'}
                </span>
                <span>
                  {user.isPro
                    ? 'Pro Tactician (Unlimited)'
                    : user.isAuthenticated
                    ? `${user.name} • ${Math.max(0, 3 - unlockedMatchIds.length)}/3 Free Left`
                    : unlockedMatchIds.length === 0
                    ? 'Guest Pass: 1st Match Free'
                    : 'Guest Pass Used (1/1)'}
                </span>
              </div>
              <span className="text-[11px] font-mono text-[#64748B] dark:text-[#94A3B8]">
                {user.isPro
                  ? 'All upcoming matches & AI chat unlocked'
                  : user.isAuthenticated
                  ? '3 daily matches included • 4th+ requires Pro'
                  : unlockedMatchIds.length === 0
                  ? 'Click any upcoming game for AI Summary & Chat'
                  : 'Sign in for free to unlock 2 more matches today'}
              </span>
            </div>

            <button
              onClick={handleRefresh}
              disabled={refreshing}
              title="Sync upcoming fixtures from Free API"
              className="px-2.5 py-2 rounded-lg bg-white dark:bg-[#131B2E] border border-[#E2E8F0] dark:border-[#1E293B] text-[#64748B] dark:text-[#94A3B8] hover:text-[#059669] dark:hover:text-[#10B981] transition-colors self-center flex items-center gap-1.5 text-xs font-mono"
            >
              <span className={`material-symbols-outlined text-[17px] ${refreshing ? 'animate-spin' : ''}`}>
                sync
              </span>
              <span className="hidden sm:inline">{refreshing ? 'Syncing...' : 'Sync API'}</span>
            </button>
          </div>
        </div>

        {/* 3-Step User Flow Indicator */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4 pt-3.5 border-t border-[#E2E8F0] dark:border-[#1E293B]">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border text-xs bg-[#ECFDF5] dark:bg-[#10B981]/10 border-[#A7F3D0] dark:border-[#10B981]/40 text-[#059669] dark:text-[#10B981] font-semibold">
            <span className="w-5 h-5 rounded-full bg-[#059669] dark:bg-[#10B981] text-white dark:text-[#0B0F17] font-mono text-[11px] font-bold flex items-center justify-center shrink-0">
              1
            </span>
            <span><strong>Pick an Upcoming Game</strong> from curated schedule</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border text-xs bg-[#F8FAFC] dark:bg-[#0E1420] border-[#E2E8F0] dark:border-[#1E293B] text-[#64748B] dark:text-[#94A3B8]">
            <span className="w-5 h-5 rounded-full bg-[#0284C7] dark:bg-[#0EA5E9] text-white dark:text-[#0B0F17] font-mono text-[11px] font-bold flex items-center justify-center shrink-0">
              2
            </span>
            <span><strong>Read AI Tactical Summary</strong> & Win Probabilities</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border text-xs bg-[#F8FAFC] dark:bg-[#0E1420] border-[#E2E8F0] dark:border-[#1E293B] text-[#64748B] dark:text-[#94A3B8]">
            <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-mono text-[11px] font-bold flex items-center justify-center shrink-0">
              3
            </span>
            <span><strong>Chat & Ask Counsel AI</strong> about the clash</span>
          </div>
        </div>
      </section>

      {/* 2. View Toggle & Tab Filter Bar */}
      <div className="w-full space-y-2.5 mb-4">
        
        {/* Feed Mode Toggle & Chronological Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          {/* Feed View Switcher */}
          <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-[#131B2E] border border-slate-200 dark:border-[#1E293B] text-xs font-mono">
            <button
              onClick={() => setFeedMode('curated')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                feedMode === 'curated'
                  ? 'bg-white dark:bg-[#0B0F17] text-[#059669] dark:text-[#10B981] font-bold shadow-xs'
                  : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC]'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
              <span>Curated Matchday Feed</span>
            </button>
            <button
              onClick={() => setFeedMode('all')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                feedMode === 'all'
                  ? 'bg-white dark:bg-[#0B0F17] text-[#059669] dark:text-[#10B981] font-bold shadow-xs'
                  : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC]'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">view_agenda</span>
              <span>All Fixtures ({matches.length})</span>
            </button>
          </div>

          {/* Curated Chronological Filter Tabs (Midweek / Weekend) */}
          {feedMode === 'curated' && (
            <div className="inline-flex items-center gap-1.5 text-xs font-mono">
              {['All Marquee', 'Midweek', 'Weekend'].map((tab) => {
                const active = curatedTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => setCuratedTab(tab)}
                    className={`px-3 py-1.5 rounded-lg border transition-all ${
                      active
                        ? 'bg-[#059669] dark:bg-[#10B981] text-white dark:text-[#0B0F17] border-transparent font-semibold shadow-xs'
                        : 'bg-white dark:bg-[#131B2E] text-[#64748B] dark:text-[#94A3B8] border-[#E2E8F0] dark:border-[#1E293B] hover:text-[#0F172A] dark:hover:text-[#F8FAFC]'
                    }`}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Competition Filter Pills */}
        <div className="w-full flex items-center justify-between gap-2 overflow-x-auto custom-scroll pb-1">
          <div className="flex items-center gap-1.5">
            {leagues.map((league) => {
              const active = selectedLeague === league;
              return (
                <button
                  key={league}
                  onClick={() => setSelectedLeague(league)}
                  className={`px-3 py-1 rounded-full text-xs font-mono transition-all whitespace-nowrap ${
                    active
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-semibold shadow-xs'
                      : 'bg-white dark:bg-[#131B2E] text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] border border-[#E2E8F0] dark:border-[#1E293B]'
                  }`}
                >
                  {league}
                </button>
              );
            })}
          </div>

          <span className="hidden sm:inline-block text-xs font-mono text-[#64748B] dark:text-[#94A3B8] shrink-0">
            {feedMode === 'curated'
              ? `${(heroMatch ? 1 : 0) + midweekFixtures.length + weekendFixtures.length} curated games`
              : `${allFilteredFixtures.length} upcoming games`}
          </span>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loadingMatches && matches.length === 0 && (
        <div className="w-full space-y-4 animate-pulse">
          <div className="bg-white dark:bg-[#131B2E] border border-[#E2E8F0] dark:border-[#1E293B] rounded-2xl p-6 h-56 flex flex-col justify-between" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {[1, 2, 3, 4].map(n => (
              <div key={n} className="bg-white dark:bg-[#131B2E] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl p-5 h-44 flex flex-col justify-between" />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loadingMatches && matches.length === 0 && (
        <div className="w-full bg-white dark:bg-[#131B2E] border border-[#E2E8F0] dark:border-[#1E293B] rounded-2xl p-8 text-center space-y-3">
          <span className="material-symbols-outlined text-4xl text-[#64748B] dark:text-[#94A3B8]">
            sports_soccer
          </span>
          <h3 className="text-base font-bold text-[#0F172A] dark:text-[#F8FAFC]">
            Connecting to Upcoming Fixtures Feed...
          </h3>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8] max-w-md mx-auto">
            Synchronizing upcoming games and historical statistical models. Please ensure `python api.py` is running.
          </p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 rounded-xl bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold transition-all active:scale-95"
          >
            Sync Upcoming Fixtures
          </button>
        </div>
      )}

      {/* 3. Curated Matchday Feed View */}
      {feedMode === 'curated' && !loadingMatches && (
        <div className="w-full space-y-6">
          
          {/* Hero Spotlight Marquee Fixture */}
          {heroMatch && (
            <section className="w-full space-y-2">
              <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8] px-1">
                <span className="flex items-center gap-1.5 font-bold text-[#059669] dark:text-[#10B981]">
                  <span className="material-symbols-outlined text-[16px]">stars</span>
                  <span>Featured Match of the Week</span>
                </span>
                <span>Max Impact Clashes</span>
              </div>
              <MarqueeHeroCard
                match={heroMatch}
                onSelectMatch={selectMatchForAnalysis}
              />
            </section>
          )}

          {/* Midweek Magic Section (Tue - Thu) */}
          {showMidweek && midweekFixtures.length > 0 && (
            <section className="w-full space-y-3">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#1E293B] pb-2 px-1">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-[#0284C7] dark:text-[#0EA5E9]">
                    event_upcoming
                  </span>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[#0F172A] dark:text-[#F8FAFC]">
                    Midweek Magic (Tue – Thu)
                  </h3>
                </div>
                <span className="text-xs font-mono text-[#64748B] dark:text-[#94A3B8]">
                  {midweekFixtures.length} matches
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {midweekFixtures.map((match) => (
                  <MinimalFixtureCard
                    key={match.id}
                    match={match}
                    accessMeta={getMatchAccessMeta(match)}
                    onSelectMatch={selectMatchForAnalysis}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Weekend Showdowns Section (Fri - Mon) */}
          {showWeekend && weekendFixtures.length > 0 && (
            <section className="w-full space-y-3">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#1E293B] pb-2 px-1">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-[#059669] dark:text-[#10B981]">
                    sports_soccer
                  </span>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[#0F172A] dark:text-[#F8FAFC]">
                    Weekend Showdowns (Fri – Sun)
                  </h3>
                </div>
                <span className="text-xs font-mono text-[#64748B] dark:text-[#94A3B8]">
                  {weekendFixtures.length} matches
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {weekendFixtures.map((match) => (
                  <MinimalFixtureCard
                    key={match.id}
                    match={match}
                    accessMeta={getMatchAccessMeta(match)}
                    onSelectMatch={selectMatchForAnalysis}
                  />
                ))}
              </div>
            </section>
          )}

          {/* No matches for active filters */}
          {!heroMatch && midweekFixtures.length === 0 && weekendFixtures.length === 0 && matches.length > 0 && (
            <div className="w-full p-8 text-center text-xs font-mono text-[#64748B] dark:text-[#94A3B8] bg-white dark:bg-[#131B2E] rounded-xl border border-[#E2E8F0] dark:border-[#1E293B]">
              No curated fixtures found for {selectedLeague} under {curatedTab}. Try switching tabs or selecting 'All' leagues.
            </div>
          )}
        </div>
      )}

      {/* 4. All Fixtures View Mode */}
      {feedMode === 'all' && !loadingMatches && (
        <section className="w-full grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {allFilteredFixtures.map((match) => (
            <MinimalFixtureCard
              key={match.id}
              match={match}
              accessMeta={getMatchAccessMeta(match)}
              onSelectMatch={selectMatchForAnalysis}
            />
          ))}
          {allFilteredFixtures.length === 0 && matches.length > 0 && (
            <div className="col-span-full p-8 text-center text-xs font-mono text-[#64748B] dark:text-[#94A3B8] bg-white dark:bg-[#131B2E] rounded-xl border border-[#E2E8F0] dark:border-[#1E293B]">
              No upcoming fixtures found for {selectedLeague}.
            </div>
          )}
        </section>
      )}

    </div>
  );
}
