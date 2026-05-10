package com.hospital.backend.entity;

public enum MedicationForm {
    COMPRISE("comprimé"),
    SOLUTION("solution"),
    OVULE("ovule"),
    SIROP("sirop"),
    INJECTABLE("injectable"),
    GELULE("gélule"),
    CREME("crème"),
    POMMADE("pommade"),
    GOUTTES("gouttes"),
    INHALATEUR("inhalateur"),
    PATCH("patch"),
    SUPPOSITOIRE("suppositoire");

    private final String displayName;

    MedicationForm(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }

    @Override
    public String toString() {
        return displayName;
    }
}
