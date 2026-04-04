import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react'; // Optionnel : pour un joli spinner

export default function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // 1. PHASE D'ATTENTE : On empêche toute redirection tant que le AuthContext 
  // n'a pas fini de lire le localStorage (ou de vérifier le token).
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
        <p className="text-gray-500 font-medium">Chargement de la session...</p>
      </div>
    );
  }

  // 2. VÉRIFICATION DE CONNEXION : Si le chargement est fini et qu'aucun 
  // utilisateur n'est trouvé, on renvoie vers le login.
  if (!user) {
    console.log("AdminRoute: Aucun utilisateur trouvé, redirection login.");
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. VÉRIFICATION DU RÔLE : Si l'utilisateur est connecté mais n'est pas ADMIN.
  if (user.role !== 'ADMIN') {
    console.warn("AdminRoute: Accès refusé (Rôle insuffisant) :", user.role);
    return <Navigate to="/" replace />;
  }

  // 4. AUTORISATION : Si tout est OK, on affiche le contenu de la route admin.
  return children;
}