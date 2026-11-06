import React from 'react';
import { useApp } from '../context/AppContext';

export default function BottomNavBar() {
  const { currentScreen, setCurrentScreen } = useApp();

  const navItems = [
    {
      id: 'matches',
      label: 'Matchday Home',
      icon: 'sports_soccer'
    },
    {
      id: 'match',
      label: 'AI & Chat',
      icon: 'auto_awesome'
    },
    {
      id: 'ask',
      label: 'Ask AI',
      icon: 'smart_toy'
    },
    {
      id: 'pro',
      label: 'Pro',
      icon: 'workspace_premium'
    },
    {
      id: 'signin',
      label: 'Portal',
      icon: 'person'
    }
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-2 h-14 bg-white/95 dark:bg-[#0E1420] border-t border-[#E2E8F0] dark:border-[#1E293B] shadow-2xl backdrop-blur-md transition-colors duration-200">
      {navItems.map((item) => {
        const isActive = currentScreen === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setCurrentScreen(item.id)}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-all duration-150 active:scale-95 relative ${
              isActive
                ? 'text-[#059669] dark:text-[#10B981] font-semibold'
                : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC]'
            }`}
          >
            <div className="relative">
              <span
                className={`material-symbols-outlined text-[20px] transition-transform ${
                  isActive ? 'fill-1 scale-110 text-[#059669] dark:text-[#10B981]' : ''
                }`}
              >
                {item.icon}
              </span>
              {isActive && (
                <span className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-[#059669] dark:bg-[#10B981] rounded-full shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
              )}
            </div>
            <span
              className={`text-[10px] mt-0.5 tracking-tight ${
                isActive ? 'text-[#059669] dark:text-[#10B981] font-bold' : 'text-[#64748B] dark:text-[#94A3B8]'
              }`}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
