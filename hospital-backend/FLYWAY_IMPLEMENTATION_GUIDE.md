# 🚀 Guide d'Implémentation Flyway - INUA AFYA Hospital

Ce guide explique comment migrer de `ddl-auto=update` vers **Flyway** pour une gestion robuste du schéma de base de données.

---

## 📋 Table des matières

1. [Pourquoi Flyway ?](#1-pourquoi-flyway-)
2. [Structure des fichiers](#2-structure-des-fichiers)
3. [Processus de déploiement](#3-processus-de-déploiement)
4. [Commandes utiles](#4-commandes-utiles)
5. [Résolution des problèmes](#5-résolution-des-problèmes)

---

## 1. Pourquoi Flyway ?

| Problème avec `ddl-auto=update` | Solution Flyway |
|--------------------------------|-----------------|
| Modification automatique imprévisible du schéma | Contrôle total via scripts SQL versionnés |
| Aucune traçabilité des changements | Historique complet dans `flyway_schema_history` |
| Risque de perte de données en production | Validation stricte, pas de suppression accidentelle |
| Difficile à synchroniser entre environnements | Mêmes scripts appliqués partout dans le même ordre |
| Pas de rollback possible | Chaque état est versionné et reproductible |

---

## 2. Structure des fichiers

```
src/main/resources/
├── application.properties          # Configuration générale
├── application-local.properties   # Local + Flyway config
├── application-prod.properties    # Production + Flyway config
└── db/
    └── migration/
        ├── V1__init_schema.sql    # ✅ Baseline (créé)
        ├── V2__add_feature.sql    # Future migration
        ├── V3__fix_issue.sql      # Future migration
        └── ...
```

### Règle de nommage des migrations (TRÈS STRICTE)

```
V{numéro}__{description}.sql

Exemples valides:
✅ V1__init_schema.sql
✅ V2__add_pharmacy_table.sql
✅ V3__add_currency_columns.sql
✅ V4.1__fix_indexes.sql

Exemples INVALIDES:
❌ v1_init.sql                    (minuscule v, pas de __)
❌ V1_init.sql                    (un seul _)
❌ V01__init.sql                  (zéro non significatif)
❌ V2__add pharmacy table.sql     (espaces dans le nom)
❌ 2_init.sql                     (pas de V)
```

---

## 3. Processus de déploiement

### 🎯 Scénario A : Nouvelle base de données (Local/Dev)

**Étapes:**
1. Flyway détecte que la table `flyway_schema_history` n'existe pas
2. Il crée cette table de suivi
3. Il exécute **V1__init_schema.sql** → toutes les tables sont créées
4. Il enregistre la migration comme "appliquée"
5. L'application démarre normalement

**Configuration nécessaire (`application-local.properties`):**
```properties
spring.flyway.enabled=true
spring.flyway.baseline-on-migrate=true
spring.flyway.baseline-version=1
```

### 🎯 Scénario B : Base de données existante (Production/Supabase)

**⚠️ CRITIQUE : Vos tables existent déjà !**

**Étapes:**
1. **Sauvegarde complète** de la base de données
2. Activer `baseline-on-migrate=true` pour la première fois uniquement
3. Flyway crée `flyway_schema_history` et marque V1 comme "déjà appliquée" (sans l'exécuter)
4. Les migrations futures (V2, V3...) seront exécutées normalement
5. **Après le premier déploiage réussi**, désactiver `baseline-on-migrate`

**Configuration temporaire (premier déploiage):**
```properties
spring.flyway.baseline-on-migrate=true   # ✅ Uniquement cette fois
spring.flyway.baseline-version=1
```

**Configuration définitive:**
```properties
spring.flyway.baseline-on-migrate=false  # ❌ Désactiver après
```

---

## 4. Commandes utiles

### Lancer l'application en local
```bash
# Depuis la racine du projet backend
./mvnw spring-boot:run -Dspring-boot.run.profiles=local

# Ou avec Maven Wrapper Windows
mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=local
```

### Voir les logs de migration
```bash
# Les logs apparaissent au démarrage
grep -i "flyway" logs/application.log
```

### Vérifier l'état des migrations (SQL)
```sql
-- Voir l'historique des migrations appliquées
SELECT * FROM flyway_schema_history ORDER BY installed_rank;

-- Voir la dernière migration
SELECT * FROM flyway_schema_history 
WHERE success = true 
ORDER BY installed_rank DESC 
LIMIT 1;
```

### Forcer une réparation (si une migration échoue)
```java
// Dans Spring Boot, créer un bean de configuration
@Bean
public FlywayMigrationStrategy repairStrategy() {
    return flyway -> {
        flyway.repair();
        flyway.migrate();
    };
}
```

Ou avec Maven (si Flyway plugin configuré):
```bash
./mvnw flyway:repair
./mvnw flyway:migrate
```

---

## 5. Résolution des problèmes

### ❌ Erreur : "Table X already exists"

**Cause:** Flyway tente d'exécuter V1 mais les tables existent déjà.

**Solution:**
```properties
# Activer baseline pour ignorer les tables existantes
spring.flyway.baseline-on-migrate=true
spring.flyway.baseline-version=1
```

### ❌ Erreur : "Validate failed: Migration checksum mismatch"

**Cause:** Vous avez modifié un script déjà appliqué.

**Solution 1 (Recommandée):** Créer une nouvelle migration pour corriger
```sql
-- V2__fix_column_type.sql (au lieu de modifier V1)
ALTER TABLE table_name ALTER COLUMN column_name TYPE new_type;
```

**Solution 2 (Urgence seulement):** Réparer l'historique
```sql
-- Réinitialiser le checksum (DANGEREUX en production)
UPDATE flyway_schema_history 
SET checksum = NULL 
WHERE version = '1';
```

### ❌ Erreur : "Found non-empty schema(s) without metadata table"

**Cause:** Base existante sans historique Flyway, et `baseline-on-migrate=false`.

**Solution:**
```properties
spring.flyway.baseline-on-migrate=true
```

### ❌ Erreur : "Out of order migration detected"

**Cause:** Une migration avec un numéro inférieur a été ajoutée après.

**Solution:**
```properties
# Autoriser temporairement (déconseillé en production)
spring.flyway.out-of-order=true
```

Ou mieux : respecter la séquence numérique.

---

## 📝 Créer une nouvelle migration

### Étape 1 : Déterminer le prochain numéro
```sql
-- Voir le dernier numéro utilisé
SELECT MAX(version) FROM flyway_schema_history;
-- Résultat: "1" → prochain: V2__...
```

### Étape 2 : Créer le fichier
```bash
touch src/main/resources/db/migration/V2__ajouter_colonne_telephone.sql
```

### Étape 3 : Écrire le script
```sql
-- V2__ajouter_colonne_telephone.sql
-- Ajout du téléphone portable pour les patients

ALTER TABLE patients 
ADD COLUMN IF NOT EXISTS mobile_phone VARCHAR(50);

-- Index pour les recherches rapides
CREATE INDEX IF NOT EXISTS idx_patients_mobile 
ON patients(mobile_phone);

COMMENT ON COLUMN patients.mobile_phone IS 'Numéro de téléphone portable';
```

### Étape 4 : Redémarrer l'application
Flyway détecte automatiquement et exécute la nouvelle migration.

---

## 🔒 Sécurité et bonnes pratiques

### ✅ À FAIRE

1. **Toujours tester les migrations en local d'abord**
2. **Sauvegarder la base avant chaque déploiement**
3. **Utiliser `IF EXISTS` / `IF NOT EXISTS`** dans les scripts
4. **Ne jamais modifier une migration déjà appliquée**
5. **Versionner les fichiers de migration** (Git)
6. **Documenter les changements** dans le nom du fichier

### ❌ À ÉVITER

1. **Ne jamais utiliser `spring.flyway.clean-enabled=true`** en production
2. **Ne jamais supprimer manuellement** des lignes de `flyway_schema_history`
3. **Ne jamais modifier** un script V1, V2... déjà en production
4. **Ne jamais faire de `DROP TABLE`** sans sauvegarde

---

## 🔄 Workflow de développement recommandé

```
1. Développement local
   ├── Créer branche feature/xxx
   ├── Écrire la migration V{N}__xxx.sql
   ├── Tester en local (spring-boot:run)
   └── Vérifier les logs Flyway

2. Code Review
   ├── Relire le script SQL
   ├── Vérifier le numéro de version
   └── Valider la logique de migration

3. Déploiement staging
   ├── Sauvegarde DB staging
   ├── Déployer l'application
   └── Vérifier flyway_schema_history

4. Déploiement production
   ├── 🔴 SAUVEGARDE COMPLÈTE DB
   ├── Déployer l'application
   ├── Surveiller les logs
   └── Vérifier flyway_schema_history
```

---

## 📊 Table flyway_schema_history

Flyway maintient automatiquement cette table pour tracer les migrations:

| Colonne | Description |
|---------|-------------|
| `installed_rank` | Ordre d'exécution |
| `version` | Numéro de version (V1, V2...) |
| `description` | Description du fichier |
| `type` | Type (SQL, JDBC, etc.) |
| `script` | Nom du fichier |
| `checksum` | Hash pour détecter les modifications |
| `installed_by` | Utilisateur qui a appliqué |
| `installed_on` | Date d'application |
| `execution_time` | Durée en ms |
| `success` | true/false |

---

## 📞 Support

En cas de problème:
1. Consulter les logs de démarrage Spring Boot
2. Vérifier `flyway_schema_history`
3. Vérifier que les scripts sont dans `src/main/resources/db/migration`
4. Vérifier le nommage des fichiers (V + nombre + __ + nom.sql)

---

**Documentation officielle:** https://documentation.red-gate.com/flyway
