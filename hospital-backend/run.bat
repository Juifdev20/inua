 @echo off
set JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-21.0.11.10-hotspot
set PATH=%JAVA_HOME%\bin;%PATH%
echo Liberation du port 8080...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8080 "') do (
    taskkill /PID %%a /F >nul 2>&1
)
echo Demarrage du backend...
.\mvnw spring-boot:run -Dmaven.test.skip=true
pause
