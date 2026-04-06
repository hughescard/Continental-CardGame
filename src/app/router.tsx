import { Suspense, lazy } from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { AppProviders } from '@/app/providers/AppProviders';
import { AppLayout } from '@/shared/ui/layout/AppLayout';
import { BackgroundMusicManager } from '@/shared/audio/BackgroundMusicManager';

const HomePage = lazy(async () => {
  const module = await import('@/features/home/pages/HomePage');
  return { default: module.HomePage };
});

const JoinPage = lazy(async () => {
  const module = await import('@/features/join/pages/JoinPage');
  return { default: module.JoinPage };
});

const RulesPage = lazy(async () => {
  const module = await import('@/features/rules/pages/RulesPage');
  return { default: module.RulesPage };
});

const RoomPage = lazy(async () => {
  const module = await import('@/features/room/pages/RoomPage');
  return { default: module.RoomPage };
});

const GamePage = lazy(async () => {
  const module = await import('@/features/game/pages/GamePage');
  return { default: module.GamePage };
});

function RouteFallback() {
  return (
    <div className="rounded-2xl border border-line bg-surface-alt px-4 py-8 text-sm text-muted shadow-panel">
      Cargando pantalla...
    </div>
  );
}

function LoadablePage({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<RouteFallback />}>{children}</Suspense>;
}

function RootLayout() {
  return (
    <AppProviders>
      <BackgroundMusicManager />
      <AppLayout>
        <Outlet />
      </AppLayout>
    </AppProviders>
  );
}

export const appRouter = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: (
          <LoadablePage>
            <HomePage />
          </LoadablePage>
        ),
      },
      {
        path: 'join',
        element: (
          <LoadablePage>
            <JoinPage />
          </LoadablePage>
        ),
      },
      {
        path: 'rules',
        element: (
          <LoadablePage>
            <RulesPage />
          </LoadablePage>
        ),
      },
      {
        path: 'room/:roomId',
        element: (
          <LoadablePage>
            <RoomPage />
          </LoadablePage>
        ),
      },
      {
        path: 'game/:roomId',
        element: (
          <LoadablePage>
            <GamePage />
          </LoadablePage>
        ),
      },
      {
        path: '*',
        element: <Navigate replace to="/" />,
      },
    ],
  },
]);
