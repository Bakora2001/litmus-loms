import { Navigate, useLocation } from 'react-router-dom';
import { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';

// Map routes to the permission key required to access them
const ROUTE_PERMISSIONS: Record<string, string> = {
  '/inventory': 'inventory',
  '/computer-store': 'inventory',
  '/laptop-store': 'inventory',
  '/invoices': 'invoices',
  '/debt-tracker': 'debt_tracker',
  '/bulk-sms': 'sms',
  '/reports': 'reports',
  '/sales': 'reports',
  '/expenses': 'expenses',
  '/settings': 'settings',
};

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-litmus-bg text-gray-400 text-sm">
        Loading Litmus Tech Solutions…
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  // Check route-level permissions (owner bypasses)
  const isOwner = user.role === 'owner';
  const requiredPermission = ROUTE_PERMISSIONS[location.pathname];
 
  if (!isOwner && requiredPermission) {
    const userPermissions: string[] = user.permissions || [];
    if (!userPermissions.includes(requiredPermission)) {
      // Redirect to dashboard with an access-denied notice
      return <Navigate to="/" replace state={{ accessDenied: requiredPermission }} />;
    }
  }

  return <>{children}</>;
}
