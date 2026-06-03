package com.hospital.backend.audit;

import com.hospital.backend.service.AuditLogService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Pointcut;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/**
 * 🔍 PatientDataAccessAuditAspect - Audit automatique des accès aux données patients
 *
 * Cet aspect intercepte automatiquement tous les appels aux controllers
 * manipulant des données patients (CRUD, consultations, facturation, documents...).
 *
 * Pour chaque accès, il enregistre :
 * - QUI   : username/email de l'utilisateur connecté (SecurityContext)
 * - QUOI  : méthode exécutée + arguments (ID patient, etc.)
 * - QUAND : timestamp précis
 * - OÙ   : adresse IP du client (X-Forwarded-For ou remoteAddr)
 * - RÉSULTAT : SUCCESS ou FAILURE + durée d'exécution
 *
 * Les logs sont persistés dans la table audit_logs via AuditLogService.
 *
 * ⚠️ Le logging est asynchrone (fire-and-forget) pour ne pas impacter
 * les performances des requêtes utilisateur.
 */
@Aspect
@Component
@RequiredArgsConstructor
@Slf4j
public class PatientDataAccessAuditAspect {

    private final AuditLogService auditLogService;

    /**
     * Définit les controllers concernant les données patients.
     * On cible explicitement les points d'entrée HTTP (controllers).
     */
    @Pointcut("execution(* com.hospital.backend.controller.PatientController.*(..)) || " +
            "execution(* com.hospital.backend.controller.PatientBillingController.*(..)) || " +
            "execution(* com.hospital.backend.controller.PatientDocumentController.*(..)) || " +
            "execution(* com.hospital.backend.controller.PatientDocumentPatientController.*(..)) || " +
            "execution(* com.hospital.backend.controller.PatientInvoiceController.*(..)) || " +
            "execution(* com.hospital.backend.controller.PatientServiceCatalogController.*(..)) || " +
            "execution(* com.hospital.backend.controller.DoctorDossierController.*(..)) || " +
            "execution(* com.hospital.backend.controller.ReceptionController.*(..)) || " +
            "execution(* com.hospital.backend.controller.ConsultationController.*(..)) || " +
            "execution(* com.hospital.backend.controller.DoctorController.patients*(..)) || " +
            "execution(* com.hospital.backend.controller.DoctorController.*Patient*(..)) || " +
            "execution(* com.hospital.backend.controller.AdmissionController.*(..))")
    public void patientDataAccessPointcut() {}

    /**
     * Intercepte chaque méthode du pointcut, mesure le temps d'exécution
     * et persiste un log d'audit immédiatement après la méthode (succès ou échec).
     */
    @Around("patientDataAccessPointcut()")
    public Object auditPatientAccess(ProceedingJoinPoint joinPoint) throws Throwable {
        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        String className = signature.getDeclaringType().getSimpleName();
        String methodName = signature.getName();
        String fullMethod = className + "." + methodName;

        // --- QUI : utilisateur connecté ---
        String username = getCurrentUsername();

        // --- OÙ : IP du client ---
        String clientIp = resolveClientIp();

        // --- QUOI : type d'action (CRUD) + arguments ---
        String actionType = inferActionType(methodName);
        String details = buildDetails(fullMethod, joinPoint.getArgs());

        long startTime = System.currentTimeMillis();
        String status = "SUCCESS";
        String errorDetail = "";

        try {
            Object result = joinPoint.proceed();
            return result;
        } catch (Exception ex) {
            status = "FAILURE";
            errorDetail = ex.getClass().getSimpleName() + ": " + ex.getMessage();
            throw ex;
        } finally {
            long duration = System.currentTimeMillis() - startTime;

            // Construction du détail final
            StringBuilder fullDetails = new StringBuilder(details);
            fullDetails.append(" | Durée: ").append(duration).append("ms");
            if (!errorDetail.isEmpty()) {
                fullDetails.append(" | Erreur: ").append(errorDetail);
            }

            // Persistance asynchrone dans la base
            try {
                auditLogService.logAction(
                        actionType,
                        username,
                        "PATIENT_DATA",
                        fullDetails.toString(),
                        status.toLowerCase(),
                        clientIp
                );
            } catch (Exception auditEx) {
                // L'audit ne doit JAMAIS faire échouer la requête métier
                log.error("[AUDIT] Échec de persistance du log d'audit: {}", auditEx.getMessage());
            }

            log.debug("[AUDIT] {} | User: {} | Action: {} | IP: {} | Status: {} | {}ms",
                    fullMethod, username, actionType, clientIp, status, duration);
        }
    }

    /**
     * Extrait l'identifiant de l'utilisateur authentifié depuis le SecurityContext.
     * Fallback sur "ANONYMOUS" si non connecté.
     */
    private String getCurrentUsername() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null
                || !authentication.isAuthenticated()
                || "anonymousUser".equals(authentication.getPrincipal())) {
            return "ANONYMOUS";
        }
        return authentication.getName();
    }

    /**
     * Résout l'adresse IP réelle du client (gère les reverse-proxies comme Nginx/Render).
     */
    private String resolveClientIp() {
        try {
            ServletRequestAttributes attrs = (ServletRequestAttributes)
                    RequestContextHolder.getRequestAttributes();
            if (attrs == null) {
                return "unknown";
            }
            HttpServletRequest request = attrs.getRequest();

            // X-Forwarded-For = chaîne des proxies (premier = client originel)
            String xfHeader = request.getHeader("X-Forwarded-For");
            if (xfHeader != null && !xfHeader.isBlank()) {
                return xfHeader.split(",")[0].trim();
            }

            // Fallback
            return request.getRemoteAddr();
        } catch (Exception e) {
            return "unknown";
        }
    }

    /**
     * Déduit le type d'action CRUD à partir du nom de la méthode.
     */
    private String inferActionType(String methodName) {
        String lower = methodName.toLowerCase();
        if (lower.startsWith("get") || lower.startsWith("find") || lower.startsWith("list")
                || lower.startsWith("search") || lower.startsWith("view") || lower.startsWith("load")) {
            return "READ";
        }
        if (lower.startsWith("create") || lower.startsWith("save") || lower.startsWith("add")
                || lower.startsWith("post") || lower.startsWith("register") || lower.startsWith("book")) {
            return "CREATE";
        }
        if (lower.startsWith("update") || lower.startsWith("edit") || lower.startsWith("modify")
                || lower.startsWith("patch") || lower.startsWith("put") || lower.startsWith("change")) {
            return "UPDATE";
        }
        if (lower.startsWith("delete") || lower.startsWith("remove") || lower.startsWith("deactivate")
                || lower.startsWith("cancel")) {
            return "DELETE";
        }
        return "ACCESS";
    }

    /**
     * Construit une chaîne de détails avec le nom de la méthode et les arguments.
     * Les objets complexes sont tronqués pour éviter des logs gigantesques.
     */
    private String buildDetails(String fullMethod, Object[] args) {
        StringBuilder sb = new StringBuilder("Method: ").append(fullMethod);
        if (args == null || args.length == 0) {
            return sb.toString();
        }
        sb.append(" | Args: [");
        for (int i = 0; i < args.length; i++) {
            if (args[i] == null) {
                sb.append("null");
            } else {
                String argStr = args[i].toString();
                // Troncature à 120 caractères pour éviter les surcharges
                if (argStr.length() > 120) {
                    argStr = argStr.substring(0, 120) + "... (truncated)";
                }
                sb.append(argStr);
            }
            if (i < args.length - 1) {
                sb.append(", ");
            }
        }
        sb.append("]");
        return sb.toString();
    }
}
