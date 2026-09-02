# Criterios de aceptación — Spike técnico Mágina Olivo

Este documento define cuándo la fundación técnica está suficientemente probada para empezar a ampliar el MVP.

No basta con que la demo «funcione» visualmente.

## Resultado

El spike solo se considera **PASS** si todos los criterios P0 están verdes y los P1 tienen decisión/documentación clara.

## P0 — Runtime y builds

- [ ] Node.js 24 LTS fijado en engines/tooling.
- [ ] lockfile reproducible.
- [ ] web compila.
- [ ] API compila.
- [ ] worker compila.
- [ ] TypeScript strict.
- [ ] CI parte de checkout limpio y queda verde.

## P0 — PostgreSQL

- [ ] PostgreSQL 18.x local/test funcionando.
- [ ] migraciones crean base desde cero.
- [ ] fixtures sintéticos cargables.
- [ ] FK/checks básicos activos.
- [ ] kilos/rendimientos usan numeric/decimal.
- [ ] datos derivados se reconstruyen desde registros base.

## P0 — Auth

- [ ] registro/login/logout.
- [ ] cookie HttpOnly.
- [ ] Secure en staging/prod.
- [ ] sesión server-side revocable.
- [ ] CORS/Origin/CSRF validados.
- [ ] no hay token de sesión persistente en localStorage.
- [ ] recuperación de contraseña probada o bloqueada explícitamente hasta implementarla antes de piloto.

## P0 — Multi-tenant

Crear:
- Usuario A / Holding A.
- Usuario B / Holding B.

Tests obligatorios:
- [ ] A no puede leer finca B.
- [ ] A no puede editar parcela B.
- [ ] A no puede consultar entrega B.
- [ ] A no puede obtener URL de ticket B.
- [ ] modificar IDs manualmente devuelve 403/404 seguro.
- [ ] listados nunca mezclan holdings.

Si se prueba RLS:
- [ ] documentar configuración y comportamiento.
- [ ] mantener autorización API aunque exista RLS.

## P0 — Flujo vertical agrícola

Un usuario puede:
1. [ ] crear explotación;
2. [ ] crear finca;
3. [ ] crear parcela;
4. [ ] crear campaña;
5. [ ] registrar entrega de 1.842 kg;
6. [ ] verla en campaña;
7. [ ] añadir posteriormente rendimiento 21,7 %;
8. [ ] ver media/cálculo correcto;
9. [ ] adjuntar ticket privado;
10. [ ] abrir timeline de parcela/campaña.

## P0 — Idempotencia

Caso:
- cliente manda `POST delivery`;
- servidor hace commit;
- respuesta se pierde;
- cliente reintenta misma key.

Resultado:
- [ ] existe exactamente una entrega.
- [ ] cliente recibe el recurso original.
- [ ] misma key + payload diferente falla.
- [ ] hit idempotente queda observable.

## P0 — Offline

Con conexión:
- [ ] PWA carga y guarda estado base necesario.

Sin conexión:
- [ ] formulario de entrega usable.
- [ ] operación queda en IndexedDB/outbox.
- [ ] UI muestra pendiente de sincronizar.
- [ ] recargar PWA no pierde operación.

Al recuperar conexión:
- [ ] sincroniza.
- [ ] queda una sola entrega.
- [ ] outbox se limpia solo tras confirmación.

Actualización PWA:
- [ ] no borra outbox.

Logout:
- [ ] no mezcla outbox entre usuarios.

## P0 — Concurrencia

- [ ] recurso tiene versión/ETag equivalente.
- [ ] dos ediciones concurrentes generan conflicto 409 cuando corresponde.
- [ ] no hay last-write-wins silencioso para entrega/rendimiento importante.

## P0 — Documentos

- [ ] bucket/storage privado.
- [ ] upload intent limitado.
- [ ] tamaño/tipo validados.
- [ ] URL descarga temporal.
- [ ] usuario B no puede descargar documento A.
- [ ] storage key no depende de filename inseguro.
- [ ] logs no contienen contenido del ticket.

## P0 — Backups

- [ ] backup PostgreSQL automatizable.
- [ ] copia fuera del host principal.
- [ ] inventario de objetos/documentos recuperable.
- [ ] restore sobre entorno limpio ejecutado.
- [ ] entrega/rendimiento/documento de prueba aparecen tras restore.
- [ ] resultado del restore queda documentado.

## P0 — Seguridad básica

- [ ] secretos fuera de Git.
- [ ] bundle frontend inspeccionado sin API keys.
- [ ] rate limiting auth básico.
- [ ] headers de seguridad/CSP iniciales.
- [ ] queries parametrizadas.
- [ ] payloads validados por schema.
- [ ] 5xx no exponen stack en producción.
- [ ] threat tests cross-holding verdes.

## P0 — Observabilidad

- [ ] cada request tiene request_id.
- [ ] errores incluyen request_id.
- [ ] logs JSON/estructurados.
- [ ] latencia/status visibles.
- [ ] jobs tienen estado/reintentos.
- [ ] secretos/tokens/documentos no aparecen en logs.
- [ ] health live/ready implementados.

## P1 — Importación

- [ ] batch de importación.
- [ ] staging.
- [ ] preview.
- [ ] commit transaccional.
- [ ] parser con límites.
- [ ] posible duplicado visible.
- [ ] importación no sobrescribe silenciosamente valor manual discrepante.

Puede completarse inmediatamente después del spike núcleo si no bloquea primera validación UX.

## P1 — AEMET

- [ ] adapter independiente.
- [ ] API key solo backend.
- [ ] caché.
- [ ] timeout.
- [ ] fallo proveedor no rompe dashboard agrícola.
- [ ] metadata de última actualización.

No es necesario para validar el flujo de entrega/offline.

## P1 — RAIF

- [ ] adapter/dataset ingestion separado.
- [ ] atribución CC BY 4.0 preparada.
- [ ] fecha/origen visible.
- [ ] parser versionado.

## P1 — SIGPAC

- [ ] contrato de referencia SIGPAC estable.
- [ ] atribución preparada.
- [ ] no bloquear alta manual de parcela por ausencia de SIGPAC.

## Performance inicial

No buscamos escala artificial, pero en staging local/realista:
- [ ] dashboard normal responde sin consultas N+1 obvias.
- [ ] listados paginados.
- [ ] upload no carga archivo completo en memoria de API si el flujo directo a object storage lo evita.
- [ ] índices básicos explicados por consultas.

## Accesibilidad técnica

El UI final lo trabaja el hilo visual, pero la implementación deberá preservar:
- [ ] navegación teclado;
- [ ] labels reales;
- [ ] focus visible;
- [ ] errores de formulario asociados a campos;
- [ ] estados sync/offline no dependen solo de color.

## Gate final

### PASS

Se puede comenzar a ampliar MVP cuando:
- todos P0 = PASS;
- no hay vulnerabilidad cross-holding conocida;
- restore real = PASS;
- offline/idempotencia = PASS;
- decisión de auth queda confirmada;
- esquema/migraciones son reproducibles.

### FAIL

No avanzar si:
- hay pérdida/duplicación de entregas;
- auth o holdings son vulnerables;
- documentos son públicos;
- no se puede restaurar;
- la PWA pierde outbox;
- secretos aparecen en cliente/logs.

## Evidencia

Crear al ejecutar:

`docs/spike/SPIKE_RESULTS.md`

con:
- commit SHA;
- fecha;
- entorno;
- checks P0/P1;
- fallos;
- métricas;
- decisiones ORM/auth/storage;
- enlaces a CI;
- riesgos aceptados.
