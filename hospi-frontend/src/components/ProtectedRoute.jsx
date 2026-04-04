// 🏥 Route protégée - Contrôle d'accès par rôle (version robuste)

import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const normalizeRole = (r) =>
  String(r || "").toUpperCase().replace("ROLE_", "").trim();

const getDashboardPathByRole = (rawRole) => {
  const role = normalizeRole(rawRole);

  const map = {
    ADMIN: "/admin/dashboard",
    RECEPTION: "/reception/dashboard",
    DOCTOR: "/doctor/dashboard",
    DOCTEUR: "/doctor/dashboard",
    FINANCE: "/finance/dashboard",
    CAISSIER: "/finance/dashboard",
    LABORATOIRE: "/labo/dashboard",
    LABO: "/labo/dashboard",
    PHARMACY: "/pharmacy/dashboard",
    PHARMACIE: "/pharmacy/dashboard",
    PATIENT: "/patient/dashboard",
  };

  return map[role] || "/";
};

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { isAuthenticated, user, role, loading } = useAuth();
  const location = useLocation();

  // Loader pendant initialisation auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  // Sécurise les "race conditions" juste après login
  const hasToken = isAuthenticated || !!localStorage.getItem("token");

  if (!hasToken) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Rôle courant (context d'abord, puis fallback localStorage)
  let currentRole = normalizeRole(user?.role || role);

  if (!currentRole || currentRole === "GUEST") {
    try {
      const storedUser = JSON.parse(localStorage.getItem("user") || "null");
      currentRole = normalizeRole(storedUser?.role);
    } catch {
      currentRole = "";
    }
  }

  // Vérification des rôles autorisés
  if (allowedRoles.length > 0) {
    const normalizedAllowed = allowedRoles.map(normalizeRole);
    if (!normalizedAllowed.includes(currentRole)) {
      // Rediriger vers le bon dashboard du rôle connecté
      return <Navigate to={getDashboardPathByRole(currentRole)} replace />;
    }
  }

  return children;
};

export default ProtectedRoute;