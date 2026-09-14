import { Navigate, createBrowserRouter } from 'react-router-dom';

import { AppLayout } from '../../layouts/AppLayout/AppLayout';
import { AuthLayout } from '../../layouts/AuthLayout/AuthLayout';
import { DashboardPage } from '../../features/dashboard/pages/DashboardPage';
import { CreateNotificationPage } from '../../features/notifications/pages/CreateNotificationPage';
import { EditNotificationPage } from '../../features/notifications/pages/EditNotificationPage';
import { NotificationDetailPage } from '../../features/notifications/pages/NotificationDetailPage';
import { NotificationsPage } from '../../features/notifications/pages/NotificationsPage';
import { GoogleCallbackPage } from '../../features/auth/pages/GoogleCallbackPage';
import { LoginPage } from '../../features/auth/pages/LoginPage';
import { ProtectedRoute } from './ProtectedRoute';

export const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/auth/callback', element: <GoogleCallbackPage /> },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/', element: <Navigate to="/dashboard" replace /> },
          { path: '/dashboard', element: <DashboardPage /> },
          { path: '/notifications', element: <NotificationsPage /> },
          { path: '/notifications/new', element: <CreateNotificationPage /> },
          { path: '/notifications/:id', element: <NotificationDetailPage /> },
          { path: '/notifications/:id/edit', element: <EditNotificationPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
]);
