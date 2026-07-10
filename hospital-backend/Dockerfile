# ============================================
# Dockerfile pour déploiement sur Render
# Spring Boot - Java 21 - Multi-stage build
# ============================================

# Étape 1: Build avec Maven et Java 21
FROM maven:3.9.6-eclipse-temurin-21 AS builder

# Forcer l'encodage UTF-8 pour le build
ENV JAVA_TOOL_OPTIONS="-Dfile.encoding=UTF-8"
ENV MAVEN_OPTS="-Dfile.encoding=UTF-8"
ENV LANG=C.UTF-8
ENV LC_ALL=C.UTF-8

# Définir le répertoire de travail
WORKDIR /app

# Copier le pom.xml d'abord pour optimiser le cache des dépendances
COPY pom.xml .

# Télécharger les dépendances (cette étape est mise en cache)
RUN mvn dependency:go-offline -B

# Copier le code source
COPY src ./src

# Compiler et packager l'application avec encodage UTF-8 explicite
RUN mvn clean package -DskipTests -B -Dproject.build.sourceEncoding=UTF-8 -Dproject.reporting.outputEncoding=UTF-8

# ============================================
# Étape 2: Image finale légère avec JRE 21
# ============================================
FROM eclipse-temurin:21-jre-alpine

# Mémoire conteneur (Render 2 Go). Metaspace relevé à 384m (128m était trop bas pour
# Spring Boot → OutOfMemoryError: Metaspace → exit 3 → redémarrages fréquents).
ENV JAVA_TOOL_OPTIONS="-Dfile.encoding=UTF-8 -XX:+UseContainerSupport -XX:MaxRAMPercentage=70.0 -XX:MaxMetaspaceSize=384m -XX:+HeapDumpOnOutOfMemoryError -XX:+ExitOnOutOfMemoryError"
ENV SPRING_PROFILES_ACTIVE=prod

# Installer curl pour healthcheck (optionnel mais utile)
RUN apk add --no-cache curl

# Créer un utilisateur non-root pour la sécurité
RUN addgroup -S hospital && adduser -S hospital -G hospital

# Définir le répertoire de travail
WORKDIR /app

# Copier le JAR depuis l'étape de build
COPY --from=builder /app/target/backend-0.0.1-SNAPSHOT.jar app.jar

# Changer le propriétaire des fichiers
RUN chown -R hospital:hospital /app

# Passer à l'utilisateur non-root
USER hospital

# Exposer le port 10000 (Render utilise ce port par défaut)
EXPOSE 10000

# Healthcheck : /health (léger, public, 200, ne dépend PAS de la DB).
# /actuator/health renvoyait 302 (redirection) et dépend de la DB → faux négatifs
# quand Supabase est brièvement injoignable → redémarrages inutiles.
HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=5 \
  CMD curl -f http://localhost:10000/health || exit 1

# Commande de démarrage - Ajout de $JAVA_OPTS pour une flexibilité totale depuis Render
ENV PORT=10000
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar -Dserver.port=$PORT app.jar"]