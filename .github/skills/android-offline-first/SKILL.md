---
name: android-offline-first
description: Usa esta skill para arquitectura Android, persistencia local, repositorios, ViewModels, Compose, conectividad, colas offline y sincronización diferida.
---

# Android offline-first

## Principios
- La app debe seguir siendo útil sin conexión.
- La UI lee del estado local; la red no es la fuente inmediata de verdad.
- Separa presentación, dominio, datos locales y datos remotos.
- Evita acoplar pantallas directamente a Supabase, Catastro, AEMET u otros proveedores.
- Las operaciones del usuario se guardan localmente primero y se sincronizan después.

## Implementación esperada
- Kotlin + Android nativo.
- Jetpack Compose para UI salvo decisión explícita contraria.
- Repositorios como frontera entre dominio y fuentes de datos.
- Persistencia local transaccional para entidades críticas.
- WorkManager o mecanismo equivalente para sincronización resistente.
- Estados explícitos: local, pendiente, sincronizando, sincronizado, conflicto/error.
- IDs locales estables; no dependas de obtener un ID remoto para poder trabajar.

## Fallos y red
- Nunca borres una operación local por un fallo de red.
- Reintentos con backoff.
- Mensajes de estado comprensibles.
- Lecturas cacheadas cuando una fuente externa no responda.
- No bloquees la navegación principal por una API externa.

## Verificación
Prueba al menos: modo avión, reconexión, cierre forzado durante una operación pendiente y reintento posterior.
