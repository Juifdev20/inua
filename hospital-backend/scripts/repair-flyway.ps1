# ============================================================
# SCRIPT POWERSHELL DE REPARATION FLYWAY
# Repare l'historique sans supprimer les donnees
# ============================================================

param(
    [string]$Database = "hospital_db",
    [string]$User = "postgres",
    [string]$Password = "INUA",  # A adapter selon votre config
    [string]$Host = "localhost",
    [int]$Port = 5432
)

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "REPARATION FLYWAY - Conservation des donnees" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Connexion PostgreSQL
$env:PGPASSWORD = $Password

Write-Host "Connexion a PostgreSQL..." -ForegroundColor Yellow

# Verifier la connexion
$testConn = psql -h $Host -p $Port -U $User -d postgres -c "SELECT 1" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERREUR: Impossible de se connecter a PostgreSQL" -ForegroundColor Red
    Write-Host "Verifiez vos identifiants et que PostgreSQL est demarre" -ForegroundColor Yellow
    exit 1
}

Write-Host "Connexion reussie!" -ForegroundColor Green
Write-Host ""

# Verifier si la base existe
$dbExists = psql -h $Host -p $Port -U $User -d postgres -t -c "SELECT 1 FROM pg_database WHERE datname = '$Database'" 2>&1
if ($dbExists -notmatch "1") {
    Write-Host "ERREUR: La base de donnees $Database n'existe pas" -ForegroundColor Red
    exit 1
}

Write-Host "Base de donnees trouvee: $Database" -ForegroundColor Green
Write-Host ""

# Verifier si flyway_schema_history existe
$flywayExists = psql -h $Host -p $Port -U $User -d $Database -t -c "SELECT 1 FROM information_schema.tables WHERE table_name = 'flyway_schema_history'" 2>&1

if ($flywayExists -notmatch "1") {
    Write-Host "Table flyway_schema_history inexistante" -ForegroundColor Yellow
    Write-Host "Flyway va la creer automatiquement au prochain demarrage" -ForegroundColor Green
    Write-Host ""
    Write-Host "Aucune reparation necessaire." -ForegroundColor Green
    exit 0
}

Write-Host "Table flyway_schema_history trouvee" -ForegroundColor Green
Write-Host ""

# Afficher l'etat actuel
Write-Host "Etat actuel des migrations:" -ForegroundColor Cyan
psql -h $Host -p $Port -U $User -d $Database -c "SELECT version, description, success, installed_on FROM flyway_schema_history ORDER BY installed_rank;" 2>&1
Write-Host ""

# Verifier si V2 existe
$v2Exists = psql -h $Host -p $Port -U $User -d $Database -t -c "SELECT 1 FROM flyway_schema_history WHERE version = '2'" 2>&1

if ($v2Exists -notmatch "1") {
    Write-Host "La migration V2 n'est pas enregistree dans l'historique" -ForegroundColor Yellow
    Write-Host "Aucune reparation necessaire" -ForegroundColor Green
    exit 0
}

Write-Host "ALERTE: La migration V2 existe dans l'historique" -ForegroundColor Yellow
Write-Host "Elle va etre supprimee de l'historique pour etre reappliquee" -ForegroundColor Yellow
Write-Host ""

# Demande de confirmation
$confirm = Read-Host "Tapez 'REPARER' pour confirmer la reparation"
if ($confirm -ne "REPARER") {
    Write-Host "Operation annulee. Aucune modification effectuee." -ForegroundColor Yellow
    exit 0
}

# Effectuer la reparation
Write-Host "Reparation en cours..." -ForegroundColor Yellow

$result = psql -h $Host -p $Port -U $User -d $Database -c "DELETE FROM flyway_schema_history WHERE version = '2';" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host "REPARATION REUSSIE!" -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "La migration V2 a ete supprimee de l'historique." -ForegroundColor Green
    Write-Host ""
    Write-Host "ETAPES SUIVANTES:" -ForegroundColor Cyan
    Write-Host "1. Redemarrez votre application Spring Boot" -ForegroundColor White
    Write-Host "2. Flyway va reappliquer automatiquement la V2" -ForegroundColor White
    Write-Host "3. Vos donnees sont conservees" -ForegroundColor White
    Write-Host ""
    
    # Afficher le nouvel etat
    Write-Host "Nouvel etat des migrations:" -ForegroundColor Cyan
    psql -h $Host -p $Port -U $User -d $Database -c "SELECT version, description, success, installed_on FROM flyway_schema_history ORDER BY installed_rank;" 2>&1
} else {
    Write-Host ""
    Write-Host "ERREUR lors de la reparation:" -ForegroundColor Red
    Write-Host $result -ForegroundColor Red
}

Write-Host ""
