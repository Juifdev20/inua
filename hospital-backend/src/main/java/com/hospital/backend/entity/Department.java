package com.hospital.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import java.util.List;

@Entity
@Table(name = "departments")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Department {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "nom", nullable = false)
    private String nom;

    @Column(columnDefinition = "TEXT")
    private String description;

    private String chef;

    @Column(name = "nombre_personnel")
    private Integer nombrePersonnel;

    @Column(name = "nombre_lits")
    private Integer nombreLits;

    private String etage;
    private String telephone;

    @Builder.Default
    private boolean actif = true;

    /**
     * ✅ AJOUT CRUCIAL : Relation inverse vers les utilisateurs.
     * mappedBy = "department" fait référence au champ "private Department department" dans User.java.
     */
    @OneToMany(mappedBy = "department", fetch = FetchType.LAZY)
    @JsonIgnore // Évite complètement la sérialisation pour prévenir les boucles infinies
    private List<User> users;

    /**
     * ✅ MÉTHODE DYNAMIQUE : Pour obtenir le nombre réel d'utilisateurs.
     * Dans ton frontend, tu pourras utiliser 'utilisateursCount' au lieu d'une colonne fixe.
     */
    @Transient // Ne crée pas de colonne en base de données
    @JsonIgnore // Évite la sérialisation JSON qui déclencherait le lazy loading
    public int getUtilisateursCount() {
        return (users != null) ? users.size() : 0;
    }
}
