-- Migration Flyway : Ajout du statut ATTENTE_PAIEMENT_LABO pour le workflow labo
-- Ce statut permet de gérer la transition : EN_ATTENTE -> ATTENTE_PAIEMENT_LABO -> LABORATOIRE_EN_ATTENTE

-- Le statut ATTENTE_PAIEMENT_LABO est déjà géré au niveau de l'enum Java
-- Cette migration assure la cohérence si des données existent avec ce statut
-- et prépare la base de données pour les futures fonctionnalités de facturation labo

-- Vérification optionnelle : ne rien faire si la table consultations n'existe pas
-- La migration est principalement documentaire car le statut est géré par l'application Java
