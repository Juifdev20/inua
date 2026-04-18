# Flux Pharmacie-Finance - Documentation

## Vue d'ensemble

Ce module synchronise automatiquement la gestion de stock (Pharmacie) avec la comptabilité (Finance). Chaque achat de médicaments génère une transaction comptable en attente de validation par le caissier.

## Architecture

```
┌─────────────┐      Achat médicament      ┌─────────────────────┐
│  Pharmacie  │  ───────────────────────→  │ FinanceTransaction  │
│   (achat)   │                            │   EN_ATTENTE_SCAN   │
└─────────────┘                            └─────────────────────┘
                                                    │
                                                    ↓ Notification WebSocket
                                           ┌─────────────────────┐
                                           │  Caissier upload    │
                                           │  scan + validation  │
                                           └─────────────────────┘
                                                    │
                              ┌─────────────────────┴─────────────────────┐
                              ↓                                           ↓
                    ┌─────────────────┐                      ┌─────────────────┐
                    │   IMMÉDIAT      │                      │     CRÉDIT    │
                    │ Décaissement    │                      │ Dette enreg.  │
                    │    Caisse       │                      │ A payer plus  │
                    │   (PAYE)        │                      │   tard        │
                    └─────────────────┘                      └─────────────────┘
```

## Workflow Transactionnel

### 1. Création (Pharmacie)

Lorsqu'un pharmacien effectue un achat de médicaments, le système crée automatiquement une transaction avec:
- **Status**: `EN_ATTENTE_SCAN`
- **Type**: `DEPENSE`
- **Mode paiement**: `CREDIT` (par sécurité)
- **Immutable**: `false`

### 2. Validation (Caissier)

Le caissier doit:
1. **Uploader le scan de la facture fournisseur** (obligatoire)
2. **Choisir le mode de paiement**:
   - **IMMÉDIAT**: Décaissement immédiat de la caisse
   - **CRÉDIT**: Dette enregistrée, paiement différé

Après validation, la transaction devient **immutable**.

### 3. Paiement différé (si crédit)

Pour les dettes (`A_PAYER`), le caissier peut effectuer le paiement plus tard via l'endpoint `POST /api/finance/transactions/{id}/payer`.

## Règles Métier

| Règle | Description |
|-------|-------------|
| **Scan obligatoire** | Aucune validation sans scan de facture |
| **Pas de suppression** | Erreur = contre-passation (avoir) |
| **Immuable après validation** | Transaction validée = non modifiable |
| **Double devise** | CDF et USD gérés séparément |
| **Traçabilité complète** | Lien commande pharmacie ↔ transaction |

## API Endpoints

### Transactions

```http
# Liste des dépenses en attente
GET /api/finance/transactions/en-attente

# Liste des dettes fournisseurs
GET /api/finance/transactions/dettes-fournisseurs

# Valider une dépense (scan obligatoire)
POST /api/finance/transactions/{id}/valider
Content-Type: multipart/form-data

# Payer une dette
POST /api/finance/transactions/{id}/payer?caisseId={caisseId}

# Créer un avoir (correction)
POST /api/finance/transactions/{id}/corriger

# Traiter un retour fournisseur
POST /api/finance/transactions/retour-fournisseur

# Liste des caisses
GET /api/finance/transactions/caisses
```

### Pharmacie (modifié)

```http
# Achat médicament (crée automatiquement transaction)
POST /api/pharmacy/medications/{id}/purchase
```

## Types de Transactions

| Type | Description | Montant |
|------|-------------|---------|
| `DEPENSE` | Achat normal de médicaments | Positif |
| `AVOIR` | Correction d'une transaction erronée | Négatif |
| `RETOUR_FOURNISSEUR` | Retour de médicaments | Négatif |

## Statuts

| Statut | Description | Action possible |
|--------|-------------|-----------------|
| `EN_ATTENTE_SCAN` | Créée, scan manquant | Validation avec upload |
| `A_PAYER` | Crédit validé, attente paiement | Payer la dette |
| `PAYE` | Décaissement effectué | Aucune (immutable) |
| `CONTRE_PASSEE` | Annulée par avoir | Aucune (immutable) |

## Exceptions

| Exception | HTTP | Description |
|-----------|------|-------------|
| `SoldeInsuffisantException` | 400 | Caisse sans fonds suffisants |
| `TransactionImmutableException` | 409 | Transaction déjà validée/annulée |
| `ScanFactureRequisException` | 400 | Scan manquant pour validation |
| `TransactionExistanteException` | 409 | Doublon détecté |

## Base de Données

### Tables principales

```sql
-- Caisses (USD/CDF)
caisses (id, nom, devise, solde, active, ...)

-- Transactions liées à la pharmacie
finance_transactions (id, type, status, montant, devise, 
                      commande_pharmacie_id, caisse_id, ...)
```

### Vues SQL

- `dettes_fournisseurs`: Liste des dettes avec alertes de priorité
- `transaction_avec_avoir`: Transactions et leurs corrections

## Configuration

### Application.properties

```properties
# Stockage des scans
tapp.file.storage.path=uploads
app.file.base-url=http://localhost:8080/api/files
```

### Création des caisses initiales

Les migrations créent automatiquement:
- Caisse Principale CDF
- Caisse Principale USD

## Tests

### Scénario 1: Achat immédiat
1. Pharmacien achète médicaments (→ transaction créée EN_ATTENTE_SCAN)
2. Caissier upload scan + choisit IMMÉDIAT + sélectionne caisse
3. Décaissement effectué, statut PAYE

### Scénario 2: Achat crédit
1. Pharmacien achète médicaments (→ transaction créée)
2. Caissier upload scan + choisit CRÉDIT
3. Statut A_PAYER, pas de décaissement
4. Plus tard: caissier paie la dette → statut PAYE

### Scénario 3: Correction
1. Transaction PAYE détectée erronée
2. Admin crée avoir via `/corriger`
3. Avoir créé (montant négatif), originale marquée CONTRE_PASSEE
4. Caisse créditée si paiement immédiat

### Scénario 4: Retour fournisseur
1. Pharmacien signale retour médicaments
2. Stock débité automatiquement
3. Avoir créé automatiquement
4. Caisse créditée (si PAYE) ou dette réduite (si A_PAYER)

## Développement Futur

- [ ] Tableau de bord des dettes fournisseurs
- [ ] Alertes automatiques (dettes en retard)
- [ ] Export comptable (FEC)
- [ ] Multi-caisses par devise
- [ ] Historique des mouvements de caisse

## Auteur

Module développé pour Inua - Système Hospitalier
Date: Avril 2024
