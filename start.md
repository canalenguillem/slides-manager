# START — AI Slides Builder

Quiero que generes un proyecto completo dockerizado con esta arquitectura:

## Stack obligatorio

- Backend: FastAPI (Python 3.12)
- Frontend: React + TypeScript + Vite
- Base de datos relacional: MariaDB
- Base de datos documental: MongoDB
- Cache / colas: Redis
- Reverse proxy: Nginx

## Requisitos

- Docker Compose completo
- Variables en .env
- Volúmenes persistentes
- Red interna entre servicios

## Backend

- Estructura modular
- Endpoint:
  - auth (register/login)
  - gestión de presentaciones
  - upload markdown
  - obtener slides
  - gestión de API keys por usuario

- Funcionalidad:
  - parser markdown → JSON
  - almacenamiento en MariaDB y MongoDB
  - integración preparada para OpenAI y Leonardo

## API Keys

- Cada usuario puede guardar:
  - OpenAI API key
  - Leonardo API key

- Requisitos:
  - cifrado en base de datos
  - nunca exponer al frontend
  - endpoints para:
    - guardar key
    - validar key
    - activar/desactivar

## Frontend

- Login/Register
- Dashboard
- Subida de markdown
- Vista de presentación
- Render slides desde JSON
- Configuración de API keys (UI simple)

## Importante

- Crear todos los archivos del proyecto
- No mostrar código en chat
- Escribir directamente en el sistema de ficheros
- Código limpio, modular y profesional

## Resultado esperado

Proyecto listo para ejecutar con:

docker compose up --build