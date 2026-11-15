import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { lazy, Suspense, type ReactNode } from 'react';
import { AppShell } from './components/layout/AppShell';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ConflictNotice } from './components/layout/ConflictNotice';
import { useApplyTheme } from './hooks/useApplyTheme';
import AwardsPage from './pages/AwardsPage';
import CommitteePage from './pages/CommitteePage';
import HomePage from './pages/HomePage';
import LivePage from './pages/LivePage';
import MorePage from './pages/MorePage';
import NewMatchPage from './pages/NewMatchPage';
import RulesPage from './pages/RulesPage';
import ScoringPage from './pages/ScoringPage';
import PointsPage from './pages/PointsPage';
import FixturesPage from './pages/FixturesPage';
import { MediaPage } from './pages/SoonPages';
import StatsPage from './pages/StatsPage';
import PlayerPage from './pages/PlayerPage';
import TeamPage from './pages/TeamPage';
import TeamsPage from './pages/TeamsPage';
import { useCanScore } from './sync/auth';

// Only the admin downloads the admin screens
const AdminPage = lazy(() => import('./pages/admin/AdminPage'));

/**
 * HashRouter so the app works from any static host (and offline) without
 * server-side fallback rules. Every tab has its own URL (#/live, #/teams …).
 */
export default function App() {
  useApplyTheme();
  return (
    <HashRouter>
      <ConflictNotice />
      <RouteBoundary>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/home" element={<HomePage />} />
            <Route path="/live" element={<LivePage />} />
            <Route path="/fixtures" element={<FixturesPage />} />
            <Route path="/points" element={<PointsPage />} />
            <Route path="/stats" element={<StatsPage />} />
            <Route path="/awards" element={<AwardsPage />} />
            <Route path="/teams" element={<TeamsPage />} />
            <Route path="/team/:id" element={<TeamPage />} />
            <Route path="/player/:teamId/:playerId" element={<PlayerPage />} />
            <Route path="/more" element={<MorePage />} />
            <Route
              path="/admin"
              element={
                <Suspense fallback={null}>
                  <AdminPage />
                </Suspense>
              }
            />
            <Route path="/rules" element={<RulesPage />} />
            <Route path="/committee" element={<CommitteePage />} />
            <Route path="/media" element={<MediaPage />} />
          </Route>
          {/* Full-screen pages without the tab bar */}
          <Route
            path="/new"
            element={
              <ScorerOnly>
                <NewMatchPage />
              </ScorerOnly>
            }
          />
          <Route path="/match/:id" element={<ScoringPage />} />
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </RouteBoundary>
    </HashRouter>
  );
}

/** Pages only scorers and super admins may open; anyone else (e.g. an old link) goes to Live. */
function ScorerOnly({ children }: { children: ReactNode }) {
  return useCanScore() ? children : <Navigate to="/live" replace />;
}

/** A crash in one page shows a message there; opening another page recovers. */
function RouteBoundary({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return <ErrorBoundary resetKey={pathname}>{children}</ErrorBoundary>;
}
