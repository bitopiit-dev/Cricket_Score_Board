import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useApplyTheme } from './hooks/useApplyTheme';
import AwardsPage from './pages/AwardsPage';
import HomePage from './pages/HomePage';
import NewMatchPage from './pages/NewMatchPage';
import RulesPage from './pages/RulesPage';
import ScoringPage from './pages/ScoringPage';
import TeamPage from './pages/TeamPage';

/**
 * HashRouter so the app works from any static host (and offline) without
 * server-side fallback rules.
 */
export default function App() {
  useApplyTheme();
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/new" element={<NewMatchPage />} />
        <Route path="/match/:id" element={<ScoringPage />} />
        <Route path="/team/:id" element={<TeamPage />} />
        <Route path="/rules" element={<RulesPage />} />
        <Route path="/awards" element={<AwardsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
