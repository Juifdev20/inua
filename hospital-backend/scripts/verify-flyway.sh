#!/bin/bash
# ============================================================
# SCRIPT DE VÉRIFICATION FLYWAY
# Usage: ./scripts/verify-flyway.sh
# ============================================================

set -e

echo "=========================================="
echo "🔍 Vérification complète des migrations Flyway"
echo "=========================================="
echo ""

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

MIGRATION_DIR="src/main/resources/db/migration"
ERRORS=0
WARNINGS=0

# Vérifier que le répertoire existe
if [ ! -d "$MIGRATION_DIR" ]; then
    echo "${RED}❌ ERREUR: Répertoire $MIGRATION_DIR introuvable${NC}"
    exit 1
fi

echo "${BLUE}📁 Analyse du répertoire: $MIGRATION_DIR${NC}"
echo ""

# ============================================================
# 1. LISTER TOUTES LES MIGRATIONS
# ============================================================
MIGRATIONS=$(find "$MIGRATION_DIR" -name "V*.sql" -type f | sort)

if [ -z "$MIGRATIONS" ]; then
    echo "${YELLOW}⚠️  Aucune migration trouvée${NC}"
    exit 0
fi

echo "${GREEN}📋 Migrations trouvées:${NC}"
echo "$MIGRATIONS" | while read -r file; do
    echo "   • $(basename "$file")"
done
echo ""

# ============================================================
# 2. VÉRIFIER LE NOMMAGE
# ============================================================
echo "${BLUE}🔍 Vérification du nommage...${NC}"

INVALID_FILES=$(find "$MIGRATION_DIR" -name "*.sql" -type f ! -name "V[0-9]*__*.sql" ! -name "V[0-9]*.sql" | sort)

if [ -n "$INVALID_FILES" ]; then
    echo "${RED}❌ Fichiers avec nom invalide:${NC}"
    echo "$INVALID_FILES" | while read -r file; do
        echo "   ❌ $(basename "$file")"
        ERRORS=$((ERRORS + 1))
    done
    echo ""
else
    echo "${GREEN}   ✅ Tous les noms respectent la convention${NC}"
fi
echo ""

# ============================================================
# 3. VÉRIFIER LES DOUBLONS DE VERSIONS
# ============================================================
echo "${BLUE}🔍 Vérification des doublons de versions...${NC}"

VERSIONS=$(echo "$MIGRATIONS" | sed 's/.*\/V\([0-9.]*\)__.*/\1/')
DUPLICATES=$(echo "$VERSIONS" | sort | uniq -d)

if [ -n "$DUPLICATES" ]; then
    echo "${RED}❌ Versions dupliquées détectées:${NC}"
    echo "$DUPLICATES" | while read -r version; do
        echo "   ❌ V${version}:"
        find "$MIGRATION_DIR" -name "V${version}__*.sql" -o -name "V${version}.sql" | while read -r file; do
            echo "      - $(basename "$file")"
        done
    done
    ERRORS=$((ERRORS + 1))
else
    echo "${GREEN}   ✅ Pas de doublons${NC}"
fi
echo ""

# ============================================================
# 4. VÉRIFIER LA SÉQUENCE (pas de trous)
# ============================================================
echo "${BLUE}🔍 Vérification de la séquence...${NC}"

INTEGER_VERSIONS=$(echo "$VERSIONS" | grep -E '^[0-9]+$' | sort -n)

if [ -n "$INTEGER_VERSIONS" ]; then
    PREV=0
    GAPS=""
    
    while read -r version; do
        if [ "$PREV" -ne 0 ] && [ "$version" -ne $((PREV + 1)) ]; then
            MISSING=$((version - PREV - 1))
            GAPS="${GAPS}V${PREV} → V${version} (manque ${MISSING} version(s))\n"
        fi
        PREV=$version
    done <<< "$INTEGER_VERSIONS"
    
    if [ -n "$GAPS" ]; then
        echo "${YELLOW}⚠️  Trous dans la séquence:${NC}"
        printf "$GAPS" | while read -r line; do
            echo "   ⚠️  $line"
            WARNINGS=$((WARNINGS + 1))
        done
    else
        echo "${GREEN}   ✅ Séquence continue${NC}"
    fi
else
    echo "${YELLOW}   ⚠️  Impossible d'analyser la séquence${NC}"
fi
echo ""

# ============================================================
# 5. VÉRIFIER LE CONTENU SQL
# ============================================================
echo "${BLUE}🔍 Vérification du contenu SQL...${NC}"

while read -r file; do
    BASENAME=$(basename "$file")
    ISSUES=0
    
    # Vérifier si le fichier est vide
    if [ ! -s "$file" ]; then
        echo "   ❌ $BASENAME: Fichier vide"
        ERRORS=$((ERRORS + 1))
        ISSUES=1
    fi
    
    # Vérifier la présence d'instructions SQL
    if ! grep -qiE "^\s*(CREATE|ALTER|INSERT|UPDATE|DELETE|DROP|GRANT|COMMENT)" "$file"; then
        echo "   ⚠️  $BASENAME: Aucune instruction SQL standard"
        WARNINGS=$((WARNINGS + 1))
        ISSUES=1
    fi
    
    # Vérifier les DROP dangereux
    if grep -qiE "DROP\s+TABLE\s+[^I][^F]" "$file" 2>/dev/null; then
        echo "   ⚠️  $BASENAME: DROP TABLE sans IF EXISTS"
        WARNINGS=$((WARNINGS + 1))
        ISSUES=1
    fi
    
    if [ $ISSUES -eq 0 ]; then
        echo "   ✅ $BASENAME"
    fi
done <<< "$MIGRATIONS"

echo ""

# ============================================================
# 6. VÉRIFIER SI FLYWAY EST CONFIGURÉ
# ============================================================
echo "${BLUE}🔍 Vérification de la configuration...${NC}"

if [ -f "src/main/resources/application.properties" ]; then
    if grep -q "flyway.enabled=true" src/main/resources/application*.properties 2>/dev/null; then
        echo "${GREEN}   ✅ Flyway est activé${NC}"
    else
        echo "${YELLOW}   ⚠️  Flyway semble désactivé dans application.properties${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
    
    if grep -q "ddl-auto=none" src/main/resources/application*.properties 2>/dev/null; then
        echo "${GREEN}   ✅ Hibernate ddl-auto est désactivé${NC}"
    else
        echo "${YELLOW}   ⚠️  Hibernate ddl-auto n'est pas à 'none'${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo "${YELLOW}   ⚠️  Fichier application.properties non trouvé${NC}"
fi

echo ""

# ============================================================
# RÉSUMÉ
# ============================================================
echo "=========================================="
echo "📊 RÉSUMÉ"
echo "=========================================="

TOTAL_MIGRATIONS=$(echo "$MIGRATIONS" | wc -l)
echo "Total migrations: $TOTAL_MIGRATIONS"

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo "${GREEN}✅ Toutes les vérifications ont réussi !${NC}"
    echo "${GREEN}Vos migrations sont prêtes pour le commit.${NC}"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo "${YELLOW}⚠️  $WARNINGS avertissement(s) (non bloquant)${NC}"
    echo "${YELLOW}Vérifiez les avertissements avant de committer.${NC}"
    exit 0
else
    echo "${RED}❌ $ERRORS erreur(s) détectée(s)${NC}"
    if [ $WARNINGS -gt 0 ]; then
        echo "${YELLOW}⚠️  $WARNINGS avertissement(s)${NC}"
    fi
    echo "${RED}Corrigez les erreurs avant de committer.${NC}"
    exit 1
fi
