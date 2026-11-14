import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { useApplyTheme } from './hooks/useApplyTheme';
import AwardsPage from './pages/AwardsPage';
import CommitteePage from './pages/CommitteePage';
import LivePage from './pages/LivePage';
import MorePage from './pages/MorePage';
import NewMatchPage from './pages/NewMatchPage';
import RulesPage from './pages/RulesPage';
import ScoringPage from './pages/ScoringPage';
import PointsPage from './pages/PointsPage';
import { FixturesPage, MediaPage, StatsPage } from './pages/SoonPages';
import TeamPage from './pages/TeamPage';
import TeamsPage from './pages/TeamsPage';

/**
 * HashRouter so the app works from any static host (and offline) without
 * server-side fallback rules. Every tab has its own URL (#/live, #/teams …).
 */
export default function App() {
  useApplyTheme();
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/live" element={<LivePage />} />
          <Route path="/fixtures" element={<FixturesPage />} />
          <Route path="/points" element={<PointsPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/awards" element={<AwardsPage />} />
          <Route path="/teams" element={<TeamsPage />} />
          <Route path="/team/:id" element={<TeamPage />} />
          <Route path="/more" element={<MorePage />} />
          <Route path="/rules" element={<RulesPage />} />
          <Route path="/committee" element={<CommitteePage />} />
          <Route path="/media" element={<MediaPage />} />
        </Route>
        {/* Full-screen pages without the tab bar */}
        <Route path="/new" element={<NewMatchPage />} />
        <Route path="/match/:id" element={<ScoringPage />} />
        <Route path="*" element={<Navigate to="/live" replace />} />
      </Routes>
    </HashRouter>
  );
}
