import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2, ShieldAlert } from 'lucide-react';

export default function SuperAdminRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-400 mb-4" />
        <p className="text-gray-400 font-medium">Vérification des droits Super Admin...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const normalizeRole = (r) => String(r || '').toUpperCase().replace('ROLE_', '').trim();
  const role = normalizeRole(user.role);

  if (role !== 'SUPERADMIN') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-6">
        <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Accès refusé</h1>
        <p className="text-gray-400 text-center max-w-md">
          Cet espace est réservé exclusivement aux développeurs et administrateurs techniques du système Inua Afya.
        </p>
        <a href="/" className="mt-6 text-emerald-400 hover:underline">Retour à l'accueil</a>
      </div>
    );
  }

  return children;
}
