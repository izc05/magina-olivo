# Mágina Olivo

Plataforma web/PWA orientada al olivarero para centralizar la gestión de fincas, campañas, entregas, rendimientos, labores, documentación e información útil de cooperativas y Sierra Mágina.

## Antes de desarrollar

**Codex y cualquier agente deben leer primero:**

1. `AGENTS.md`
2. `docs/APP_MASTER_MAP.md`
3. `MASTER_PLAN.md`
4. `ARCHITECTURE.md`
5. documentación específica del módulo y los issues/PRs activos

`docs/APP_MASTER_MAP.md` contiene el mapa completo de bloques de la app, prioridades P0–P5, mejoras previstas y reglas para no ampliar alcance fuera de orden.

## Objetivo

Mágina Olivo nace con una idea sencilla: reunir en una sola herramienta la información diaria que un agricultor necesita para gestionar su olivar, sin depender de que una cooperativa concreta ofrezca integración.

La primera versión prioriza:

- Explotaciones, fincas y parcelas.
- Campañas agrícolas.
- Entregas de aceituna y rendimientos.
- Labores, tratamientos, riego, notas y fotografías.
- Gastos y seguimiento básico de campaña.
- Directorio e información pública de cooperativas.
- Avisos y automatizaciones útiles.
- Experiencia PWA instalable en móvil.

La IA será una capa opcional para interpretación de lenguaje natural, documentos, contenido asistido y consultas avanzadas. El funcionamiento principal de la plataforma no dependerá de una API de IA.

## Estado operativo

La integración usada como base de aceptación está congelada en el candidato de staging V11:

- rama: `staging/candidate-v11-2026-09-05`
- SHA: `063767560fe824c3415f200e0314dc5b2e8f4122`

El issue **#7 — P0: Ejecutar staging real antes del piloto** es el gate vigente. Mientras permanezca abierto, no deben incorporarse grandes áreas nuevas al candidato ni iniciarse el piloto con datos reales.

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
