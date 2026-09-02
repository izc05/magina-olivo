# Retención, archivo y supresión V1 — Mágina Olivo

Estado: diseño previo a revisión jurídica específica.

## Principio

No confundir:
- archivar un registro agrícola;
- borrar un documento;
- cerrar una campaña;
- eliminar una cuenta;
- ejercer un derecho de supresión.

Cada acción tiene consecuencias distintas.

## Registros agrícolas operativos

Entregas, resultados, labores, fincas y parcelas importantes deben preferir archivo lógico cuando una eliminación inmediata rompería trazabilidad.

Campos candidatos:
- `archived_at`;
- `archived_by` mediante audit;
- motivo opcional.

Un registro archivado:
- desaparece de vistas activas;
- no entra en agregados activos;
- conserva historial y audit según política.

## Corrección vs borrado

### Error simple editable

Ejemplo: ticket `4281` escrito como `428I`.

Puede editarse con versión/audit.

### Resultado sustituido

Ejemplo: rendimiento provisional 21,5 corregido a 21,7.

Usar `supersedes`/historial, no destruir la procedencia anterior cuando sea relevante.

### Duplicado

Confirmar qué registro es canónico y excluir/archivar el duplicado.

No eliminar automáticamente por similitud.

## Documentos

Un documento privado puede tener ciclo:

`pending -> available -> deleted/quarantined`

Al solicitar borrado normal:
1. comprobar permisos;
2. retirar enlaces/acceso;
3. borrar objeto según política;
4. registrar metadata mínima de audit si existe base jurídica/legítima;
5. respetar backups hasta expiración normal de retención, con procedimiento de no reintroducción activa tras restore cuando corresponda.

## Backups y supresión

Los backups no deben convertirse en archivos eternos.

Definir:
- retención limitada;
- rotación;
- control de acceso;
- qué ocurre si se restaura un backup que contiene datos posteriormente suprimidos.

Estrategia candidata:
- backups inmutables por ventana corta/razonable;
- ledger/lista de supresiones aplicable después de restore si jurídicamente corresponde;
- no restaurar backups antiguos a producción salvo incidente.

La implementación final se revisará jurídicamente.

## Cierre de campaña

Cerrar campaña:
- impide cambios accidentales;
- no equivale a borrado;
- permite corrección autorizada posterior;
- conserva años de histórico.

## Cuenta de usuario

Flujo de eliminación voluntaria candidato:
1. explicar consecuencias;
2. ofrecer exportación;
3. reautenticar si procede;
4. comprobar ownership de holdings;
5. resolver transferencia/eliminación si hay más miembros;
6. iniciar solicitud de supresión;
7. revocar sesiones;
8. procesar datos según política/base jurídica;
9. notificar finalización.

No permitir que borrar un usuario deje un holding multiusuario huérfano sin resolución.

## Single-owner piloto

En piloto inicial, si solo existe owner:
- eliminar cuenta puede implicar eliminar/anonimizar holding y datos relacionados según política;
- confirmar expresamente;
- documentos incluidos;
- exportación disponible previamente.

## Derechos de supresión

La AEPD señala que el derecho de supresión puede proceder en distintos supuestos, pero no es ilimitado: existen excepciones, entre otras, cuando el tratamiento sea necesario para cumplir obligaciones legales o para formular, ejercer o defender reclamaciones.

Por tanto, Mágina Olivo no debe prometer técnicamente «borrado instantáneo absoluto de toda copia» sin revisar las obligaciones aplicables.

Antes del piloto real se definirá:
- responsable del tratamiento;
- canal de derechos;
- plazos/procedimiento;
- bases jurídicas;
- excepciones de conservación;
- encargados/subencargados;
- retención backup/log/audit.

## Logs

Retención diferenciada:
- debug: mínima;
- operativos: limitada;
- seguridad: según necesidad;
- audit: según finalidad documentada.

No almacenar contenido agrícola privado en logs para evitar complicar derechos y seguridad.

## Datos externos públicos

RAIF/AEMET/SIGPAC cacheados:
- conservar solo lo permitido/necesario;
- aplicar licencias/atribución;
- no tratarlos como datos personales del usuario salvo combinación/contexto que lo convierta en tal.

## Import staging

Datos de importación fallida/cancelada no deben quedar indefinidamente.

Política candidata:
- staging temporal;
- job de limpieza;
- conservar solo metadata/error mínima útil;
- documentos originales según decisión del usuario y política.

## Exportaciones generadas

ZIP/CSV preparados para descarga:
- temporales;
- storage privado;
- expiración automática;
- borrado posterior.

No guardar para siempre cada exportación.

## Cuenta suspendida

Suspensión por seguridad/no pago futuro no equivale a borrado.

Mantener estado separado:
- active;
- suspended;
- deletion_pending;
- deleted/anonimizado según diseño.

No implementar monetización antes de validar producto, pero evitar usar `deleted` para todo.

## Datos anonimizados

Solo considerar un dato realmente anonimizado si no permite reidentificar razonablemente al agricultor.

Quitar nombre/email no basta necesariamente si quedan parcela, coordenadas, documentos u otros identificadores.

No usar «anonimización» como atajo sin análisis.

## Criterios antes de producción

- [ ] tabla/matriz de retención por categoría;
- [ ] flujo de exportación;
- [ ] flujo de eliminación de cuenta;
- [ ] política de documentos;
- [ ] retención de backups;
- [ ] limpieza import staging;
- [ ] limpieza exports temporales;
- [ ] revocación de sesiones;
- [ ] proceso tras restore para datos suprimidos;
- [ ] revisión jurídica específica.

## Regla de diseño

Cuando exista duda entre «borrar para siempre» y «ocultar/archivar», el producto debe nombrar la acción con precisión y explicar su efecto.

Nunca presentar un botón «Eliminar» si técnicamente solo archiva sin informar al usuario.
