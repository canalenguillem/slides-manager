# Project Spec — AI Markdown Slides Builder

## 1. Objetivo

Aplicación web para crear presentaciones automáticamente a partir de archivos Markdown.

El usuario sube un `.md` y el sistema genera una presentación web tipo slides.

## 2. Público objetivo

- Pymes
- Profesionales
- Formadores
- Creadores de contenido

## 3. Funcionalidades MVP

### Autenticación
- Registro
- Login
- JWT

### Presentaciones
- Crear presentación
- Subir archivo markdown
- Listar presentaciones
- Eliminar presentación

### Procesamiento Markdown
- Separador `---` → nueva slide
- Parseo de:
  - títulos
  - listas
  - texto
- Generación de estructura JSON

### Generación Slides
- Transformar JSON → slides renderizables
- Diseño limpio tipo presentación

### Visualización
- Navegación con teclado
- Scroll o modo fullscreen

### API Keys (v1 previsto)
- Cada usuario puede añadir sus propias API keys
- Proveedores:
  - OpenAI (texto)
  - Leonardo (imágenes)
- Guardado seguro (cifrado)
- No exposición al frontend

## 4. Fase 2

- Editor visual de slides
- Sustitución de imágenes
- Activar/desactivar imágenes
- Regeneración parcial de slides
- Upload de imágenes propias

### IA aplicada
- Reescritura de títulos
- Mejora de bullets
- Generación de estructura alternativa
- Generación de imágenes por slide

## 5. Fase 3

- Temas visuales
- Export PDF
- Compartir enlace público
- Modo presentación fullscreen
- Sistema de créditos (alternativa a API keys propias)

## 6. Arquitectura

### Backend
- FastAPI
- JWT Auth
- Parser markdown
- Generador de slides
- Integración con APIs externas

### Frontend
- React + TypeScript + Vite
- Dashboard usuario
- Editor básico
- Visualizador de slides

### Infraestructura
- Docker Compose
- Nginx (reverse proxy)

## 7. Bases de datos

### MariaDB
- users
- presentations
- slides
- assets
- user_provider_credentials

### MongoDB
- markdown original
- JSON generado
- historial versiones

### Redis
- caché
- colas
- sesiones

## 8. Seguridad

- API keys cifradas en base de datos
- Uso exclusivo desde backend
- Nunca enviadas al frontend
- Validación de claves antes de guardar

## 9. Flujo

1. Usuario sube markdown
2. Backend parsea
3. Genera JSON
4. (Opcional) mejora con IA
5. (Opcional) genera imágenes
6. Guarda datos
7. Frontend renderiza

## 10. Estructura proyecto

- backend/
- frontend/
- nginx/
- docker-compose.yml
- .env