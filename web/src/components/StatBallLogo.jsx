import React from 'react';
import { useTheme } from '../context/ThemeContext';

export default function StatBallLogo({ 
  size = 24, 
  className = '', 
  spinning = true, 
  alt = 'Football Counsel Logo' 
}) {
  const { isDark } = useTheme();

  // Dynamic vector icon matching the active theme
  const iconSrc = isDark ? '/football_ball_dark.svg' : '/football_ball_light.svg';
  const animClass = spinning ? (isDark ? 'ball-animate-dark' : 'ball-animate-light') : '';

  const sizeClass = size === 32 
    ? 'w-8 h-8' 
    : size === 40 
    ? 'w-10 h-10' 
    : size === 16 
    ? 'w-4 h-4' 
    : size === 14 
    ? 'w-3.5 h-3.5'
    : 'w-6 h-6';

  return (
    <div className={`relative flex items-center justify-center shrink-0 ${sizeClass} ${className}`}>
      <img
        alt={alt}
        src={iconSrc}
        className={`w-full h-full rounded-full object-cover shrink-0 select-none ${animClass}`}
        onError={(e) => {
          // Fallback to static root svg if needed
          if (e.currentTarget.src !== '/football_ball.svg') {
            e.currentTarget.src = '/football_ball.svg';
          }
        }}
      />
    </div>
  );
}
