package com.hospital.backend.security;

/**
 * ThreadLocal context holding the current hospital ID for multi-tenant filtering.
 * Set by JwtAuthenticationFilter on each request; cleared after response.
 */
public class HospitalTenantContext {

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
