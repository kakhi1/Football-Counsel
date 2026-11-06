import React from 'react';
import { useApp } from './context/AppContext';
import Sidebar from './components/Sidebar';
import MobileHeader from './components/MobileHeader';
import BottomNavBar from './components/BottomNavBar';
import AskConsulScreen from './screens/AskConsulScreen';
import MatchAgentScreen from './screens/MatchAgentScreen';
import UpcomingMatchesScreen from './screens/UpcomingMatchesScreen';
import ProUpgradeScreen from './screens/ProUpgradeScreen';
import SignInScreen from './screens/SignInScreen';

export default function App() {
  const { currentScreen } = useApp();

  const renderActiveScreen = () => {
    switch (currentScreen) {
      case 'matches':
        return <UpcomingMatchesScreen />;
      case 'ask':
        return <AskConsulScreen />;
      case 'match':
        return <MatchAgentScreen />;
      case 'pro':
        return <ProUpgradeScreen />;
      case 'signin':
        return <SignInScreen />;
      default:
        return <UpcomingMatchesScreen />;
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#FAF8FF] dark:bg-[#0B0F17] text-[#0F172A] dark:text-[#F8FAFC] transition-colors duration-200">
      {/* Responsive Left Sidebar (Desktop 240px, Tablet 72px, Mobile hidden) */}
      <Sidebar />

      {/* Main Workspace Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-[#FAF8FF] dark:bg-[#0B0F17] relative transition-colors duration-200">
        {/* Mobile Header (md:hidden) */}
        <MobileHeader />

        {/* Dynamic Center Canvas */}
        <div className="flex-1 flex flex-col h-full overflow-hidden relative">
          {renderActiveScreen()}
        </div>

        {/* Mobile Docked Bottom Bar (md:hidden) */}
        <BottomNavBar />
      </main>
    </div>
  );
}
