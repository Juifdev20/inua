@echo off
:: ============================================================
:: SCRIPT DE VERIFICATION FLYWAY POUR WINDOWS
:: Usage: .\scripts\verify-flyway.bat
:: ============================================================

:: Se positionner dans le repertoire du projet (racine)
cd /d "%~dp0\.."

echo ==========================================
echo Verification des migrations Flyway
echo ==========================================
echo.

set "MIGRATION_DIR=src\main\resources\db\migration"
set ERRORS=0
set WARNINGS=0

:: Verifier que le repertoire existe
if not exist "%MIGRATION_DIR%" (
    echo ERREUR: Repertoire %MIGRATION_DIR% introuvable
    exit /b 1
)

echo Repertoire: %MIGRATION_DIR%
echo.

:: Compter les fichiers SQL
set COUNT=0
for %%f in ("%MIGRATION_DIR%\V*.sql") do set /a COUNT+=1

if %COUNT%==0 (
    echo Aucune migration trouvee
    exit /b 0
)

echo Migrations trouvees: %COUNT%
dir /b "%MIGRATION_DIR%\V*.sql"
echo.

:: ============================================================
:: Verification du nommage
:: ============================================================
echo Verification du nommage...

setlocal enabledelayedexpansion
set INVALID_COUNT=0
for %%f in ("%MIGRATION_DIR%\*.sql") do (
    set "NAME=%%~nxf"
    echo !NAME! | findstr /R "^V[0-9]*__.*\.sql$" >nul
    if errorlevel 1 (
        echo    [ERREUR] !NAME! - Nom invalide
        set /a INVALID_COUNT+=1
    )
)
endlocal

if %INVALID_COUNT%==0 (
    echo    [OK] Tous les noms respectent la convention
) else (
    echo    [ERREUR] %INVALID_COUNT% fichier(s) avec nom invalide
    echo.
    echo Format requis: V{numero}__{description}.sql
    echo Exemples: V1__init.sql, V2__add_table.sql
    set /a ERRORS+=1
)
echo.

:: ============================================================
:: Verifier que les fichiers ne sont pas vides
:: ============================================================
echo Verification du contenu...

for %%f in ("%MIGRATION_DIR%\V*.sql") do (
    if %%~zf==0 (
        echo    [ERREUR] %%~nxf - Fichier vide
        set /a ERRORS+=1
    ) else (
        echo    [OK] %%~nxf - %%~zf octets
    )
)

echo.

:: ============================================================
:: Verifier la configuration
:: ============================================================
echo Verification de la configuration...

if exist "src\main\resources\application.properties" (
    findstr /C:"flyway.enabled=true" "src\main\resources\application*.properties" >nul 2>&1
    if errorlevel 1 (
        echo    [AVERTISSEMENT] Flyway semble desactive
        set /a WARNINGS+=1
    ) else (
        echo    [OK] Flyway est active
    )
    
    findstr /C:"ddl-auto=none" "src\main\resources\application*.properties" >nul 2>&1
    if errorlevel 1 (
        echo    [AVERTISSEMENT] Hibernate ddl-auto n'est pas a 'none'
        set /a WARNINGS+=1
    ) else (
        echo    [OK] Hibernate ddl-auto=none
    )
)

echo.

:: ============================================================
:: RESUME
:: ============================================================
echo ==========================================
echo RESUME
echo ==========================================
echo Total migrations: %COUNT%

if %ERRORS%==0 (
    if %WARNINGS%==0 (
        echo [OK] Toutes les verifications ont reussi!
        echo [OK] Vos migrations sont pretes pour le commit.
        exit /b 0
    ) else (
        echo [AVERTISSEMENT] %WARNINGS% avertissement(s) (non bloquant)
        exit /b 0
    )
) else (
    echo [ERREUR] %ERRORS% erreur(s) detectee(s)
    if %WARNINGS% gtr 0 (
        echo [AVERTISSEMENT] %WARNINGS% avertissement(s)
    )
    echo Corrigez les erreurs avant de committer.
    exit /b 1
)
