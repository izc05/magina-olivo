# Mágina Olivo — Soporte, legal y sistema

## Alcance

Este bloque añade gestión operativa sin abrir acceso directo a datos agrícolas privados ni a comandos destructivos del servidor.

Rutas principales:

- `/contacto`: formulario público de contacto.
- `/legal/privacidad`, `/legal/cookies`, `/legal/terminos`: documentos legales publicados.
- `/admin/soporte`: bandeja de soporte, documentos legales y evidencias de sistema.

## Contacto y soporte

El formulario público permite consultas de:

- soporte;
- comercial/publicidad;
- privacidad;
- derechos sobre datos;
- otros asuntos.

V1 no admite adjuntos. El formulario advierte expresamente que no deben enviarse contraseñas, códigos de acceso ni tokens.

Los tickets usan los estados `new`, `in_progress`, `waiting_user`, `resolved` y `closed`, y prioridades `normal`, `high` y `urgent`.

El administrador puede cambiar estado/prioridad y añadir notas internas. Las acciones relevantes quedan en auditoría de plataforma.

## Documentos legales

`legal_documents` contiene versiones de:

- privacidad;
- cookies;
- términos y condiciones.

Estados: `draft`, `active`, `archived`.

Solo puede existir una versión activa por tipo. Activar una versión archiva automáticamente la anterior dentro de la misma transacción.

No se incluye ningún texto jurídico predefinido. Si no hay versión activa, la página pública indica que el documento todavía no está publicado. Esto evita que un borrador técnico se convierta accidentalmente en texto legal de producción.

Las aceptaciones de usuarios se registran por documento/version exacta en `legal_acceptances`.

Antes de producción, los textos deberán ser revisados y activados expresamente.

## Evidencia operativa

`system_operational_evidence` registra estado/evidencia para:

- backup de PostgreSQL;
- backup de objetos/documentos privados;
- simulacro de restauración;
- despliegue y rollback.

Todos parten de `unknown`. El panel no afirma que existe una copia correcta si aún no hay evidencia real.

El repositorio mantiene las operaciones reales en scripts como:

- `scripts/staging-backup.sh`;
- `scripts/staging-restore-gate.sh`.

### Regla de seguridad crítica

**No existe un endpoint web que ejecute restauraciones.**

El panel solo consulta o registra evidencia. Restore y recuperación permanecen como operación CLI/host controlada, con los guardas de staging existentes.

## Privacidad

La bandeja de soporte contiene los datos que el propio remitente introduce para recibir atención. No requiere parcela, coordenadas, entrega, rendimiento, documento agrícola ni información de explotación.

Las notas internas no se exponen en el endpoint público.

## Staging

Este incremento permanece apilado fuera del candidato V6. Debe superar los gates acumulados antes de considerarse listo para una futura integración post-staging.
