// 🏥 Route protégée - Contrôle d'accès par rôle (version robuste)

import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const normalizeRole = (r) =>
  String(r || "").toUpperCase().replace("ROLE_", "").trim();

/**
 * 🔐 Vérifie si un token JWT est expiré côté client (sans validation de signature).
 * C'est une barrière rapide avant que le backend ne rejette la requête.
 */
const isTokenExpired = (token) => {
  if (!token) return true;
  try {
    const payloadBase64 = token.split(".")[1];
    if (!payloadBase64) return true;
    const payload = JSON.parse(atob(payloadBase64));
    if (!payload.exp) return false; // Pas d'exp = on laisse passer (backend décide)
    // On ajoute une marge de 60 secondes pour éviter les rejets en vol
    return payload.exp * 1000 < Date.now() + 60000;
  } catch {
    return true;
  }
};

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
  const rawToken = localStorage.getItem("token");
  const hasToken = isAuthenticated || !!rawToken;

  if (!hasToken) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // 🛡️ RENFORCEMENT : Si le token existe mais est expiré, on force le logout/redirection
  if (rawToken && isTokenExpired(rawToken)) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    console.warn("[ProtectedRoute] Token expiré détecté, redirection vers login.");
    return <Navigate to="/login" replace state={{ from: location, expired: true }} />;
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