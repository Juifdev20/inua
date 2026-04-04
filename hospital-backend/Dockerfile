# ============================================
# Dockerfile pour déploiement sur Render
# Spring Boot - Java 21 - Multi-stage build
# ============================================

# Étape 1: Build avec Maven et Java 21
FROM maven:3.9.6-eclipse-temurin-21 AS builder

# Forcer l'encodage UTF-8 pour le build
ENV JAVA_TOOL_OPTIONS="-Dfile.encoding=UTF-8"
ENV MAVEN_OPTS="-Dfile.encoding=UTF-8"

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

# Forcer l'encodage UTF-8 au runtime
ENV JAVA_TOOL_OPTIONS="-Dfile.encoding=UTF-8"

# Installer curl pour healthcheck (optionnel mais utile)
RUN apk add --no-cache curl

# Créer un utilisateur non-root pour la sécurité
RUN addgroup -S hospital && adduser -S hospital -G hospital

# Définir le répertoire de travail
WORKDIR /app

# Copier le JAR depuis l'étape de build
# Le nom du JAR correspond à artifactId-version dans pom.xml
COPY --from=builder /app/target/backend-0.0.1-SNAPSHOT.jar app.jar

# Changer le propriétaire des fichiers
RUN chown -R hospital:hospital /app

# Passer à l'utilisateur non-root
USER hospital

# Exposer le port 8080 (Render redirigera vers ce port)
EXPOSE 8080

# Healthcheck pour Render
HEALTHCHECK --interval=30s --timeout=3s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:8080/actuator/health || exit 1

# Commande de démarrage de l'application
ENTRYPOINT ["java", "-jar", "app.jar"]
