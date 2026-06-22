package com.hospital.backend.controller;

import com.hospital.backend.dto.InventairePharmaDTO;
import com.hospital.backend.entity.User;
import com.hospital.backend.repository.UserRepository;
import com.hospital.backend.security.CustomUserDetails;
import com.hospital.backend.service.InventairePharmaService;
import com.hospital.backend.security.HospitalTenantContext;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/pharmacie/inventaires")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Inventaire Pharmacie", description = "Gestion des inventaires de médicaments")
@CrossOrigin(origins = {
    "https://inuaafia.onrender.com",
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:8080"
})
public class InventairePharmaController {

    private final InventairePharmaService inventairePharmaService;
    private final UserRepository userRepository;

    // ─────────────────────────────────────────────────
    // GET /api/pharmacie/inventaires
    // ─────────────────────────────────────────────────

    @GetMapping
    @PreAuthorize("hasAnyRole('PHARMACY', 'PHARMACIE', 'PHARMACIST', 'ADMIN')")
    @Operation(summary = "Lister tous les inventaires")
    public ResponseEntity<List<InventairePharmaDTO>> listerInventaires() {
        try {
            List<InventairePharmaDTO> inventaires = inventairePharmaService.listerInventaires();
            return ResponseEntity.ok(inventaires);
        } catch (Exception e) {
            log.error("❌ Erreur listage inventaires: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    // ─────────────────────────────────────────────────
    // GET /api/pharmacie/inventaires/:id
    // ─────────────────────────────────────────────────

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('PHARMACY', 'PHARMACIE', 'PHARMACIST', 'ADMIN')")
    @Operation(summary = "Détail d'un inventaire avec ses lignes")
    public ResponseEntity<?> obtenirDetail(@PathVariable Long id) {
        try {
            InventairePharmaDTO dto = inventairePharmaService.obtenirDetail(id);
            return ResponseEntity.ok(dto);
        } catch (RuntimeException e) {
            if (e.getMessage().contains("introuvable")) {
                return ResponseEntity.notFound().build();
            }
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("❌ Erreur détail inventaire {}: {}", id, e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    // ─────────────────────────────────────────────────
    // POST /api/pharmacie/inventaires
    // ─────────────────────────────────────────────────

    @PostMapping
    @PreAuthorize("hasAnyRole('PHARMACY', 'PHARMACIE', 'PHARMACIST', 'ADMIN')")
    @Operation(summary = "Créer un inventaire et générer les lignes automatiquement")
    public ResponseEntity<?> creerInventaire(@RequestBody InventairePharmaDTO.CreerRequest request) {
        try {
            if (request.getType() == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Le type d'inventaire est obligatoire"));
            }
            Long agentId = getCurrentUserId();
            InventairePharmaDTO dto = inventairePharmaService.creerInventaire(request, agentId);
            return ResponseEntity.ok(dto);
        } catch (RuntimeException e) {
            log.warn("⚠️ Erreur création inventaire: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("❌ Erreur création inventaire: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    // ─────────────────────────────────────────────────
    // PUT /api/pharmacie/inventaires/:id/lignes
    // ─────────────────────────────────────────────────

    @PutMapping("/{id}/lignes")
    @PreAuthorize("hasAnyRole('PHARMACY', 'PHARMACIE', 'PHARMACIST', 'ADMIN')")
    @Operation(summary = "Sauvegarder le stock physique et les observations des lignes")
    public ResponseEntity<?> mettreAJourLignes(
            @PathVariable Long id,
            @RequestBody InventairePharmaDTO.MajLignesRequest request) {
        try {
            InventairePharmaDTO dto = inventairePharmaService.mettreAJourLignes(id, request);
            return ResponseEntity.ok(dto);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("❌ Erreur MAJ lignes inventaire {}: {}", id, e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    // ─────────────────────────────────────────────────
    // POST /api/pharmacie/inventaires/:id/soumettre
    // ─────────────────────────────────────────────────

    @PostMapping("/{id}/soumettre")
    @PreAuthorize("hasAnyRole('PHARMACY', 'PHARMACIE', 'PHARMACIST', 'ADMIN')")
    @Operation(summary = "Soumettre un inventaire pour approbation")
    public ResponseEntity<?> soumettre(@PathVariable Long id) {
        try {
            Long agentId = getCurrentUserId();
            InventairePharmaDTO dto = inventairePharmaService.soumettre(id, agentId);
            return ResponseEntity.ok(dto);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("❌ Erreur soumission inventaire {}: {}", id, e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    // ─────────────────────────────────────────────────
    // POST /api/pharmacie/inventaires/:id/approuver
    // ─────────────────────────────────────────────────

    @PostMapping("/{id}/approuver")
    @PreAuthorize("hasAnyRole('PHARMACY', 'PHARMACIE', 'PHARMACIST', 'ADMIN')")
    @Operation(summary = "Clôturer un inventaire et ajuster les stocks")
    public ResponseEntity<?> approuver(@PathVariable Long id) {
        try {
            Long chefId = getCurrentUserId();
            InventairePharmaDTO dto = inventairePharmaService.approuver(id, chefId);
            return ResponseEntity.ok(dto);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("❌ Erreur approbation inventaire {}: {}", id, e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    // ─────────────────────────────────────────────────
    // HELPER
    // ─────────────────────────────────────────────────

    private Long getCurrentUserId() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() instanceof CustomUserDetails) {
                return ((CustomUserDetails) auth.getPrincipal()).getUser().getId();
            }
            String username = auth != null ? auth.getName() : null;
            if (username != null) {
                return userRepository.findByUsername(username)
                        .map(User::getId)
                        .orElse(1L);
            }
        } catch (Exception e) {
            log.warn("⚠️ Impossible de récupérer l'ID utilisateur: {}", e.getMessage());
        }
        return 1L;
    }
}
