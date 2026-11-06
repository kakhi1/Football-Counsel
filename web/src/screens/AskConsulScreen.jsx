import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { sendAgentQuery } from '../services/api';
import StatBallLogo from '../components/StatBallLogo';

export default function AskConsulScreen() {
  const { setCurrentScreen, activeMatch, dbStats } = useApp();
  const [showReasoning, setShowReasoning] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isQuerying, setIsQuerying] = useState(false);

  const [chatHistory, setChatHistory] = useState([
    {
      id: 'welcome',
      query: 'Football Counsel Tactical Intelligence Engine',
      sql: 'SELECT COUNT(*) FROM match_stats;',
      reasoning: `Tactical engine initialized and calibrated across European competitions.`,
      narrative: 'Welcome to Counsel AI! Ask any question about team stats, corner trends, fouls, or expected goals:',
      detail: `Accessing ${dbStats.metrics?.matches || 1600}+ indexed fixtures and ${dbStats.metrics?.players || 5000}+ player profiles across top European leagues.`,
      metric_label: 'Coverage Status',
      chartData: [
        { team: 'Premier League', value: 380, percent: 90, color: 'emerald' },
        { team: 'LaLiga', value: 380, percent: 90, color: 'cyan' },
        { team: 'Serie A', value: 380, percent: 90, color: 'emerald' },
        { team: 'Bundesliga', value: 306, percent: 75, color: 'cyan' },
        { team: 'Champions League', value: 125, percent: 35, color: 'emerald' },
      ],
      followUps: [
        'When Osasuna plays at home, show average corners',
        'Show Real Madrid last 5 matches xG',
        'Which teams have high foul averages?'
      ]
    }
  ]);

  const handleSend = async (text) => {
    const q = text || inputValue;
    if (!q.trim() || isQuerying) return;

    const matchName = activeMatch ? `${activeMatch.home_team} vs ${activeMatch.away_team}` : '';
    setInputValue('');
    setIsQuerying(true);

    try {
      const response = await sendAgentQuery(q, matchName);
      if (response) {
        setChatHistory(prev => [...prev, response]);
      }
    } catch (e) {
      console.error('Chat query error:', e);
    } finally {
      setIsQuerying(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#FAF8FF] dark:bg-[#0B0F17] overflow-y-auto custom-scroll px-3 md:px-8 py-5 pb-28 md:pb-32 transition-colors duration-200">
      <div className="w-full max-w-[860px] mx-auto flex flex-col gap-5">
        
        {/* Active DB Telemetry Banner */}
        <div className="flex items-center justify-center">
          <div className="inline-flex items-center gap-1.5 bg-white dark:bg-[#131B2E] border border-[#E2E8F0] dark:border-[#1E293B] px-3.5 py-1.5 rounded-full text-[11px] text-[#64748B] dark:text-[#94A3B8] shadow-xs">
            <span className="w-2 h-2 rounded-full bg-[#10B981] shadow-[0_0_6px_#10B981]" />
            <span className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">Live SQL Engine:</span>
            <span className="font-mono">match_stats & players connected</span>
          </div>
        </div>

        {chatHistory.map((item) => (
          <div key={item.id} className="space-y-4">
            {/* User Question Bubble */}
            <div className="flex justify-end w-full">
              <div className="bg-[#E2E8F0] dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] text-sm md:text-base rounded-2xl rounded-tr-sm p-3.5 md:p-4 max-w-[88%] md:max-w-[82%] leading-relaxed border border-[#CBD5E1] dark:border-[#273647]/50 shadow-sm transition-colors">
                {item.query}
              </div>
            </div>

            {/* Collapsible Reasoning & SQL Pill */}
            <div className="flex justify-start">
              <button 
                onClick={() => setShowReasoning(prev => !prev)}
                className="bg-white dark:bg-[#131B2E] hover:bg-[#F8FAFC] dark:hover:bg-[#1A243D] border border-[#E2E8F0] dark:border-[#1E293B] text-xs text-[#64748B] dark:text-[#94A3B8] px-3.5 py-1.5 rounded-full inline-flex items-center gap-2 transition-colors active:scale-95 shadow-xs"
              >
                <span className="material-symbols-outlined text-[14px] text-[#059669] dark:text-[#10B981]">terminal</span>
                <span className="truncate max-w-[280px] sm:max-w-[420px]">{item.reasoning}</span>
                <span className="material-symbols-outlined text-[14px]">
                  {showReasoning ? 'expand_less' : 'expand_more'}
                </span>
              </button>
            </div>

            {/* Expanded SQL Display */}
            {showReasoning && item.sql && (
              <div className="bg-[#0E1420] text-[#10B981] p-3 rounded-xl border border-[#1E293B] text-xs font-mono overflow-x-auto">
                <div className="text-[10px] text-[#94A3B8] uppercase font-bold mb-1">Executed SQL:</div>
                <code>{item.sql}</code>
              </div>
            )}

            {/* Response Card with Split Layout */}
            <section className="bg-white dark:bg-[#131B2E] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl p-4 md:p-6 shadow-sm flex flex-col gap-5 transition-colors">
              {/* Card Header */}
              <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#1E293B] pb-3">
                <div className="flex items-center gap-2">
                  <StatBallLogo size={20} />
                  <span className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">Counsel Tactical Analyst</span>
                </div>
                <span className="text-xs text-[#64748B] dark:text-[#94A3B8] font-mono">Live Analysis</span>
              </div>

              {/* Responsive Interior: Text & Bar Chart */}
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Left: Text Analysis & Follow-ups */}
                <div className="lg:w-[45%] flex flex-col justify-between gap-4">
                  <div>
                    <p className="text-sm md:text-base text-[#0F172A] dark:text-[#F8FAFC] leading-relaxed">
                      {item.narrative}
                    </p>
                    <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-2 leading-normal">
                      {item.detail}
                    </p>
                  </div>

                  {/* Follow-up Prompt Chips */}
                  {item.followUps && item.followUps.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {item.followUps.map((chip, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSend(chip)}
                          className="bg-[#F1F5F9] dark:bg-[#1E293B]/80 hover:bg-[#E2E8F0] dark:hover:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#1E293B] text-xs text-[#0F172A] dark:text-[#F8FAFC] px-3 py-1.5 rounded-full inline-flex items-center gap-1.5 transition-colors active:scale-95"
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${idx === 0 ? 'bg-[#059669] dark:bg-[#10B981]' : 'bg-[#0284C7] dark:bg-[#0EA5E9]'}`} />
                          <span>{chip}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right: Horizontal Bar Chart */}
                {item.chartData && item.chartData.length > 0 && (
                  <div className="lg:w-[55%] flex flex-col bg-[#F8FAFC] dark:bg-[#0E1420] border border-[#E2E8F0] dark:border-[#1E293B] rounded-lg p-4 transition-colors">
                    <div className="flex items-center justify-between pb-3 mb-2 border-b border-[#E2E8F0] dark:border-[#1E293B]/70">
                      <span className="font-mono text-[11px] uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
                        {item.metric_label || 'TACTICAL COVERAGE'}
                      </span>
                      <span className="font-mono text-[11px] text-[#059669] dark:text-[#10B981] bg-[#ECFDF5] dark:bg-[#10B981]/10 px-2 py-0.5 rounded border border-[#A7F3D0] dark:border-[#10B981]/30">
                        Live Metrics
                      </span>
                    </div>

                    <div className="relative flex flex-col gap-2.5 pt-1">
                      {item.chartData.map((row, rIdx) => (
                        <div key={rIdx} className="relative z-10 flex items-center h-6 text-xs">
                          <span className="w-[100px] shrink-0 text-[#0F172A] dark:text-[#F8FAFC] font-medium text-right pr-3 truncate" title={row.team}>
                            {row.team}
                          </span>
                          <div className="flex-1 flex items-center relative h-full">
                            <div 
                              className={`h-[18px] rounded-sm transition-all duration-500 shadow-sm ${
                                row.color === 'emerald' 
                                   ? 'bg-[#059669] dark:bg-[#10B981]' 
                                  : 'bg-[#0284C7] dark:bg-[#0EA5E9]'
                              }`}
                              style={{ width: `${row.percent}%` }}
                            />
                            <span className="ml-2 font-mono text-[11px] text-[#0F172A] dark:text-[#F8FAFC] font-semibold">
                              {typeof row.value === 'number' ? row.value.toFixed(1) : row.value}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>
        ))}

        {/* Loading Query Bubble */}
        {isQuerying && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-[#131B2E] border border-[#E2E8F0] dark:border-[#1E293B] rounded-2xl p-4 flex items-center gap-3 text-xs font-mono text-[#64748B] dark:text-[#94A3B8] shadow-xs">
              <span className="material-symbols-outlined text-[18px] animate-spin text-[#059669] dark:text-[#10B981]">
                refresh
              </span>
              <span>Analyzing tactical data & computing metrics...</span>
            </div>
          </div>
        )}
      </div>

      {/* Floating Bottom Chat Input Dock */}
      <div className="fixed bottom-0 left-0 md:left-[72px] lg:left-[240px] right-0 bg-gradient-to-t from-[#FAF8FF] via-[#FAF8FF] dark:from-[#0B0F17] dark:via-[#0B0F17] to-transparent pt-6 pb-4 px-4 md:px-8 z-30 transition-colors duration-200">
        <div className="w-full max-w-[860px] mx-auto space-y-2">
          {/* Quick Prompts Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scroll pb-1">
            {[
              'Show Osasuna home corners',
              'Show Real Madrid last 5 matches',
              'Compare foul averages for Arsenal',
              'Show top teams with low opponent corners'
            ].map((p, idx) => (
              <button
                key={idx}
                disabled={isQuerying}
                onClick={() => handleSend(p)}
                className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-white dark:bg-[#131B2E] hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#1E293B] text-[#64748B] dark:text-[#94A3B8] hover:text-[#059669] dark:hover:text-[#10B981] whitespace-nowrap transition-colors shadow-xs disabled:opacity-50"
              >
                {p}
              </button>
            ))}
          </div>

          {/* Input Form */}
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2 bg-white dark:bg-[#131B2E] border border-[#E2E8F0] dark:border-[#1E293B] hover:border-[#059669]/50 dark:hover:border-[#10B981]/50 focus-within:border-[#059669] dark:focus-within:border-[#10B981] rounded-xl px-3 py-2 shadow-lg transition-colors"
          >
            <input
              type="text"
              value={inputValue}
              disabled={isQuerying}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask Counsel AI any tactical question (e.g., Osasuna home corners or Real Madrid xG)..."
              className="flex-1 bg-transparent border-0 text-xs md:text-sm text-[#0F172A] dark:text-[#F8FAFC] placeholder-[#94A3B8] dark:placeholder-[#64748B] focus:ring-0 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isQuerying}
              className="w-8 h-8 rounded-lg bg-[#059669] hover:bg-[#047857] dark:bg-[#10B981] dark:hover:bg-[#059669] disabled:opacity-40 text-white dark:text-[#0B0F17] flex items-center justify-center transition-all shadow-sm active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px]">
                {isQuerying ? 'hourglass_top' : 'send'}
              </span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
