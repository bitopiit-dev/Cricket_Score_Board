import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import { AppShell } from './components/layout/AppShell';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ConflictNotice } from './components/layout/ConflictNotice';
import { useApplyTheme } from './hooks/useApplyTheme';
import HomePage from './pages/HomePage';
import { useCanScore } from './sync/auth';
import { lazyPage, preloadPages } from './utils/lazyPage';
import { PageSkeleton } from './components/common/Skeleton';

// Home is the first screen, so it ships in the main bundle; every other page loads on demand
const AwardsPage = lazyPage(() => import('./pages/AwardsPage'));
const CommitteePage = lazyPage(() => import('./pages/CommitteePage'));
const LivePage = lazyPage(() => import('./pages/LivePage'));
const MorePage = lazyPage(() => import('./pages/MorePage'));
const NewMatchPage = lazyPage(() => import('./pages/NewMatchPage'));
const RulesPage = lazyPage(() => import('./pages/RulesPage'));
const ScoringPage = lazyPage(() => import('./pages/ScoringPage'));
const PointsPage = lazyPage(() => import('./pages/PointsPage'));
const FixturesPage = lazyPage(() => import('./pages/FixturesPage'));
const StatsPage = lazyPage(() => import('./pages/StatsPage'));
const PlayerPage = lazyPage(() => import('./pages/PlayerPage'));
const TeamPage = lazyPage(() => import('./pages/TeamPage'));
const TeamsPage = lazyPage(() => import('./pages/TeamsPage'));
const MediaPage = lazyPage(() => import('./pages/MediaPage'));
const AlertsPage = lazyPage(() => import('./pages/AlertsPage'));
// Only the admin downloads the admin screens (not preloaded)
const AdminPage = lazy(() => import('./pages/admin/AdminPage'));
const MatchReportPage = lazy(() => import('./pages/MatchReportPage'));

/**
 * HashRouter so the app works from any static host (and offline) without
 * server-side fallback rules. Every tab has its own URL (#/live, #/teams …).
 */
export default function App() {
  useApplyTheme();
  useEffect(preloadPages, []);
  return (
    <HashRouter>
      <ConflictNotice />
      <RouteBoundary>
        <Suspense fallback={<PageSkeleton />}>
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
              <Route path="/alerts" element={<AlertsPage />} />
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
            <Route
              path="/report/:id"
              element={
                <ScorerOnly>
                  <MatchReportPage />
                </ScorerOnly>
              }
            />
            <Route path="*" element={<Navigate to="/home" replace />} />
          </Routes>
        </Suspense>
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
