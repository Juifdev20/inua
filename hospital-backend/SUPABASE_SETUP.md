# Configuration Supabase pour Inua

## Étape 1: Créer votre projet Supabase

1. Allez sur [supabase.com](https://supabase.com) et créez un compte
2. Créez un nouveau projet (nommez-le `inua-hospital`)
3. Attendez la fin de la mise en place (2-3 minutes)
4. Notez votre **Project URL** et **anon/public key**

## Étape 2: Récupérer les informations de connexion

Dans votre Dashboard Supabase:
1. Allez dans **Settings** (icône ⚙️ en bas à gauche)
2. Cliquez sur **Database**
3. Notez:
   - **Host**: `db.xxxxxxxxxxxxxxx.supabase.co`
   - **Database**: `postgres`
   - **Port**: `5432`
   - **User**: `postgres`
4. Cliquez sur **Reset database password** pour définir un mot de passe

## Étape 3: Exécuter la migration SQL

### Option A: Via SQL Editor (Recommandé)

1. Dans Supabase Dashboard, allez dans **SQL Editor**
2. Cliquez sur **New Query**
3. Ouvrez le fichier: `src/main/resources/db/migration/V2__supabase_minimal.sql`
4. Copiez-collez tout le contenu dans l'éditeur
5. Cliquez sur **Run** ▶️
6. Vérifiez: vous devriez voir "Success" et les tables créées

### Option B: Via psql (Terminal)

```bash
# Mac/Linux
psql "postgres://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres" -f src/main/resources/db/migration/V2__supabase_minimal.sql

# Windows (avec psql installé)
psql -h db.[PROJECT_REF].supabase.co -p 5432 -U postgres -d postgres -f src\main\resources\db\migration\V2__supabase_minimal.sql
```

Remplacez:
- `[PASSWORD]`: Votre mot de passe Supabase
- `[PROJECT_REF]`: La référence dans l'URL (ex: `abcdefgh12345678`)

## Étape 4: Configurer l'application

### 4.1 Modifier `application.properties`

Remplacez la section BASE DE DONNÉES par:

```properties
# ===============================
# BASE DE DONNÉES SUPABASE
# ===============================
spring.datasource.url=jdbc:postgresql://db.[PROJECT_REF].supabase.co:5432/postgres
spring.datasource.username=postgres
spring.datasource.password=VOTRE_MOT_DE_PASSE
spring.datasource.driver-class-name=org.postgresql.Driver

# HikariCP - Pool de connexions
spring.datasource.hikari.connection-timeout=30000
spring.datasource.hikari.minimum-idle=2
spring.datasource.hikari.maximum-pool-size=10
spring.datasource.hikari.idle-timeout=300000
spring.datasource.hikari.max-lifetime=1200000

# JPA/Hibernate
spring.jpa.hibernate.ddl-auto=none  # Important: migrations manuelles
spring.jpa.database-platform=org.hibernate.dialect.PostgreSQLDialect
spring.jpa.show-sql=true
```

### 4.2 Ou utiliser un profil Spring

Créez un fichier `application-supabase.properties` (déjà créé) et lancez avec:

```bash
# Maven
mvn spring-boot:run -Dspring-boot.run.profiles=supabase

# Ou dans application.properties
spring.profiles.active=supabase
```

## Étape 5: Vérifier la connexion

### Test via SQL Editor

```sql
-- Vérifier les tables créées
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';

-- Vérifier les caisses
SELECT * FROM caisses;

-- Test: Créer une transaction
INSERT INTO finance_transactions (
    type, status, paiement_mode, montant, devise, 
    categorie, reference_fournisseur, immutable
) VALUES (
    'DEPENSE', 'EN_ATTENTE_SCAN', 'CREDIT', 
    50000.00, 'CDF', 
    'Test configuration', 'TEST-CONFIG', false
);

-- Vérifier
SELECT * FROM finance_transactions;

-- Nettoyer
DELETE FROM finance_transactions WHERE reference_fournisseur = 'TEST-CONFIG';
```

### Test via l'application

1. Démarrez l'application: `mvn spring-boot:run`
2. Vérifiez les logs:
   - "Database: PostgreSQL" doit apparaître
   - Pas d'erreur de connexion
3. Testez l'endpoint: `GET http://localhost:8080/api/finance/transactions/caisses`

## Étape 6: Configuration Production (Render/Railway/etc)

Si vous déployez sur Render ou Railway:

### 6.1 Variables d'environnement

Dans votre dashboard Render/Railway:

```
SPRING_DATASOURCE_URL=jdbc:postgresql://db.[PROJECT_REF].supabase.co:5432/postgres
SPRING_DATASOURCE_USERNAME=postgres
SPRING_DATASOURCE_PASSWORD=votre_mot_de_passe
SPRING_JPA_HIBERNATE_DDL_AUTO=none
```

### 6.2 Ou utiliser Connection Pooler Supabase (Recommandé)

Pour éviter les problèmes de connexion, utilisez le **Connection Pooler**:

```
spring.datasource.url=jdbc:postgresql://db.[PROJECT_REF].supabase.co:6543/postgres?pgbouncer=true
```

Note: Le port `6543` est le pooler de connexions Supabase.

## Dépannage

### Erreur: "Connection refused"

Vérifiez:
- Le projet Supabase est bien "Active" (pas en pause)
- Le mot de passe est correct
- Le port 5432 est ouvert dans votre firewall (pour développement local)

### Erreur: "SSL connection is required"

Ajoutez `sslmode=require` à l'URL:

```properties
spring.datasource.url=jdbc:postgresql://db.[PROJECT_REF].supabase.co:5432/postgres?sslmode=require
```

### Erreur: "relation X does not exist"

Les tables n'ont pas été créées. Re-exécutez le script SQL:

1. Connectez-vous au SQL Editor
2. Exécutez: `SELECT * FROM caisses;`
3. Si erreur "relation does not exist", exécutez la migration

### Erreur: "too many connections"

Réduisez le pool de connexions:

```properties
spring.datasource.hikari.maximum-pool-size=3
spring.datasource.hikari.minimum-idle=1
```

Ou utilisez le port pooler (6543).

## Structure des Tables

Après migration, vous avez:

### Tables
- `caisses`: Caisses USD/CDF avec solde
- `finance_transactions`: Transactions Pharmacie-Finance

### Vues
- `dettes_fournisseurs`: Dettes avec alertes de priorité
- `transactions_avec_avoir`: Transactions et leurs corrections

### Données initiales
- Caisse Principale CDF (solde: 0)
- Caisse Principale USD (solde: 0)

## Prochaines Étapes

1. ✅ Exécuter la migration SQL
2. ✅ Configurer `application.properties`
3. ✅ Tester la connexion
4. ➡️ Tester l'achat médicament (création auto transaction)
5. ➡️ Tester la validation caissier

## Support

Problèmes courants:
- **Timeout**: Vérifiez votre connexion internet
- **Permission denied**: Vérifiez le mot de passe
- **Table existe déjà**: Le script utilise `IF NOT EXISTS`, ignorez l'erreur

Documentation Supabase:
- [Connexion PostgreSQL](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [Connection Pooler](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)
