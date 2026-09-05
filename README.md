# Mágina Olivo

Plataforma web/PWA orientada al olivarero para centralizar la gestión de fincas, campañas, entregas, rendimientos, labores, documentación e información útil de cooperativas.

## Objetivo

Mágina Olivo nace con una idea sencilla: reunir en una sola herramienta la información diaria que un agricultor necesita para gestionar su olivar, sin depender de que una cooperativa concreta ofrezca integración.

La primera versión priorizará:

- Explotaciones, fincas y parcelas.
- Campañas agrícolas.
- Entregas de aceituna y rendimientos.
- Labores, tratamientos, riego, notas y fotografías.
- Gastos y seguimiento básico de campaña.
- Directorio e información pública de cooperativas.
- Avisos y automatizaciones útiles.
- Experiencia PWA instalable en móvil.

La IA será una capa opcional para interpretación de lenguaje natural, documentos y consultas avanzadas. El funcionamiento principal de la plataforma no dependerá de una API de IA.

## Estado

Proyecto en fase de definición funcional y arquitectura inicial.

La documentación de producto se desarrollará primero en una rama de trabajo antes de iniciar la implementación.

## Desarrollo local

El entorno local requiere Node `24.20.0`, Docker Compose y datos sintéticos. Tras crear un `.env` local a partir de `.env.example`:

```bash
npm ci
docker compose -f infra/docker/compose.dev.yml up -d
npm run db:migrate
npm run dev:api
npm run dev:web
```

`npm run db:migrate` aplica primero las migraciones de Better Auth y después las migraciones de dominio; así una base PostgreSQL vacía queda preparada para registro e inicio de sesión local.
