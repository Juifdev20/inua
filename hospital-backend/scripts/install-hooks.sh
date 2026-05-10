#!/bin/bash
# ============================================================
# SCRIPT D'INSTALLATION DES HOOKS GIT
# ============================================================

echo "=========================================="
echo "🔧 Installation des hooks Git pour Flyway"
echo "=========================================="
echo ""

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Vérifier qu'on est dans un repo Git
if [ ! -d ".git" ]; then
    echo "❌ Erreur: Pas un dépôt Git. Exécutez depuis la racine du projet."
    exit 1
fi

# Créer le répertoire .githooks s'il n'existe pas
if [ ! -d ".githooks" ]; then
    mkdir -p .githooks
    echo "✅ Répertoire .githooks créé"
fi

# Rendre le pre-commit exécutable
if [ -f ".githooks/pre-commit" ]; then
    chmod +x .githooks/pre-commit
    echo "✅ Hook pre-commit rendu exécutable"
else
    echo "⚠️  Hook pre-commit non trouvé dans .githooks/"
fi

# Configurer Git pour utiliser le répertoire .githooks
git config core.hooksPath .githooks
echo "✅ Git configuré pour utiliser .githooks/"

echo ""
echo "${GREEN}==========================================${NC}"
echo "${GREEN}✅ Installation terminée !${NC}"
echo "${GREEN}==========================================${NC}"
echo ""
echo "Les vérifications automatiques sont maintenant actives."
echo "À chaque commit, les règles Flyway seront vérifiées."
echo ""
echo "Pour tester:"
echo "  git add src/main/resources/db/migration/V1__test.sql"
echo "  git commit -m \"test\""
echo ""
echo "Pour désactiver temporairement:"
echo "  git commit --no-verify -m \"message\""
echo ""
