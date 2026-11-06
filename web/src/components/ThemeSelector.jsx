import React from 'react';
import { useTheme } from '../context/ThemeContext';

export default function ThemeSelector({ className = '', compact = false }) {
  const { isDark, toggleTheme, setTheme } = useTheme();

  const handleSelect = (mode, e) => {
    e?.stopPropagation();
    if (setTheme) {
      setTheme(mode);
    } else {
      if ((mode === 'dark' && !isDark) || (mode === 'light' && isDark)) {
        toggleTheme();
      }
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label="Theme selector"
      onClick={toggleTheme}
      className={`inline-flex items-center select-none cursor-pointer rounded-full p-0.5 transition-all duration-200 shadow-xs shrink-0 ${
        isDark 
          ? 'bg-[#131B2E] border border-[#1E293B]' 
          : 'bg-[#F1F5F9] border border-[#CBD5E1]'
      } ${className}`}
    >
      {/* Light mode option with Stitch Light Ball & Light Organic Spin */}
      <button
        type="button"
        role="radio"
        aria-checked={!isDark}
        onClick={(e) => handleSelect('light', e)}
        className={`flex items-center gap-1.5 rounded-full transition-all duration-150 select-none ${
          compact ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]'
        } ${
          !isDark
            ? 'bg-[#059669] text-white font-semibold shadow-xs'
            : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC]'
        }`}
      >
        {!isDark && (
          <img
            alt="FC Light Logo"
            className="w-3.5 h-3.5 rounded-full object-cover shrink-0 ball-animate-light"
            src="/football_ball_light.svg"
            onError={(e) => { e.currentTarget.src = '/football_ball.svg'; }}
          />
        )}
        <span>Light</span>
      </button>

      {/* Dark mode option with Stitch Dark Ball & Dark Organic Spin */}
      <button
        type="button"
        role="radio"
        aria-checked={isDark}
        onClick={(e) => handleSelect('dark', e)}
        className={`flex items-center gap-1.5 rounded-full transition-all duration-150 select-none ${
          compact ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]'
        } ${
          isDark
            ? 'bg-[#10B981] text-white font-semibold shadow-xs'
            : 'text-[#64748B] hover:text-[#0F172A]'
        }`}
      >
        {isDark && (
          <img
            alt="FC Dark Logo"
            className="w-3.5 h-3.5 rounded-full object-cover shrink-0 ball-animate-dark"
            src="/football_ball_dark.svg"
            onError={(e) => { e.currentTarget.src = '/football_ball.svg'; }}
          />
        )}
        <span>Dark</span>
      </button>
    </div>
  );
}
