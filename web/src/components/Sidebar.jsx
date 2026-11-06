import React from 'react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import ThemeSelector from './ThemeSelector';
import StatBallLogo from './StatBallLogo';

export default function Sidebar() {
  const {
    currentScreen,
    setCurrentScreen,
    matches,
    quota,
    user,
    unlockedMatchIds,
    selectMatchForAnalysis
  } = useApp();
  const { isDark, toggleTheme } = useTheme();

  const quotaPct = user.isPro
    ? 100
    : Math.min(100, Math.round((quota.used / Math.max(1, quota.total)) * 100));

  return (
    <aside className="hidden md:flex flex-col shrink-0 h-screen bg-[#F1F5F9] dark:bg-[#0E1420] border-r border-[#E2E8F0] dark:border-[#1E293B] w-[72px] lg:w-[240px] transition-all duration-200 z-30 justify-between select-none sticky top-0">
      {/* Top Group */}
      <div className="flex flex-col p-3 lg:p-4 gap-4">
        {/* Brand Wordmark / Stat-Ball */}
        <div 
          onClick={() => setCurrentScreen('matches')}
          className="flex items-center gap-2.5 px-1 py-1 cursor-pointer group"
        >
          <StatBallLogo size={24} />
          <span className="hidden lg:inline-block text-[15px] font-semibold text-[#0F172A] dark:text-[#F8FAFC] tracking-tight whitespace-nowrap group-hover:text-[#059669] dark:group-hover:text-[#10B981] transition-colors">
            Football Counsel
          </span>
        </div>

        {/* Browse Upcoming Matches Button */}
        <button 
          onClick={() => setCurrentScreen('matches')}
          className="w-full bg-[#059669] hover:bg-[#047857] dark:bg-[#10B981] dark:hover:bg-[#059669] text-white dark:text-[#0B0F17] font-semibold py-2 px-2.5 rounded-lg text-sm flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-[0.98]"
        >
          <span className="material-symbols-outlined text-[18px]">calendar_month</span>
          <span className="hidden lg:inline whitespace-nowrap">Matchday Home</span>
        </button>

        {/* Navigation Tabs */}
        <nav className="flex flex-col gap-1">
          <span className="hidden lg:block text-[10px] uppercase font-mono tracking-wider text-[#64748B] dark:text-[#94A3B8]/80 px-2 mb-0.5">
            Match Flow
          </span>

          {/* Next Games Hub */}
          <button
            onClick={() => setCurrentScreen('matches')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
              currentScreen === 'matches'
                ? 'bg-[#ECFDF5] dark:bg-[#131B2E] text-[#059669] dark:text-[#10B981] border border-[#A7F3D0] dark:border-[#1E293B] font-semibold shadow-xs'
                : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] hover:bg-white/80 dark:hover:bg-[#131B2E]/60 font-normal'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className={`material-symbols-outlined text-[19px] ${
                currentScreen === 'matches' ? 'text-[#059669] dark:text-[#10B981]' : ''
              }`}>
                sports_soccer
              </span>
              <span className="hidden lg:inline whitespace-nowrap">1. Matchday Home</span>
            </div>
            <span className="hidden lg:inline-block text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#E2E8F0] dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC]">
              {matches.length}
            </span>
          </button>

          {/* AI Summary & Match Chat */}
          <button
            onClick={() => setCurrentScreen('match')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
              currentScreen === 'match'
                ? 'bg-[#ECFDF5] dark:bg-[#131B2E] text-[#059669] dark:text-[#10B981] border border-[#A7F3D0] dark:border-[#1E293B] font-semibold shadow-xs'
                : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] hover:bg-white/80 dark:hover:bg-[#131B2E]/60 font-normal'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className={`material-symbols-outlined text-[19px] ${
                currentScreen === 'match' ? 'text-[#059669] dark:text-[#10B981]' : ''
              }`}>
                auto_awesome
              </span>
              <span className="hidden lg:inline whitespace-nowrap">2. AI Summary & Chat</span>
            </div>
            {currentScreen === 'match' && (
              <span className="hidden lg:inline-block w-1.5 h-1.5 rounded-full bg-[#059669] dark:bg-[#10B981] shadow-[0_0_6px_rgba(16,185,129,0.5)]"></span>
            )}
          </button>

          {/* Ask Counsel AI */}
          <button
            onClick={() => setCurrentScreen('ask')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
              currentScreen === 'ask'
                ? 'bg-[#ECFDF5] dark:bg-[#131B2E] text-[#059669] dark:text-[#10B981] border border-[#A7F3D0] dark:border-[#1E293B] font-semibold shadow-xs'
                : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] hover:bg-white/80 dark:hover:bg-[#131B2E]/60 font-normal'
            }`}
          >
            <span className={`material-symbols-outlined text-[19px] ${
              currentScreen === 'ask' ? 'text-[#059669] dark:text-[#10B981]' : ''
            }`}>
              smart_toy
            </span>
            <span className="hidden lg:inline whitespace-nowrap">Ask Counsel AI</span>
          </button>
        </nav>

        {/* Active Session Memory Card (Desktop Only) */}
        <div className="hidden lg:flex flex-col bg-white dark:bg-[#131B2E] border border-[#E2E8F0] dark:border-[#1E293B] rounded-lg p-3 gap-2 shadow-xs transition-colors">
          <div className="flex items-center gap-1.5 text-xs font-medium text-[#0F172A] dark:text-[#F8FAFC]">
            <span className="w-2 h-2 rounded-full bg-[#0EA5E9] shadow-[0_0_6px_#0EA5E9]"></span>
            <span>Active Memory</span>
          </div>
          <div className="flex flex-col gap-1 text-[11px] font-mono text-[#64748B] dark:text-[#94A3B8]">
            <div className="truncate">• Tactical Intelligence Active</div>
            <div className="truncate">• 1,600+ Matches Indexed</div>
          </div>
        </div>

        {/* Quick Upcoming Fixtures List (Desktop Only) */}
        <div className="hidden lg:flex flex-col gap-1.5 pt-1">
          <span className="text-[11px] font-mono uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]/70 px-1">
            Featured Fixtures
          </span>
          <div className="flex flex-col gap-0.5">
            {matches.slice(0, 3).map((m) => {
              const isUnlocked = unlockedMatchIds.includes(m.id) || user.isPro;
              return (
                <button
                  key={m.id}
                  onClick={() => selectMatchForAnalysis(m)}
                  className="px-2.5 py-1.5 text-xs text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] hover:bg-white dark:hover:bg-[#131B2E] rounded-md truncate transition-colors flex items-center justify-between gap-2 text-left"
                >
                  <span className="truncate">{m.home_team} vs {m.away_team}</span>
                  <span className="material-symbols-outlined text-[13px] shrink-0 text-[#059669] dark:text-[#10B981]">
                    {isUnlocked ? 'check_circle' : !user.isAuthenticated && unlockedMatchIds.length >= 1 ? 'lock' : 'bolt'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Sidebar Footer */}
      <div className="p-3 lg:p-4 border-t border-[#E2E8F0] dark:border-[#1E293B] flex flex-col gap-2.5 transition-colors">
        {/* Quota Progress Indicator */}
        <div className="hidden lg:flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-[11px] font-mono">
            <span className="text-[#64748B] dark:text-[#94A3B8]">
              {user.isPro
                ? 'Pro Unlimited Runs'
                : !user.isAuthenticated
                ? `${quota.used} / 1 Free Guest Match`
                : `${quota.used} / ${quota.total} Free Daily Runs`}
            </span>
            <span className="text-[#059669] dark:text-[#10B981] font-semibold">
              {user.isPro ? '∞' : `${quotaPct}%`}
            </span>
          </div>
          <div className="w-full bg-[#E2E8F0] dark:bg-[#0B0F17] h-1.5 rounded-full overflow-hidden border border-[#CBD5E1] dark:border-[#1E293B]/70">
            <div
              className="bg-[#059669] dark:bg-[#10B981] h-full rounded-full transition-all duration-300"
              style={{ width: `${quotaPct}%` }}
            />
          </div>
        </div>

        {/* Sign In / Account Button */}
        <button
          onClick={() => setCurrentScreen('signin')}
          className="hidden lg:flex items-center justify-center gap-1.5 w-full bg-[#F8FAFC] dark:bg-[#0B0F17] hover:bg-white dark:hover:bg-[#131B2E] text-[#0F172A] dark:text-[#F8FAFC] border border-[#E2E8F0] dark:border-[#1E293B] text-xs font-medium py-1.5 rounded-lg transition-colors active:scale-95"
        >
          <span className="material-symbols-outlined text-[15px] text-[#0284C7] dark:text-[#0EA5E9]">
            {user.isAuthenticated ? 'verified_user' : 'login'}
          </span>
          <span className="truncate">
            {user.isAuthenticated ? user.name : 'Sign In (Unlock 3/Day)'}
          </span>
        </button>

        {/* Upgrade to Pro Button */}
        <button 
          onClick={() => setCurrentScreen('pro')}
          className="hidden lg:flex items-center justify-center gap-1.5 w-full bg-white dark:bg-[#131B2E] hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] border border-[#E2E8F0] dark:border-[#1E293B] text-xs font-medium py-2 rounded-lg transition-colors active:scale-95 shadow-xs"
        >
          <span className="material-symbols-outlined text-[16px] text-amber-500">workspace_premium</span>
          <span>{user.isPro ? 'Pro Active' : 'Upgrade to Pro'}</span>
        </button>

        {/* Theme Selector (Centered & Compact) */}
        <div className="flex items-center justify-center w-full py-0.5">
          <div className="hidden lg:flex items-center justify-center">
            <ThemeSelector />
          </div>
          {/* Tablet icon toggle (when sidebar is 72px) */}
          <button
            onClick={toggleTheme}
            title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
            className="lg:hidden w-8 h-8 rounded-full flex items-center justify-center bg-white dark:bg-[#131B2E] border border-[#E2E8F0] dark:border-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] active:scale-90 transition-transform"
          >
            <StatBallLogo size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
