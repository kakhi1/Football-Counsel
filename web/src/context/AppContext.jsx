import React, { createContext, useContext, useState, useEffect } from 'react';
import { fetchMatches, fetchDatabaseStats } from '../services/api';

const AppContext = createContext();

export function AppProvider({ children }) {
  // Navigation tabs: 'matches' (Upcoming Matches Hub - Home), 'match' (AI Summary & Match Chat), 'ask' (Ask Counsel AI), 'pro' (Upgrade), 'signin' (Auth)
  const [currentScreen, setCurrentScreen] = useState('matches');

  // Live database matches and telemetry
  const [matches, setMatches] = useState([]);
  const [curatedData, setCuratedData] = useState(null);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [dbStats, setDbStats] = useState({ engine: 'Connecting...', metrics: { matches: 0, players: 0 } });

  // Track which match IDs the user has unlocked in this session
  const [unlockedMatchIds, setUnlockedMatchIds] = useState([]);

  // Match waiting to be opened after Sign In or Pro Upgrade
  const [pendingMatch, setPendingMatch] = useState(null);
  const [gateReason, setGateReason] = useState(null); // 'guest_limit' | 'quota_exceeded' | null

  // View frame mode: 'mobile' (strict 390px phone container) or 'desktop' (adaptive full width)
  const [viewMode, setViewMode] = useState('desktop');

  // Active match context (loads from real database)
  const [activeMatch, setActiveMatch] = useState(null);

  // Authenticated user state
  const [user, setUser] = useState({
    isAuthenticated: false,
    isPro: false,
    name: 'Guest Scout',
    email: '',
    tier: 'Guest (1 Free Match)'
  });

  // Derived quota based on user state & unlocked matches
  const quota = {
    used: unlockedMatchIds.length,
    total: user.isPro ? 999 : user.isAuthenticated ? 3 : 1
  };

  // Load live database matches on mount
  useEffect(() => {
    async function loadData() {
      setLoadingMatches(true);
      const [matchesRes, statsRes] = await Promise.all([
        fetchMatches(),
        fetchDatabaseStats()
      ]);

      if (matchesRes && matchesRes.data) {
        const raw = matchesRes.data;
        const allList = Array.isArray(raw) ? raw : (raw.all_fixtures || []);
        const curated = Array.isArray(raw)
          ? { hero_match: raw[0] || null, midweek: [], weekend: [], all_fixtures: raw }
          : raw;
        setMatches(allList);
        setCuratedData(curated);
        setActiveMatch(prev => prev || curated.hero_match || allList[0] || null);
      }
      if (statsRes && statsRes.metrics) {
        setDbStats(statsRes);
      }
      setLoadingMatches(false);
    }
    loadData();
  }, []);

  // Funnel handler when user clicks any match to analyze
  const selectMatchForAnalysis = (match) => {
    if (!match) return;

    // 1. If already unlocked in this session, open immediately
    if (unlockedMatchIds.includes(match.id)) {
      setActiveMatch(match);
      setGateReason(null);
      setCurrentScreen('match');
      return;
    }

    // 2. If Pro Tactician, unlimited access
    if (user.isPro) {
      setUnlockedMatchIds(prev => [...prev, match.id]);
      setActiveMatch(match);
      setGateReason(null);
      setCurrentScreen('match');
      return;
    }

    // 3. Guest (unauthenticated): 1st match is 100% free; 2nd match requires free Sign In
    if (!user.isAuthenticated) {
      if (unlockedMatchIds.length < 1) {
        setUnlockedMatchIds([match.id]);
        setActiveMatch(match);
        setGateReason(null);
        setCurrentScreen('match');
      } else {
        setPendingMatch(match);
        setGateReason('guest_limit');
        setCurrentScreen('signin');
      }
      return;
    }

    // 4. Signed-in Free Scout: up to 3 matches/day free; 4th+ match requires Pro Upgrade
    if (unlockedMatchIds.length < 3) {
      setUnlockedMatchIds(prev => [...prev, match.id]);
      setActiveMatch(match);
      setGateReason(null);
      setCurrentScreen('match');
    } else {
      setPendingMatch(match);
      setGateReason('quota_exceeded');
      setCurrentScreen('pro');
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentScreen,
        setCurrentScreen,
        matches,
        setMatches,
        curatedData,
        setCuratedData,
        loadingMatches,
        dbStats,
        quota,
        unlockedMatchIds,
        setUnlockedMatchIds,
        pendingMatch,
        setPendingMatch,
        gateReason,
        setGateReason,
        viewMode,
        setViewMode,
        activeMatch,
        setActiveMatch,
        user,
        setUser,
        selectMatchForAnalysis
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
