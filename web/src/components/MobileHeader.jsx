import React from 'react';
import { useApp } from '../context/AppContext';
import ThemeSelector from './ThemeSelector';
import StatBallLogo from './StatBallLogo';

export default function MobileHeader() {
  const { currentScreen, setCurrentScreen, quota, user } = useApp();

  return (
    <>
      {/* Mobile Top Header (Under md:hidden) */}
      <header className="md:hidden sticky top-0 z-40 h-12 w-full bg-white/95 dark:bg-[#0E1420] border-b border-[#E2E8F0] dark:border-[#1E293B] backdrop-blur-md px-3.5 flex items-center justify-between transition-colors duration-200">
        {/* Brand */}
        <div 
          onClick={() => setCurrentScreen('matches')}
          className="flex items-center gap-2 cursor-pointer select-none"
        >
          <StatBallLogo size={24} />
          <span className="text-[15px] font-semibold text-[#0F172A] dark:text-[#F8FAFC] whitespace-nowrap tracking-tight">
            Football Counsel
          </span>
        </div>

        {/* Trailing Controls */}
        <div className="flex items-center gap-2">
          {/* Custom Theme Selector with spinning ball icon */}
          <ThemeSelector compact={true} />

          {/* Free Pill Badge */}
          <button 
            onClick={() => setCurrentScreen(!user.isAuthenticated ? 'signin' : 'pro')}
            className="bg-[#ECFDF5] dark:bg-[#10B981]/15 border border-[#A7F3D0] dark:border-[#10B981]/30 text-[#059669] dark:text-[#10B981] font-mono text-[11px] px-2 py-0.5 rounded-full font-medium active:scale-95 transition-colors"
          >
            {user.isPro ? 'Pro ∞' : `${quota.used}/${quota.total} Free`}
          </button>
        </div>
      </header>

      {/* Mobile Sub-Navigation Bar */}
      <div className="md:hidden sticky top-12 left-0 w-full z-30 bg-[#F1F5F9] dark:bg-[#0E1420] border-b border-[#E2E8F0] dark:border-[#1E293B] px-3.5 py-1.5 flex items-center justify-between transition-colors duration-200">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#059669] dark:bg-[#10B981] shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
          <span className="text-xs font-semibold text-[#059669] dark:text-[#10B981] tracking-tight">
            {currentScreen === 'matches'
              ? 'Next Games'
              : currentScreen === 'ask'
              ? 'Ask Counsel AI'
              : currentScreen === 'match'
              ? 'AI Summary & Match Chat'
              : currentScreen === 'pro'
              ? 'Counsel AI Pro'
              : 'Scout Portal'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentScreen(currentScreen === 'matches' ? 'ask' : 'matches')}
            className="text-[10px] font-mono px-2 py-0.5 rounded bg-white dark:bg-[#131B2E] text-[#64748B] dark:text-[#94A3B8] border border-[#E2E8F0] dark:border-[#1E293B] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] transition-colors"
          >
            {currentScreen === 'matches' ? 'Ask Counsel AI' : 'All Matches'}
          </button>
        </div>
      </div>
    </>
  );
}
