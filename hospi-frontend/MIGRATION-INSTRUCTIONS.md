# 📋 Instructions de Migration Base de Données

## 🎯 Objectif
Ajouter la colonne `beneficiary_name` à la table `abonnement` en production.

## 🗄️ Scripts de Migration

### Pour PostgreSQL (Recommandé pour la production)
```bash
# Exécuter le script sur votre base PostgreSQL
psql -h votre-host -U votre-user -d votre-db < database-migration.sql
```

### Pour MySQL/MariaDB
```bash
# Exécuter le script sur votre base MySQL
mysql -h votre-host -u votre-user -p votre-db < database-migration-mysql.sql
```

### Pour SQLite (Développement uniquement)
```bash
# Exécuter le script sur votre base SQLite
sqlite3 votre-db.db < database-migration-sqlite.sql
```

## ⚠️ Instructions de Sécurité

### 1. **BACKUP OBLIGATOIRE**
```bash
# PostgreSQL
pg_dump votre-db > backup_$(date +%Y%m%d_%H%M%S).sql

# MySQL
mysqldump -u root -p votre-db > backup_$(date +%Y%m%d_%H%M%S).sql

# SQLite
cp votre-db.db backup_$(date +%Y%m%d_%H%M%S).db
```

### 2. **Vérification Pré-Migration**
```sql
-- Vérifier la structure actuelle de la table
\d abonnement  -- PostgreSQL
DESCRIBE abonnement;  -- MySQL
PRAGMA table_info(abonnement);  -- SQLite
```

### 3. **Test en Environnement de Staging**
- Toujours tester la migration sur un environnement de test
- Vérifier que l'application fonctionne correctement après la migration
- Tester les fonctionnalités liées aux abonnements

## 🔄 Post-Migration

### Vérification
```sql
-- Confirmer que la colonne a été ajoutée
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'abonnement' AND column_name = 'beneficiary_name';
```

### Mise à Jour Application
- Redémarrer l'application si nécessaire
- Vider les caches éventuels
- Tester les fonctionnalités d'abonnement

## 🚨 En Cas de Problème

### Rollback (si nécessaire)
```sql
-- Supprimer la colonne si problème
ALTER TABLE abonnement DROP COLUMN beneficiary_name;
```

### Restaurer depuis Backup
```bash
# PostgreSQL
psql -h votre-host -U votre-user -d votre-db < backup_fichier.sql

# MySQL
mysql -u root -p votre-db < backup_fichier.sql
```

## ✅ Checklist de Déploiement

- [ ] Backup de la base de données créé
- [ ] Migration testée en staging
- [ ] Script de migration choisi selon votre SGBD
- [ ] Migration exécutée en production
- [ ] Vérification de la colonne ajoutée
- [ ] Application testée
- [ ] Monitoring activé

---

**⚠️ N'oubliez pas : Toujours faire un backup avant toute modification en production !**
