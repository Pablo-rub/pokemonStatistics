# Dockerfile de dos etapas: compilación del frontend y luego ejecución
FROM node:18 AS build

# Construir el frontend
WORKDIR /app
COPY client/package*.json ./client/
RUN cd client && npm install
COPY client/ ./client/
RUN cd client && npm run build

# Segunda etapa: servidor
FROM node:18
WORKDIR /app

# Copiar dependencias del backend
COPY package*.json ./
RUN npm install

# Copiar código del backend
COPY backend/ ./backend/

# Crear directorio public y copiar archivos del frontend
COPY --from=build /app/client/build ./public

# Exponer puerto y configurar variables
EXPOSE 8080
ENV PORT=8080
ENV NODE_ENV=production
ENV API_URL=""

# Comando para iniciar
CMD ["node", "backend/server.js"]