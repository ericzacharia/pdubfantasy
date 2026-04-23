import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { PwhlAuthProvider } from './contexts/PwhlAuthContext';

import './css/colors.css';
import './css/main.css';
import './css/pwhl.css';

import PWHLLayout from './components/pages/PWHLLayout';
import PWHLHome from './components/pages/PWHLHome';
import PWHLLogin from './components/pages/PWHLLogin';
import PWHLRegister from './components/pages/PWHLRegister';
import PWHLHub from './components/pages/PWHLHub';
import LeagueBrowser from './components/pages/LeagueBrowser';
import LeagueDetail from './components/pages/LeagueDetail';
import MyTeamView from './components/pages/MyTeamView';
import WaiverWire from './components/pages/WaiverWire';
import TradeCenter from './components/pages/TradeCenter';
import DraftView from './components/pages/DraftView';
import TrendsView from './components/pages/TrendsView';
import PWHLSettings from './components/pages/PWHLSettings';
import PlayerDetail from './components/pages/PlayerDetail';

function App() {
  return (
    <PwhlAuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<PWHLLayout />}>
            <Route index element={<PWHLHome />} />
            <Route path="login" element={<PWHLLogin />} />
            <Route path="register" element={<PWHLRegister />} />
            <Route path="hub" element={<PWHLHub />} />
            <Route path="leagues" element={<LeagueBrowser />} />
            <Route path="leagues/:leagueId" element={<LeagueDetail />} />
            <Route path="teams/:teamId" element={<MyTeamView />} />
            <Route path="waivers/:leagueId/:teamId" element={<WaiverWire />} />
            <Route path="trades/:leagueId/:teamId" element={<TradeCenter />} />
            <Route path="draft/:leagueId" element={<DraftView />} />
            <Route path="trends" element={<TrendsView />} />
            <Route path="settings" element={<PWHLSettings />} />
            <Route path="player/:playerId" element={<PlayerDetail />} />
          </Route>
        </Routes>
      </Router>
    </PwhlAuthProvider>
  );
}

export default App;
