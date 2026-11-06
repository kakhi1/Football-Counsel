import React from 'react';
import { useApp } from '../context/AppContext';
import ThemeSelector from './ThemeSelector';
import StatBallLogo from './StatBallLogo';

export default function TopAppBar() {
  const { quota, currentScreen, setCurrentScreen, viewMode, setViewMode, user } = useApp();

  return (
    <header className="sticky top-0 left-0 w-full z-50 h-14 flex justify-between items-center px-4 bg-white/95 dark:bg-[#0E1420]/95 backdrop-blur-md border-b border-[#E2E8F0] dark:border-[#1E293B] transition-colors duration-200">
      {/* Brand Title with Sphere Logo & Live Pulse */}
      <div 
        className="flex items-center gap-2.5 cursor-pointer select-none group"
        onClick={() => setCurrentScreen('matches')}
      >
        <StatBallLogo size={24} />
        <div className="flex items-center gap-1.5">
          <span className="text-base font-bold tracking-tight text-[#0F172A] dark:text-[#F8FAFC] group-hover:text-[#059669] dark:group-hover:text-[#10B981] transition-colors">
            Football Counsel
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#059669] dark:bg-[#10B981] animate-pulse"></span>
        </div>
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-2">
        {/* Free Quota Indicator */}
        <button
          onClick={() => setCurrentScreen('pro')}
          title="Upgrade to Pro for Unlimited Analyses"
          className="px-2 py-0.5 rounded-lg text-xs font-mono font-semibold bg-[#ECFDF5] dark:bg-[#10B981]/15 text-[#059669] dark:text-[#10B981] border border-[#A7F3D0] dark:border-[#10B981]/30 hover:border-[#059669] dark:hover:border-[#10B981] transition-all active:scale-95"
        >
          {quota.used}/{quota.total} Free
        </button>

        {/* Custom Theme Selector with spinning ball */}
        <ThemeSelector compact={true} />

        {/* View Frame Mode Toggle */}
        <button
          onClick={() => setViewMode(v => v === 'mobile' ? 'desktop' : 'mobile')}
          title={viewMode === 'mobile' ? 'Switch to Full Desktop View' : 'Switch to Mobile App Preview Shell'}
          className="w-7 h-7 hidden sm:flex items-center justify-center rounded bg-white dark:bg-[#131B2E] text-[#64748B] dark:text-[#94A3B8] hover:text-[#059669] dark:hover:text-[#10B981] transition-colors border border-[#E2E8F0] dark:border-[#1E293B] active:scale-95"
          type="button"
        >
          <span className="material-symbols-outlined text-[16px]">
            {viewMode === 'mobile' ? 'fullscreen' : 'smartphone'}
          </span>
        </button>

        {/* User Sign In / Profile Avatar */}
        <button
          onClick={() => setCurrentScreen('signin')}
          title={user.isAuthenticated ? user.name : 'Sign In'}
          className={`w-7 h-7 flex items-center justify-center rounded text-xs font-bold border transition-all active:scale-95 ${
            currentScreen === 'signin'
              ? 'bg-[#059669] dark:bg-[#10B981] text-white dark:text-[#0B0F17] border-[#059669] dark:border-[#10B981]'
              : 'bg-white dark:bg-[#131B2E] text-[#64748B] dark:text-[#94A3B8] border-[#E2E8F0] dark:border-[#1E293B] hover:text-[#059669] dark:hover:text-[#10B981]'
          }`}
        >
          {user.isAuthenticated ? (
            <span className="material-symbols-outlined text-[16px]">person</span>
          ) : (
            <span className="material-symbols-outlined text-[16px]">login</span>
          )}
        </button>
      </div>
    </header>
  );
}
