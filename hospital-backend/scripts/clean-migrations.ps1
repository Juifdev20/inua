# ============================================================
# SCRIPT DE NETTOYAGE DES MIGRATIONS FLYWAY
# ============================================================

param(
    [switch]$Execute = $false
)

# Se positionner dans la racine du projet
$ScriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptPath
Set-Location $ProjectRoot

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "NETTOYAGE DES MIGRATIONS FLYWAY" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Repertoire projet: $ProjectRoot" -ForegroundColor Gray
Write-Host ""

$MigrationDir = "src\main\resources\db\migration"
$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$BackupDir = "backup-migrations-$Timestamp"

if (-not (Test-Path $MigrationDir)) {
    Write-Host "ERREUR: Repertoire $MigrationDir introuvable" -ForegroundColor Red
    exit 1
}

# Liste tous les fichiers
$AllFiles = Get-ChildItem -Path $MigrationDir -Filter "*.sql" | Sort-Object Name
Write-Host "Fichiers trouves: $($AllFiles.Count)" -ForegroundColor Yellow
$AllFiles | ForEach-Object { Write-Host "   - $($_.Name)" -ForegroundColor Gray }
Write-Host ""

# Fichiers a supprimer
$FilesToRemove = @(
    "V1__init_database.sql",
    "V2__example_add_insurance_tables.sql",
    "V3__add_attente_paiement_labo_status.sql",
    "V5__Add_All_Missing_Currency_Columns.sql",
    "V2025_04_25__Add_Currency_To_Services_And_LabTests.sql",
    "V2025_04_25_01__Add_Currency_To_Services_And_LabTests.sql",
    "V2025_04_25_02__Add_Currency_To_Prescribed_Exams.sql",
    "V999__fix_invoice_status_constraint.sql",
    "V1000__fix_invoice_status_constraint_again.sql",
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

Write-Host "ANALYSE DU NETTOYAGE:" -ForegroundColor Yellow
Write-Host ""
Write-Host "Fichiers a SUPPRIMER:" -ForegroundColor Red
$FilesToRemove | ForEach-Object {
    $path = Join-Path $MigrationDir $_
    if (Test-Path $path) {
        Write-Host "   [SUPPRIMER] $_" -ForegroundColor Red
    }
}
Write-Host ""

Write-Host "Fichier a CONSERVER:" -ForegroundColor Green
Write-Host "   [CONSERVER] V1__init_schema.sql" -ForegroundColor Green
Write-Host ""

# Verification
$V1Path = Join-Path $MigrationDir "V1__init_schema.sql"
if (-not (Test-Path $V1Path)) {
    Write-Host "ERREUR CRITIQUE: V1__init_schema.sql introuvable!" -ForegroundColor Red
    exit 1
}

$V1Lines = (Get-Content $V1Path).Count
Write-Host "V1__init_schema.sql contient $V1Lines lignes" -ForegroundColor Cyan
Write-Host ""

# Mode simulation
if (-not $Execute) {
    Write-Host "==========================================" -ForegroundColor Yellow
    Write-Host "MODE SIMULATION - Aucune action effectuee" -ForegroundColor Yellow
    Write-Host "==========================================" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Pour executer reellement:" -ForegroundColor White
    Write-Host "  .\scripts\clean-migrations.ps1 -Execute" -ForegroundColor Cyan
    Write-Host ""
    exit 0
}

# Confirmation (auto-confirme en mode -Execute)
if (-not $Execute) {
    Write-Host "ATTENTION: Mode simulation - aucune action effectuee" -ForegroundColor Yellow
    exit 0
}
Write-Host "ATTENTION: Suppression des fichiers..." -ForegroundColor Red

# Backup
Write-Host "Creation de la sauvegarde..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
Copy-Item -Path "$MigrationDir\*.sql" -Destination $BackupDir -Force
Write-Host "Sauvegarde creee: $BackupDir" -ForegroundColor Green
Write-Host ""

# Suppression
Write-Host "Suppression des fichiers..." -ForegroundColor Yellow
$totalRemoved = 0
foreach ($file in $FilesToRemove) {
    $path = Join-Path $MigrationDir $file
    if (Test-Path $path) {
        Remove-Item $path -Force
        Write-Host "   Supprime: $file" -ForegroundColor Red
        $totalRemoved++
    }
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "NETTOYAGE TERMINE" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Fichiers supprimes: $totalRemoved" -ForegroundColor Yellow
Write-Host "Fichier conserve: V1__init_schema.sql" -ForegroundColor Green
Write-Host "Sauvegarde: $BackupDir" -ForegroundColor Cyan
Write-Host ""

# Verification finale
$RemainingFiles = Get-ChildItem -Path $MigrationDir -Filter "*.sql"
Write-Host "Fichiers restants: $($RemainingFiles.Count)" -ForegroundColor Cyan
$RemainingFiles | ForEach-Object { Write-Host "   - $($_.Name)" -ForegroundColor Green }
Write-Host ""
Write-Host "Vos migrations sont maintenant propres!" -ForegroundColor Green
