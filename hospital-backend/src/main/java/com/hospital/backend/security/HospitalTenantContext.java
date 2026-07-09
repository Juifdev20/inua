package com.hospital.backend.security;

/**
 * ThreadLocal context holding the current hospital ID for multi-tenant filtering.
 * Set by JwtAuthenticationFilter on each request; cleared after response.
 */
public class HospitalTenantContext {

    /**
     * Valeur sentinelle posée pour un utilisateur NON-superadmin dépourvu d'hôpital.
     * Elle ne correspond à aucun hôpital réel : les requêtes filtrées par hôpital
     * (findByHospitalId(NO_TENANT)) renvoient donc un résultat vide, empêchant toute
     * fuite de données inter-hôpitaux. Seul un vrai SUPERADMIN conserve un id null
     * (accès global). Voir JwtAuthenticationFilter.
     */
    public static final Long NO_TENANT = -1L;

    private static final ThreadLocal<Long> CURRENT_HOSPITAL_ID = new ThreadLocal<>();

    public static void setHospitalId(Long hospitalId) {
        CURRENT_HOSPITAL_ID.set(hospitalId);
    }

    public static Long getHospitalId() {
        return CURRENT_HOSPITAL_ID.get();
    }

    public static void clear() {
        CURRENT_HOSPITAL_ID.remove();
    }

    public static boolean isSet() {
        return CURRENT_HOSPITAL_ID.get() != null;
    }
}
