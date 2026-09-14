import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAppSelector } from '../store';
import { LoadingState } from '../../shared/components/LoadingState';

export function ProtectedRoute() {
  const { user, initialized } = useAppSelector((state) => state.auth);
  const location = useLocation();

  if (!initialized) {
    return <LoadingState />;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
