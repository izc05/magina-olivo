# Threat model V1 — Mágina Olivo

Estado: análisis inicial previo al spike.

## Activos que debemos proteger

1. Cuenta/sesión del agricultor.
2. Datos de explotación, finca y parcela.
3. Entregas, rendimientos y campaña.
4. Tickets, albaranes, liquidaciones y documentos.
5. Integridad de cálculos/agregados.
6. Outbox offline pendiente.
7. Backups.
8. API keys de proveedores externos.
9. Datos del directorio público frente a modificaciones administrativas no autorizadas.

## Límites de confianza

```text
Navegador/PWA
   |
Internet
   |
API autenticada
   |-------- Object storage
   |-------- PostgreSQL
   |-------- Worker
              |------ AEMET/RAIF/SIGPAC
              |------ correo/push
              |------ IA futura
```

El navegador se considera cliente no confiable para autorización.

## Amenaza: acceso cross-holding

### Riesgo
Usuario autenticado modifica un ID y accede a finca/documento de otro agricultor.

### Controles
- autorización server-side en cada query/mutation;
- relación `holding_members`;
- pruebas negativas automáticas;
- considerar RLS PostgreSQL como defensa adicional;
- URLs de documentos temporales ligadas a autorización.

### Severidad
Crítica.

## Amenaza: IDOR en documentos

### Riesgo
Adivinar/cambiar ID de ticket y obtener PDF ajeno.

### Controles
- bucket privado;
- nunca URL pública permanente;
- endpoint autorizado que genera URL temporal;
- storage keys no secuenciales/predecibles;
- tests cross-holding.

## Amenaza: duplicación por offline/reintento

### Riesgo
Una entrega se guarda dos veces y altera kilos/rendimiento.

### Controles
- idempotency key;
- client_generated_id;
- request hash;
- unique constraints apropiadas;
- UI de sincronización;
- tests de timeout antes/después de commit.

## Amenaza: pérdida de escritura offline

### Riesgo
Actualización PWA/logout/limpieza borra una entrega aún no sincronizada.

### Controles
- IndexedDB versionada;
- outbox namespaced por usuario/holding;
- no borrar en actualización;
- warning al logout con pendientes;
- migraciones locales testeadas.

## Amenaza: secuestro de sesión

### Controles
- cookie HttpOnly/Secure;
- HTTPS;
- SameSite/CSRF/origin checks;
- expiración y revocación;
- rotación de secretos;
- no tokens en localStorage;
- invalidación tras eventos sensibles cuando proceda.

## Amenaza: credential stuffing / fuerza bruta

### Controles
- rate limiting login/reset;
- mensajes sin enumeración de cuentas;
- alertas agregadas;
- futura opción 2FA/passkey si piloto/uso lo exige;
- contraseñas gestionadas por librería segura.

## Amenaza: subida maliciosa de archivos

### Riesgo
Usuario/subida comprometida intenta almacenar HTML ejecutable, malware o archivos gigantes.

### Controles
- allowlist de tipos/tamaños;
- verificar MIME real cuando sea viable;
- nombres internos generados;
- Content-Disposition forzada en descargas sensibles;
- no servir archivos desde el mismo origen ejecutable sin headers seguros;
- considerar escaneo antimalware según riesgo/escala;
- cuotas por usuario/holding.

## Amenaza: CSV/XLSX/PDF malicioso

### Controles
- parseo en worker aislado;
- límites de tamaño/filas/tiempo;
- no ejecutar macros;
- staging antes de commit;
- sanitizar fórmulas al exportar CSV para evitar spreadsheet injection;
- parser versionado.

## Amenaza: importación sobrescribe verdad

### Controles
- no modificar directamente sin preview/commit;
- procedencia del dato;
- detección de conflictos;
- historial/supersede para resultados;
- confirmación humana cuando haya discrepancias.

## Amenaza: proveedor externo comprometido/erróneo

Ejemplos: respuesta inesperada de AEMET/RAIF o futura API de almazara.

### Controles
- adapters;
- schema validation;
- timeout;
- circuit breaker/reintentos prudentes;
- caché última válida;
- datos externos informativos no pueden modificar entregas privadas sin flujo autorizado.

## Amenaza: SSRF

### Riesgo
Importador/admin acepta URL arbitraria y backend descarga recursos internos.

### Controles
- V1 no ofrece fetch arbitrario por URL;
- allowlist explícita para fuentes oficiales;
- bloquear IPs privadas/metadata endpoints si en futuro se permite fetch externo.

## Amenaza: XSS

### Controles
- React escaping por defecto;
- no `dangerouslySetInnerHTML` con contenido usuario/fuente externa;
- sanitización si se necesita HTML;
- CSP en producción;
- documentos servidos con headers apropiados.

## Amenaza: SQL injection

### Controles
- queries parametrizadas/query builder;
- no concatenación de SQL con entrada usuario;
- permisos DB mínimos;
- tests/adversarial cases.

## Amenaza: CSRF

### Controles
Ver `AUTH_SESSION_V1.md`:
- SameSite;
- Origin/Host;
- CORS restrictivo;
- mecanismo del framework si aplica.

## Amenaza: abuso de IA futura

### Controles
- IA solo backend;
- mínimo contexto;
- documentos no se envían por defecto sin acción/consentimiento adecuado;
- respuestas estructuradas validadas;
- nunca escritura crítica automática;
- límites de coste/uso;
- prompt injection de documentos tratada como contenido no confiable.

## Amenaza: secreto filtrado en repositorio

### Controles
- `.env.example` ficticio;
- secret scanning CI cuando se configure;
- secretos solo entorno/manager;
- rotación inmediata ante incidente;
- GitHub público implica extrema disciplina: ningún dato/clave real en commits.

## Amenaza: backup expuesto

### Controles
- backup cifrado o ubicación con control de acceso fuerte;
- fuera del host principal;
- credenciales separadas;
- restauración controlada;
- no dejar dumps en webroot/carpetas públicas.

## Amenaza: administrador interno

### Controles
- mínimo número de admins;
- acciones administrativas auditadas;
- no panel con capacidad de leer documentos privados por defecto si no es imprescindible;
- soporte basado en metadata/request ID;
- acceso excepcional documentado.

## Amenaza: pérdida/robo de móvil

### Controles
- sesión revocable;
- datos offline limitados a lo necesario;
- no cachear documentos masivamente;
- logout remoto futuro;
- no mostrar datos sensibles en notificaciones push.

## Amenaza: manipulación de reloj/zona horaria

### Controles
- guardar eventos con `timestamptz`;
- conservar timezone de usuario/contexto cuando sea relevante;
- timestamps de auditoría generados en servidor;
- no confiar en `created_at` enviado por cliente.

El usuario sí puede registrar `performed_at/delivered_at` histórico, pero queda separado de `created_at`.

## Amenaza: borrado accidental

### Controles
- archive lógico para registros agrícolas importantes;
- confirmaciones razonables;
- permisos;
- backups;
- audit;
- restore probado.

## Prioridades antes del piloto

P0:
- cross-holding;
- sesiones/cookies;
- documentos privados;
- idempotencia offline;
- backups;
- secretos;
- uploads.

P1:
- importadores;
- rate limiting;
- observabilidad de seguridad;
- CSP/headers;
- RLS spike.

P2 posterior:
- 2FA/passkeys;
- malware scanning avanzado;
- SIEM/alerting sofisticado;
- pentest externo antes de escala comercial relevante.

## Gate de seguridad del spike

No avanzar a piloto real si se puede demostrar cualquiera de estos fallos:
- ver recurso de otro holding cambiando ID;
- descargar ticket ajeno;
- duplicar entrega mediante retry normal;
- perder outbox al actualizar PWA;
- secreto en bundle frontend;
- restore incapaz de reconstruir datos/documentos críticos.
