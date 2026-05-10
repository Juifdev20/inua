# ============================================================
# SCRIPT DE FINALISATION DES MIGRATIONS FLYWAY
# Ce script nettoie toutes les migrations et garde un V1 complet
# ============================================================

param(
    [switch]$Execute = $false,  # Par défaut: simulation seule
    [switch]$KeepBackup = $true  # Garder une sauvegarde
)

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "FINALISATION DES MIGRATIONS FLYWAY" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$MigrationDir = "src\main\resources\db\migration"
$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$BackupDir = "backup-migrations-$Timestamp"

# Vérifier le répertoire
if (-not (Test-Path $MigrationDir)) {
    Write-Host "❌ ERREUR: Répertoire $MigrationDir introuvable" -ForegroundColor Red
    exit 1
}

# Liste tous les fichiers
$AllFiles = Get-ChildItem -Path $MigrationDir -Filter "*.sql" | Sort-Object Name
Write-Host "📁 Fichiers trouvés: $($AllFiles.Count)" -ForegroundColor Yellow
$AllFiles | ForEach-Object { Write-Host "   - $($_.Name)" -ForegroundColor Gray }
Write-Host ""

# ============================================================
# CATEGORISATION DES FICHIERS
# ============================================================

# Fichiers à supprimer (doublons, vides, problématiques)
$FilesToRemove = @(
    # Doublons et problèmes
    "V1__init_database.sql",                    # Doublon V1
    "V2__example_add_insurance_tables.sql",     # Exemple vide
    "V3__add_attente_paiement_labo_status.sql", # Vide (commentaires)
    "V5__Add_All_Missing_Currency_Columns.sql", # Vide (0 bytes)
    "V2025_04_25__Add_Currency_To_Services_And_LabTests.sql",      # Mauvais format + vide
    "V2025_04_25_01__Add_Currency_To_Services_And_LabTests.sql",   # Mauvais format
    "V2025_04_25_02__Add_Currency_To_Prescribed_Exams.sql",        # Mauvais format
    "V999__fix_invoice_status_constraint.sql",                     # Version trop haute
    "V1000__fix_invoice_status_constraint_again.sql"                # Version trop haute
)

# Fichiers à fusionner dans V1 (on va les supprimer aussi car leur contenu sera intégré)
$FilesToMerge = @(
    "V14__add_fiche_price_to_hospital_config.sql",
    "V15__create_revenues_table.sql",
    "V3__add_justificatif_url.sql",
    "V4__add_exam_total_amount.sql",
    "V4__fix_currency_columns.sql",
    "V5__create_consultation_services_table.sql",
    "V6__add_department_source_to_invoices.sql",
    "V7__add_document_content_columns.sql",
    "V1001__Add_All_Missing_Currency_Columns.sql"
)

# V1 à garder (mon fichier complet)
$V1ToKeep = "V1__init_schema.sql"

# ============================================================
# SIMULATION
# ============================================================

Write-Host "📋 ANALISE DU NETTOYAGE:" -ForegroundColor Yellow
Write-Host ""

Write-Host "Fichiers à SUPPRIMER (doublons/problèmes):" -ForegroundColor Red
$FilesToRemove | ForEach-Object {
    $path = Join-Path $MigrationDir $_
    if (Test-Path $path) {
        Write-Host "   ❌ $_" -ForegroundColor Red
    } else {
        Write-Host "   ⚠️  $_ (déjà supprimé)" -ForegroundColor Yellow
    }
}
Write-Host ""

Write-Host "Fichiers à FUSIONNER dans V1 (puis supprimer):" -ForegroundColor Magenta
$FilesToMerge | ForEach-Object {
    $path = Join-Path $MigrationDir $_
    if (Test-Path $path) {
        $size = (Get-Item $path).Length
        Write-Host "   📦 $_ ($size octets)" -ForegroundColor Magenta
    } else {
        Write-Host "   ⚠️  $_ (introuvable)" -ForegroundColor Yellow
    }
}
Write-Host ""

Write-Host "Fichier à CONSERVER:" -ForegroundColor Green
Write-Host "   ✅ $V1ToKeep (doit contenir toutes les tables)" -ForegroundColor Green
Write-Host ""

# Vérifier que V1__init_schema.sql existe
$V1Path = Join-Path $MigrationDir $V1ToKeep
if (-not (Test-Path $V1Path)) {
    Write-Host "❌ ERREUR CRITIQUE: $V1ToKeep introuvable!" -ForegroundColor Red
    exit 1
}

# Compter les lignes du V1
$V1Lines = (Get-Content $V1Path).Count
Write-Host "📊 $V1ToKeep contient $V1Lines lignes" -ForegroundColor Cyan
if ($V1Lines -lt 500) {
    Write-Host "⚠️  AVERTISSEMENT: Le fichier V1 semble incomplet (< 500 lignes)" -ForegroundColor Yellow
}
Write-Host ""

# ============================================================
# EXECUTION
# ============================================================

if (-not $Execute) {
    Write-Host "==========================================" -ForegroundColor Yellow
    Write-Host "MODE SIMULATION - Aucune action effectuée" -ForegroundColor Yellow
    Write-Host "==========================================" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Pour exécuter réellement le nettoyage:" -ForegroundColor White
    Write-Host "  .\scripts\finalize-migrations.ps1 -Execute" -ForegroundColor Cyan
    Write-Host ""
    exit 0
}

# Demande de confirmation
Write-Host "⚠️  Vous allez SUPPRIMER des fichiers de migration!" -ForegroundColor Red -BackgroundColor Yellow
$confirm = Read-Host "Tapez 'CONFIRMER' pour procéder au nettoyage"
if ($confirm -ne "CONFIRMER") {
    Write-Host "❌ Opération annulée" -ForegroundColor Yellow
    exit 0
}

# Créer le backup
if ($KeepBackup) {
    Write-Host "📦 Création de la sauvegarde..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
    Copy-Item -Path "$MigrationDir\*.sql" -Destination $BackupDir -Force
    Write-Host "   ✅ Sauvegarde créée: $BackupDir" -ForegroundColor Green
    Write-Host ""
}

# Supprimer les fichiers
Write-Host "🗑️  Suppression des fichiers..." -ForegroundColor Yellow

$totalRemoved = 0
$allFilesToRemove = $FilesToRemove + $FilesToMerge

foreach ($file in $allFilesToRemove) {
    $path = Join-Path $MigrationDir $file
    if (Test-Path $path) {
        Remove-Item $path -Force
        Write-Host "   ❌ Supprimé: $file" -ForegroundColor Red
        $totalRemoved++
    }
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "NETTOYAGE TERMINÉ" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Fichiers supprimés: $totalRemoved" -ForegroundColor Yellow
Write-Host "Fichier conservé: $V1ToKeep" -ForegroundColor Green
if ($KeepBackup) {
    Write-Host "Sauvegarde: $BackupDir" -ForegroundColor Cyan
}
Write-Host ""

# Vérification finale
$RemainingFiles = Get-ChildItem -Path $MigrationDir -Filter "*.sql"
Write-Host "📁 Fichiers restants: $($RemainingFiles.Count)" -ForegroundColor Cyan
$RemainingFiles | ForEach-Object { Write-Host "   ✅ $($_.Name)" -ForegroundColor Green }
Write-Host ""

Write-Host "✅ Vos migrations sont maintenant propres!" -ForegroundColor Green
Write-Host "   N'oubliez pas de tester en local avant de committer." -ForegroundColor White
