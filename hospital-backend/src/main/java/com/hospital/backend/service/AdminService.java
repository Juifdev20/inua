package com.hospital.backend.service;

import com.hospital.backend.dto.ProfileUpdateRequest;
import com.hospital.backend.entity.Admin;
import com.hospital.backend.repository.AdminRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminService {

    @Autowired
    private AdminRepository adminRepository;

    /**
     * ✅ Met à jour les informations de profil d'un administrateur
     */
    @Transactional
    public Admin updateAdminProfile(Long id, ProfileUpdateRequest request) {
        // 1. Chercher l'admin en base de données
        Admin admin = adminRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Erreur : Administrateur non trouvé avec l'ID : " + id));

        // 2. Vérifier si le nouvel email est déjà utilisé par quelqu'un d'autre
        if (!admin.getEmail().equals(request.getEmail()) && adminRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Erreur : Cet email est déjà utilisé par un autre compte.");
        }

        // 3. Mettre à jour les champs autorisés
        admin.setPrenom(request.getPrenom());
        admin.setNom(request.getNom());
        admin.setEmail(request.getEmail());
        admin.setTelephone(request.getTelephone());

        // 4. Enregistrer les modifications
        return adminRepository.save(admin);
    }

    /**
     * ✅ Récupérer un admin par son ID (pour l'affichage initial)
     */
    public Admin getAdminById(Long id) {
        return adminRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Admin non trouvé"));
    }
}