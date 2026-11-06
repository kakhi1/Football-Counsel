import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { TELEGRAM_BOT_URL } from '../services/api';
import StatBallLogo from '../components/StatBallLogo';

export default function SignInScreen() {
  const {
    user,
    setUser,
    setCurrentScreen,
    pendingMatch,
    setPendingMatch,
    gateReason,
    setGateReason,
    unlockedMatchIds,
    setUnlockedMatchIds,
    setActiveMatch
  } = useApp();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);

  const completeSignIn = (userData) => {
    setUser(userData);
    setGateReason(null);

    // If user clicked a 2nd match before logging in, unlock it and open it right away!
    if (pendingMatch) {
      if (!unlockedMatchIds.includes(pendingMatch.id)) {
        setUnlockedMatchIds(prev => [...prev, pendingMatch.id]);
      }
      setActiveMatch(pendingMatch);
      setPendingMatch(null);
      setCurrentScreen('match');
    } else {
      setCurrentScreen('matches');
    }
  };

  const handleLogin = (e) => {
    e?.preventDefault();
    completeSignIn({
      isAuthenticated: true,
      isPro: false,
      name: email.split('@')[0] || 'Tactical Scout',
      email: email || 'scout@footballcounsel.com',
      tier: 'Free Scout (3/Day)'
    });
  };

  const handleDemoFreeLogin = () => {
    completeSignIn({
      isAuthenticated: true,
      isPro: false,
      name: 'Osasuna Scout',
      email: 'scout@osasuna.es',
      tier: 'Free Scout (3/Day)'
    });
  };

  const handleSignOut = () => {
    setUser({
      isAuthenticated: false,
      isPro: false,
      name: 'Guest Scout',
      email: '',
      tier: 'Guest (1 Free Match)'
    });
    setUnlockedMatchIds([]);
    setPendingMatch(null);
    setGateReason(null);
  };

  if (user.isAuthenticated) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 transition-colors duration-200">
        <div className="w-full max-w-md bg-white dark:bg-[#131B2E] border border-[#E2E8F0] dark:border-[#1E293B] rounded-2xl p-6 text-center space-y-4 shadow-xl">
          <div className="w-16 h-16 rounded-full bg-[#ECFDF5] dark:bg-[#10B981]/15 border-2 border-[#059669] dark:border-[#10B981] mx-auto flex items-center justify-center text-[#059669] dark:text-[#10B981] shadow-xs">
            <span className="material-symbols-outlined text-3xl">verified_user</span>
          </div>

          <div>
            <h2 className="text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC]">{user.name}</h2>
            <p className="text-xs font-mono text-[#64748B] dark:text-[#94A3B8]">{user.email}</p>
            <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full bg-[#ECFDF5] dark:bg-[#10B981]/20 text-[#059669] dark:text-[#10B981] border border-[#A7F3D0] dark:border-[#10B981]/40 text-xs font-mono font-bold">
              {user.tier} Active
            </span>
          </div>

          <div className="bg-[#F8FAFC] dark:bg-[#0B0F17] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl p-3.5 text-xs font-mono text-left space-y-2">
            <div className="flex justify-between">
              <span className="text-[#64748B] dark:text-[#94A3B8]">Analyst License:</span>
              <span className="font-bold text-[#0F172A] dark:text-[#F8FAFC]">FC-8366-STITCH</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#64748B] dark:text-[#94A3B8]">Daily Matches Unlocked:</span>
              <span className="font-bold text-[#059669] dark:text-[#10B981]">
                {user.isPro ? 'Unlimited' : `${unlockedMatchIds.length} / 3 Used`}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#64748B] dark:text-[#94A3B8]">Telegram Integration:</span>
              <span className="font-bold text-[#0284C7] dark:text-[#0EA5E9]">@Football_Counsel_bot</span>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <button
              onClick={() => setCurrentScreen('matches')}
              className="w-full py-2.5 rounded-xl bg-[#059669] hover:bg-[#047857] dark:bg-[#10B981] dark:hover:bg-[#059669] text-white dark:text-[#0B0F17] text-xs font-bold transition-all shadow-md active:scale-95"
            >
              Browse Upcoming Matches
            </button>
            {!user.isPro && (
              <button
                onClick={() => setCurrentScreen('pro')}
                className="w-full py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-600 dark:text-amber-400 text-xs font-semibold transition-all active:scale-95"
              >
                Upgrade to Pro (Unlimited Matches)
              </button>
            )}
            <button
              onClick={handleSignOut}
              className="w-full py-2 rounded-xl bg-[#F1F5F9] hover:bg-[#E2E8F0] dark:bg-[#0B0F17] dark:hover:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#1E293B] text-red-600 dark:text-red-400 text-xs font-semibold transition-all active:scale-95"
            >
              Sign Out & Reset Demo Quota
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center p-4 overflow-y-auto custom-scroll transition-colors duration-200">
      <div className="w-full max-w-md bg-white dark:bg-[#131B2E] border border-[#E2E8F0] dark:border-[#1E293B] rounded-2xl p-6 shadow-xl space-y-4">
        
        {/* Contextual Gate Banner when triggered by clicking a 2nd match */}
        {gateReason === 'guest_limit' && (
          <div className="bg-[#F0F9FF] dark:bg-[#0EA5E9]/10 border border-[#BAE6FD] dark:border-[#0EA5E9]/40 rounded-xl p-3.5 text-left space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#0284C7] dark:text-[#0EA5E9]">
              <span className="material-symbols-outlined text-[16px]">lock_open</span>
              <span>Free Guest Preview Used (1/1)</span>
            </div>
            <p className="text-xs text-[#334155] dark:text-[#CBD5E1] leading-relaxed">
              Sign in for free to immediately unlock{' '}
              <strong className="text-[#0F172A] dark:text-[#F8FAFC]">
                {pendingMatch ? `${pendingMatch.home_team} vs ${pendingMatch.away_team}` : 'your next match'}
              </strong>{' '}
              and get <strong>3 daily match analyses</strong> at $0.
            </p>
          </div>
        )}

        {/* Header */}
        <div className="text-center space-y-1">
          <div className="w-10 h-10 rounded-full mx-auto flex items-center justify-center mb-2">
            <StatBallLogo size={32} />
          </div>
          <h2 className="text-base font-bold text-[#0F172A] dark:text-[#F8FAFC]">
            Sign In to Unlock 3 Daily Matches
          </h2>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
            Create or sign in to a free account to analyze up to 3 matches per day.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-3 text-xs">
          <div>
            <label className="block text-[10px] font-mono font-bold text-[#64748B] dark:text-[#94A3B8] uppercase mb-1">
              Scout Email / Analyst ID
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="analyst@club.com"
              className="w-full bg-[#F8FAFC] dark:bg-[#0B0F17] border border-[#E2E8F0] dark:border-[#1E293B] rounded-lg px-3 py-2 text-[#0F172A] dark:text-[#F8FAFC] focus:border-[#059669] dark:focus:border-[#10B981] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-mono font-bold text-[#64748B] dark:text-[#94A3B8] uppercase mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full bg-[#F8FAFC] dark:bg-[#0B0F17] border border-[#E2E8F0] dark:border-[#1E293B] rounded-lg px-3 py-2 text-[#0F172A] dark:text-[#F8FAFC] focus:border-[#059669] dark:focus:border-[#10B981] focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-between text-[11px]">
            <label className="flex items-center gap-1.5 cursor-pointer text-[#64748B] dark:text-[#94A3B8]">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="rounded bg-[#F8FAFC] dark:bg-[#0B0F17] border-[#E2E8F0] dark:border-[#1E293B] text-[#059669] dark:text-[#10B981] focus:ring-0"
              />
              <span>Remember device</span>
            </label>
            <button
              type="button"
              onClick={() => setCurrentScreen('matches')}
              className="text-[#0284C7] dark:text-[#0EA5E9] hover:underline"
            >
              ← Back to Matches
            </button>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-[#059669] hover:bg-[#047857] dark:bg-[#10B981] dark:hover:bg-[#059669] text-white dark:text-[#0B0F17] font-bold text-xs transition-transform active:scale-95 shadow-md"
          >
            {pendingMatch
              ? `Sign In & Analyze ${pendingMatch.home_team} vs ${pendingMatch.away_team}`
              : 'Sign In (Unlock 3/Day Free)'}
          </button>
        </form>

        {/* Quick Demo Login */}
        <div className="pt-2 border-t border-[#E2E8F0] dark:border-[#1E293B] space-y-2">
          <button
            onClick={handleDemoFreeLogin}
            className="w-full py-2 rounded-xl bg-[#ECFDF5] hover:bg-[#D1FAE5] dark:bg-[#0B0F17] dark:hover:bg-[#1E293B] border border-[#A7F3D0] dark:border-[#10B981]/40 text-[#059669] dark:text-[#10B981] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors active:scale-95"
          >
            <span className="material-symbols-outlined text-[16px]">play_arrow</span>
            <span>
              {pendingMatch
                ? `Instant Demo Sign-In & Open ${pendingMatch.home_team}`
                : 'Instant Demo Sign-In (Free 3/Day)'}
            </span>
          </button>

          <a
            href={TELEGRAM_BOT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2 rounded-xl bg-[#F1F5F9] hover:bg-[#E2E8F0] dark:bg-[#0B0F17] dark:hover:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#1E293B] text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] text-xs font-medium flex items-center justify-center gap-1.5 transition-colors active:scale-95"
          >
            <span className="material-symbols-outlined text-[16px] text-[#0284C7] dark:text-[#0EA5E9]">send</span>
            <span>Sign In via @Football_Counsel_bot</span>
          </a>
        </div>
      </div>
    </div>
  );
}
