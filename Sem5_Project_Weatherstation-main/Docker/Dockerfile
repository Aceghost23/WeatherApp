# Basis-Image für Node.js
FROM node:18-alpine

# Arbeitsverzeichnis setzen
WORKDIR /app

# Kopiere den Backend-Code in das Image
COPY Backend /app/Backend

# Kopiere den Frontend-Code in das Image
COPY Frontend /app/Frontend

# Ins Backend wechseln
WORKDIR /app/Backend

# Installiere die Abhängigkeiten
RUN npm install

# Port freigeben
EXPOSE 3000

# Server starten
CMD ["node", "Server.js"]

