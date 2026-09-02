# Plan de backup y restauración — Mágina Olivo

Fecha: 2026-09-02

## Principio

La copia de seguridad no está validada hasta que una restauración completa ha sido probada.

Mágina Olivo tendrá dos tipos de datos:

1. PostgreSQL: datos estructurados, relaciones, permisos, metadatos.
2. Object storage: tickets, fotos, PDFs y otros archivos.

Ambos deben recuperarse de forma coherente.

## Objetivos iniciales

### Piloto

Objetivos propuestos:
- RPO: <= 24 h para desastre total de infraestructura;
- RTO: <= 4 h durante ventana de soporte razonable;
- cero pérdida aceptada por fallos normales de sincronización dentro de la aplicación.

RPO de desastre no debe confundirse con sincronización offline: una entrega pendiente debe mantenerse en el dispositivo hasta que el servidor confirme recepción.

### V1 pública

Reevaluar según uso real.

Objetivo candidato:
- RPO <= 1 h para datos estructurados;
- RTO <= 2 h;
- documentos con estrategia independiente y comprobación de integridad.

No prometer SLA comercial antes de tener infraestructura y pruebas que lo sostengan.

## PostgreSQL

### Piloto

- backup lógico automatizado diario;
- archivo comprimido;
- cifrado antes/durante almacenamiento según mecanismo elegido;
- checksum;
- retención rotatoria;
- copia fuera del host principal.

Retención candidata:
- 7 diarios;
- 4 semanales;
- 3 mensuales durante piloto si el volumen lo permite.

### V1 pública

Evaluar:
- backups más frecuentes;
- WAL/PITR;
- réplica/servicio gestionado;
- monitorización del job de backup.

No introducir PITR antes de entender operación y costes, pero la arquitectura no debe impedirlo.

## Object storage

Los metadatos de PostgreSQL no sustituyen a los bytes originales.

Requisitos:
- cada objeto tiene hash cuando sea práctico;
- `storage_key` no depende del nombre original;
- evitar sobreescritura destructiva: nuevos documentos generan nuevos objetos/versiones lógicas;
- borrado definitivo pasa por política separada;
- copia secundaria/export periódica para documentos críticos antes de V1 pública.

No asumir que alta durabilidad del proveedor elimina la necesidad de recuperación frente a:
- borrado accidental;
- credenciales comprometidas;
- bug de aplicación;
- borrado lógico mal implementado;
- cambio de proveedor.

## Consistencia BD/archivos

### Upload

1. crear upload intent;
2. subir objeto;
3. verificar tamaño/hash si aplica;
4. crear/confirmar metadata;
5. vincular documento a entidad.

Si falla después del upload pero antes de metadata, el objeto queda `orphan candidate` y un job puede limpiarlo tras periodo seguro.

### Delete

No borrar binario inmediatamente al quitar un vínculo.

Separar:
- unlink;
- archive;
- delete request;
- physical delete.

Esto reduce pérdida irreversible por errores de UI.

## Restauración de prueba

Frecuencia piloto: al menos una restauración completa antes de incorporar agricultores reales y después de cambios sustanciales en backup.

Procedimiento:

1. crear entorno limpio;
2. restaurar PostgreSQL;
3. restaurar/conectar copia de object storage;
4. ejecutar migraciones necesarias de la versión restaurada;
5. validar recuentos;
6. validar muestras de hashes/documentos;
7. iniciar API;
8. login con usuario sintético de prueba;
9. abrir campaña/entregas/documento;
10. registrar resultado en informe de restore.

## Dataset canario

Mantener datos sintéticos conocidos para comprobar restore:
- 1 explotación;
- 2 fincas;
- 3 parcelas;
- 1 campaña;
- 3 entregas;
- 2 resultados;
- 2 labores;
- 2 documentos pequeños con hash conocido.

El restore test valida automáticamente que estos elementos están presentes y relacionados.

## Secretos

Los backups de datos no incluyen como texto plano:
- claves AEMET;
- credenciales R2;
- secrets de auth;
- tokens de email/IA.

Los secretos se recuperan desde su mecanismo separado y documentado.

## Acceso a backups

Principio de mínimo privilegio.

La cuenta de aplicación normal no debe poder borrar toda la colección histórica de backups.

Separar credenciales cuando la infraestructura elegida lo permita.

## Monitoring

Cada backup genera estado:
- start/end;
- bytes;
- checksum;
- destino;
- success/failure;
- error code sanitizado.

Alertar si:
- no existe backup válido en ventana esperada;
- tamaño cambia de forma anómala;
- checksum falla;
- destino no responde.

## Prueba de desastre mínima

Simular al menos:
- PostgreSQL perdido;
- API redeploy desde cero;
- documento eliminado del host local;
- restauración en host distinto.

## RGPD / borrado

La retención de backups debe conciliarse con solicitudes de supresión y obligaciones de conservación aplicables.

Antes de V1 pública, definir procedimiento jurídico/técnico para datos eliminados que puedan permanecer temporalmente en backups inmutables/rotatorios.

## Checklist antes de piloto real

- [ ] backup automatizado existe;
- [ ] backup fuera del host principal;
- [ ] restore en entorno limpio pasa;
- [ ] dataset canario validado;
- [ ] documentos recuperables;
- [ ] secrets recuperables por vía separada;
- [ ] procedimiento escrito y repetible;
- [ ] una persona puede ejecutar restore sin improvisar comandos críticos.