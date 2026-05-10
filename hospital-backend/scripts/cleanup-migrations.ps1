# ============================================================
# SCRIPT DE NETTOYAGE DES MIGRATIONS FLYWAY
# PowerShell - Exécuter avec: .\scripts\cleanup-migrations.ps1
# ============================================================

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "NETTOYAGE DES MIGRATIONS FLYWAY" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$MigrationDir = "src\main\resources\db\migration"

if (-not (Test-Path $MigrationDir)) {
    Write-Host "ERREUR: Repertoire $MigrationDir introuvable" -ForegroundColor Red
    exit 1
}

# Liste toutes les migrations
$AllFiles = Get-ChildItem -Path $MigrationDir -Filter "V*.sql" | Sort-Object Name

Write-Host "Migrations trouvees: $($AllFiles.Count)" -ForegroundColor Yellow
$AllFiles | ForEach-Object { 
    $color = if ($_.Name -match "V1__") { "Red" } else { "Gray" }
    Write-Host "  - $($_.Name)" -ForegroundColor $color
}
Write-Host ""

# ============================================================
# ANALYSE DES DOUBLONS
# ============================================================
Write-Host "ANALYSE DES VERSIONS..." -ForegroundColor Yellow

$VersionGroups = $AllFiles | Group-Object { 
    if ($_.Name -match "V(\d+)__") { $matches[1] } else { "AUTRE" }
}

$Duplicates = $VersionGroups | Where-Object { $_.Count -gt 1 }

if ($Duplicates) {
    Write-Host ""
    Write-Host "ALERTE: Versions en doublon detectees!" -ForegroundColor Red
    foreach ($dup in $Duplicates) {
        Write-Host "  Version V$($dup.Name): $($dup.Count) fichiers" -ForegroundColor Red
        $dup.Group | ForEach-Object { 
            Write-Host "    - $($_.Name)" -ForegroundColor Yellow
        }
    }
}
Write-Host ""

# ============================================================
# RECOMMANDATIONS
# ============================================================
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "RECOMMANDATIONS" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Option 1 - CONSERVEZ VOS MIGRATIONS EXISTANTES:" -ForegroundColor Green
Write-Host "  1. Supprimez le V1__init_schema.sql que je viens de creer" -ForegroundColor White
Write-Host "  2. Gardez votre V1__init_database.sql" -ForegroundColor White
Write-Host "  3. Utilisez les migrations existantes" -ForegroundColor White
Write-Host ""

Write-Host "Option 2 - PARTEZ SUR UNE BASE PROPRE:" -ForegroundColor Yellow
Write-Host "  1. Sauvegardez toutes les migrations existantes" -ForegroundColor White
Write-Host "  2. Supprimez-les du dossier db/migration" -ForegroundColor White
Write-Host "  3. Gardez uniquement V1__init_schema.sql complet" -ForegroundColor White
Write-Host ""

Write-Host "Option 3 - FUSIONNEZ LES DOUBLONS:" -ForegroundColor Cyan
Write-Host "  (Recommande si vos migrations contiennent des donnees importantes)" -ForegroundColor Gray
Write-Host ""

# ============================================================
# CREATION D'UN BACKUP
# ============================================================
$BackupDir = "backup-migrations-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
Write-Host "Creation d'une sauvegarde dans: $BackupDir" -ForegroundColor Yellow

New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
Copy-Item -Path "$MigrationDir\*.sql" -Destination $BackupDir -Force

Write-Host "Sauvegarde creee: $BackupDir" -ForegroundColor Green
Write-Host ""

# ============================================================
# MENU INTERACTIF
# ============================================================
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "ACTIONS DISPONIBLES" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1 - Supprimer mon V1__init_schema.sql (garder vos migrations)"
Write-Host "2 - Supprimer TOUTES les migrations et repartir de zero"
Write-Host "3 - Voir le contenu des doublons"
Write-Host "4 - Quitter sans rien faire"
Write-Host ""

$choice = Read-Host "Choisissez une option (1-4)"

switch ($choice) {
    "1" {
        $MyV1 = Join-Path $MigrationDir "V1__init_schema.sql"
        if (Test-Path $MyV1) {
            Remove-Item $MyV1 -Force
            Write-Host "V1__init_schema.sql supprime." -ForegroundColor Green
            Write-Host "Vos migrations existantes sont conservees." -ForegroundColor Green
        } else {
            Write-Host "V1__init_schema.sql non trouve." -ForegroundColor Yellow
        }
    }
    "2" {
        Write-Host ""
        Write-Host "ATTENTION: Cela va supprimer TOUTES les migrations!" -ForegroundColor Red
        $confirm = Read-Host "Tapez 'SUPPRIMER' pour confirmer"
        if ($confirm -eq "SUPPRIMER") {
            Remove-Item -Path "$MigrationDir\*.sql" -Force
            Write-Host "Toutes les migrations supprimees." -ForegroundColor Green
            Write-Host "Placez votre V1__init_schema.sql dans $MigrationDir" -ForegroundColor Yellow
        } else {
            Write-Host "Operation annulee." -ForegroundColor Yellow
        }
    }
    "3" {
        foreach ($dup in $Duplicates) {
            Write-Host ""
            Write-Host "Version V$($dup.Name):" -ForegroundColor Cyan
            $dup.Group | ForEach-Object {
                Write-Host "  $($_.Name):" -ForegroundColor Yellow
                $firstLines = Get-Content $_.FullName -TotalCount 5
                $firstLines | ForEach-Object { Write-Host "    $_" -ForegroundColor Gray }
                Write-Host "    ..." -ForegroundColor Gray
            }
        }
    }
    "4" {
        Write-Host "Aucune action effectuee." -ForegroundColor Yellow
        Write-Host "Sauvegarde disponible dans: $BackupDir" -ForegroundColor Gray
    }
    default {
        Write-Host "Option invalide." -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Termine!" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
