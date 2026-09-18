---
name: supabase-sync
description: Usa esta skill para Supabase, autenticación, Postgres, RLS, Storage, Edge Functions, sincronización Android y resolución de conflictos.
---

# Supabase y sincronización

## Rol de Supabase
Supabase es el backend remoto, no una dependencia que deba impedir el trabajo offline.

## Reglas de datos
- Identificadores estables y generables localmente.
- Campos de auditoría suficientes para sincronización.
- Operaciones idempotentes cuando sea posible.
- RLS obligatoria para datos privados del agricultor.
- Ninguna clave de servicio en el cliente Android.
- Storage con rutas y políticas coherentes con la propiedad de datos.

## Sincronización
- Local-first.
- Cola de cambios pendientes.
- Upsert controlado.
- Manejo explícito de conflictos.
- No sobrescribas silenciosamente datos del usuario.
- Separa borrado lógico/sincronización cuando una eliminación remota pueda ser peligrosa.
- Registra errores recuperables sin bloquear el resto de la app.

## Evolución
Las migraciones deben ser reproducibles. No cambies esquemas de producción manualmente sin migración versionada.
