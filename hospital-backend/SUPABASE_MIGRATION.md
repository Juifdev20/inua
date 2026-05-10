# Migration Supabase - Flux Pharmacie-Finance

## Prérequis

- Accès à votre projet Supabase
- PostgreSQL 14+ (Supabase utilise PostgreSQL)

## Méthode 1: Exécution via SQL Editor (Recommandé)

1. Connectez-vous à votre [Dashboard Supabase](https://app.supabase.com)
2. Allez dans **SQL Editor**
3. Cliquez sur **New Query**
4. Copiez-collez le contenu du fichier : `V2__supabase_flux_pharmacie_finance.sql`
5. Cliquez sur **Run**

## Méthode 2: Exécution via psql (Local)

```bash
# Installer psql si pas déjà fait (via PostgreSQL ou standalone)

# Se connecter à Supabase
psql "postgres://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres" \
  -f V2__supabase_flux_pharmacie_finance.sql
```

Remplacez:
- `[PASSWORD]`: Votre mot de passe base de données Supabase
- `[PROJECT_REF]`: La référence de votre projet (trouvable dans Settings > Database)

## Méthode 3: Via l'API Supabase (Programmatique)

```javascript
// Exemple avec Supabase JS Client
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  'https://[PROJECT_REF].supabase.co',
  '[SERVICE_ROLE_KEY]'
);

const sql = fs.readFileSync('V2__supabase_flux_pharmacie_finance.sql', 'utf8');

// Exécuter le SQL via rpc (nécessite une fonction côté serveur)
const { data, error } = await supabase.rpc('exec_sql', { query: sql });
```

## Vérification Post-Migration

Après exécution, vérifiez que les tables sont créées:

```sql
-- Liste des tables créées
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('caisses', 'finance_transactions');

-- Vérifier les caisses par défaut
SELECT * FROM public.caisses;

-- Test: Créer une transaction de test
INSERT INTO public.finance_transactions (
    type, status, paiement_mode, montant, devise, 
    categorie, reference_fournisseur, immutable
) VALUES (
    'DEPENSE', 'EN_ATTENTE_SCAN', 'CREDIT', 
    100000.00, 'CDF', 
    'Test', 'TEST-001', false
);

SELECT * FROM public.finance_transactions;

-- Nettoyer le test
DELETE FROM public.finance_transactions WHERE reference_fournisseur = 'TEST-001';
```

## Structure Créée

### Tables

| Table | Description |
|-------|-------------|
| `caisses` | Caisse physique USD ou CDF |
| `finance_transactions` | Transactions Pharmacie-Finance |

### Vues

| Vue | Description |
|-----|-------------|
| `dettes_fournisseurs` | Liste des dettes avec alertes priorité |
| `transactions_avec_avoir` | Transactions et leurs corrections |
| `solde_caisses` | Soldes consolidés par caisse |

### Politiques RLS (Row Level Security)

Si vous utilisez l'authentification Supabase, des politiques sont créées pour:
- Restreindre la modification aux rôles ADMIN/FINANCE/CAISSIER
- Permettre la lecture aux rôles appropriés

## Configuration Application

Mettez à jour votre `application.properties`:

```properties
# Supabase PostgreSQL
spring.datasource.url=jdbc:postgresql://db.[PROJECT_REF].supabase.co:5432/postgres
spring.datasource.username=postgres
spring.datasource.password=[VOTRE_PASSWORD]
spring.datasource.driver-class-name=org.postgresql.Driver

# JPA/Hibernate
spring.jpa.database-platform=org.hibernate.dialect.PostgreSQLDialect
spring.jpa.hibernate.ddl-auto=none  -- Important: désactiver, migrations manuelles
spring.jpa.show-sql=true

# Stockage fichiers (local ou Supabase Storage)
app.file.storage.path=uploads
app.file.base-url=https://[PROJECT_REF].supabase.co/storage/v1/object/public/factures
```

## Stockage des Scans (Optionnel - Supabase Storage)

Pour stocker les scans de factures sur Supabase Storage:

1. Créez un bucket `factures` dans Supabase Storage
2. Configurez les politiques d'accès
3. Modifiez `FileStorageService.java` pour utiliser le client Supabase Storage

```java
// Exemple d'intégration Supabase Storage
@Service
public class SupabaseStorageService {
    
    @Value("${supabase.url}")
    private String supabaseUrl;
    
    @Value("${supabase.service-key}")
    private String serviceKey;
    
    public String uploadFile(MultipartFile file, String bucket, String path) {
        // Utiliser le client Supabase Java
        // ou appeler l'API REST directement
    }
}
```

## Dépannage

### Erreur: "relation users does not exist"

Si vous n'avez pas de table `users`, modifiez le script pour retirer les FK:

```sql
-- Version sans FK vers users
managed_by BIGINT,  -- au lieu de: REFERENCES public.users(id)
```

### Erreur: "permission denied"

Vérifiez que vous exécutez le SQL avec un rôle ayant les droits CREATE TABLE.

### Vérifier la connexion

```sql
-- Dans SQL Editor Supabase
SELECT current_user, current_database();
```

## Support

En cas de problème:
1. Vérifiez les logs dans Supabase Dashboard > Logs
2. Testez les requêtes individuellement dans SQL Editor
3. Vérifiez que votre schéma public existe: `SELECT schema_name FROM information_schema.schemata;`
