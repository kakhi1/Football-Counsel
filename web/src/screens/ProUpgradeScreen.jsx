import React, { useState } from 'react';
import { TELEGRAM_BOT_URL } from '../services/api';
import { useApp } from '../context/AppContext';

export default function ProUpgradeScreen() {
  const {
    user,
    setUser,
    pendingMatch,
    setPendingMatch,
    gateReason,
    setGateReason,
    unlockedMatchIds,
    setUnlockedMatchIds,
    setActiveMatch,
    setCurrentScreen
  } = useApp();

  const [isAnnual, setIsAnnual] = useState(true);

  const handleActivateDemoPro = () => {
    setUser({
      isAuthenticated: true,
      isPro: true,
      name: user.isAuthenticated ? user.name : 'Pro Tactician',
      email: user.email || 'pro@footballcounsel.com',
      tier: 'Pro Tactician'
    });
    setGateReason(null);

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

  const tiers = [
    {
      name: 'Scout Free',
      price: '$0',
      period: 'forever free (with account)',
      highlight: false,
      badge: user.isPro ? 'Starter Tier' : 'Current Plan',
      features: [
        '1st Match 100% Free (No Login)',
        '3 Daily Match Analyses after Sign-In',
        'Basic Text Insights',
        'Community Telegram Bot Trial'
      ],
      ctaText: user.isPro ? 'Included' : 'Back to Upcoming Matches',
      onClick: () => setCurrentScreen('matches'),
      ctaUrl: null
    },
    {
      name: 'Pro Tactician',
      price: isAnnual ? '$12' : '$19',
      period: 'per month, billed ' + (isAnnual ? 'annually' : 'monthly'),
      highlight: true,
      badge: 'Most Popular',
      features: [
        'Unlimited Match Analyses (4th+ Games)',
        'Unlimited Statistical Questions & Follow-ups',
        'Interactive Horizontal & Vertical Charts',
        'Direct Telegram Bot Priority Webhook',
        'Real-time Active Session Memory'
      ],
      ctaText: pendingMatch
        ? `Unlock ${pendingMatch.home_team} vs ${pendingMatch.away_team} (Pro Demo)`
        : 'Activate Pro Tactician (Demo)',
      onClick: handleActivateDemoPro,
      ctaUrl: TELEGRAM_BOT_URL
    },
    {
      name: 'Club Analytics',
      price: isAnnual ? '$69' : '$99',
      period: 'per month / staff',
      highlight: false,
      badge: 'For Sporting Directors',
      features: [
        'Multi-Analyst Seat Management',
        'Advanced Tactical Dossiers & Raw Telemetry',
        'Custom Team Tactical Profiling',
        'Dedicated 24/7 AI Support'
      ],
      ctaText: 'Contact Enterprise',
      onClick: null,
      ctaUrl: `${TELEGRAM_BOT_URL}?start=enterprise`
    }
  ];

  return (
    <div className="flex-1 w-full max-w-[1080px] mx-auto px-4 md:px-8 py-6 md:py-10 flex flex-col items-center overflow-y-auto custom-scroll pb-24 transition-colors duration-200">
      
      {/* Contextual Gate Banner when triggered by clicking a 4th+ match */}
      {gateReason === 'quota_exceeded' && (
        <div className="w-full max-w-2xl mb-5 bg-amber-500/10 border border-amber-500/40 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-amber-600 dark:text-amber-400 uppercase">
              <span className="material-symbols-outlined text-[16px]">workspace_premium</span>
              <span>Daily Free Quota Reached (3/3 Matches Analyzed)</span>
            </div>
            <p className="text-xs sm:text-sm text-[#0F172A] dark:text-[#F8FAFC]">
              You’ve used all 3 free daily match analyses. Upgrade to <strong>Pro Tactician</strong> to unlock{' '}
              <strong>{pendingMatch ? `${pendingMatch.home_team} vs ${pendingMatch.away_team}` : 'unlimited matches'}</strong>.
            </p>
          </div>
          <button
            onClick={handleActivateDemoPro}
            className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold whitespace-nowrap transition-all active:scale-95 shrink-0"
          >
            Unlock Match Now
          </button>
        </div>
      )}

      {/* Eyebrow Pill */}
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ECFDF5] dark:bg-[#10B981]/10 border border-[#A7F3D0] dark:border-[#10B981]/30 mb-3 animate-fade-in">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#059669] dark:bg-[#10B981] opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#059669] dark:bg-[#10B981]" />
        </span>
        <span className="font-mono text-xs tracking-wider uppercase text-[#059669] dark:text-[#10B981] font-semibold">
          Counsel Intelligence Engine
        </span>
      </div>

      {/* Main Title & Subtitle */}
      <h1 className="text-center font-bold tracking-tight text-[#0F172A] dark:text-[#F8FAFC] text-2xl sm:text-3xl md:text-4xl mb-2">
        Upgrade to Counsel AI Pro
      </h1>
      <p className="text-center text-[#64748B] dark:text-[#94A3B8] max-w-xl text-sm mb-6">
        Unlock unlimited daily match analyses (4th+ games), custom SQL chat queries, and visual chart generations.
      </p>

      {/* Billing Toggle Pill */}
      <div className="bg-[#F1F5F9] dark:bg-[#0E1420] border border-[#E2E8F0] dark:border-[#1E293B] p-1 rounded-xl flex items-center mb-8 shadow-xs">
        <button
          onClick={() => setIsAnnual(false)}
          className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            !isAnnual 
              ? 'bg-[#059669] dark:bg-[#10B981] text-white dark:text-[#0B0F17] font-semibold shadow-xs' 
              : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC]'
          }`}
        >
          Monthly
        </button>
        <button
          onClick={() => setIsAnnual(true)}
          className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
            isAnnual 
              ? 'bg-[#059669] dark:bg-[#10B981] text-white dark:text-[#0B0F17] font-semibold shadow-xs' 
              : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC]'
          }`}
        >
          <span>Annual</span>
          <span className="bg-emerald-950/20 text-emerald-900 dark:text-slate-950 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase">
            Save 35%
          </span>
        </button>
      </div>

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full">
        {tiers.map((tier, idx) => (
          <div
            key={idx}
            className={`rounded-2xl p-5 border flex flex-col justify-between transition-all duration-200 ${
              tier.highlight
                ? 'bg-white dark:bg-[#131B2E] border-2 border-[#059669] dark:border-[#10B981] shadow-lg md:-translate-y-2'
                : 'bg-white dark:bg-[#0E1420] border-[#E2E8F0] dark:border-[#1E293B] shadow-xs'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                  tier.highlight 
                    ? 'bg-[#ECFDF5] dark:bg-[#10B981] text-[#059669] dark:text-[#0B0F17]' 
                    : 'bg-[#F1F5F9] dark:bg-[#131B2E] text-[#64748B] dark:text-[#94A3B8]'
                }`}>
                  {tier.badge}
                </span>
                <h3 className="text-base font-bold text-[#0F172A] dark:text-[#F8FAFC]">{tier.name}</h3>
              </div>

              <div className="my-3">
                <span className="text-3xl font-bold text-[#0F172A] dark:text-[#F8FAFC] font-mono">{tier.price}</span>
                <span className="text-xs text-[#64748B] dark:text-[#94A3B8] ml-1 block mt-0.5">{tier.period}</span>
              </div>

              <ul className="space-y-2.5 my-5 text-xs text-[#334155] dark:text-[#CBD5E1]">
                {tier.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className={`material-symbols-outlined text-[16px] shrink-0 mt-0.5 ${
                      tier.highlight ? 'text-[#059669] dark:text-[#10B981]' : 'text-[#64748B]'
                    }`}>
                      check_circle
                    </span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-2">
              {tier.onClick && (
                <button
                  onClick={tier.onClick}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-transform active:scale-95 shadow-md ${
                    tier.highlight
                      ? 'bg-[#059669] hover:bg-[#047857] dark:bg-[#10B981] dark:hover:bg-[#059669] text-white dark:text-[#0B0F17]'
                      : 'bg-[#F1F5F9] hover:bg-[#E2E8F0] dark:bg-[#131B2E] dark:hover:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {tier.highlight ? 'bolt' : 'arrow_back'}
                  </span>
                  <span>{tier.ctaText}</span>
                </button>
              )}

              {tier.ctaUrl && (
                <a
                  href={tier.ctaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 bg-[#F1F5F9] hover:bg-[#E2E8F0] dark:bg-[#0B0F17] dark:hover:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#1E293B] text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] transition-colors"
                >
                  <span className="material-symbols-outlined text-[15px]">send</span>
                  <span>Subscribe via Telegram Bot</span>
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
