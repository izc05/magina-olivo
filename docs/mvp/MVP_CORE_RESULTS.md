# Mágina Olivo — MVP Core Results

Estado: **V1 funcional en desarrollo, PR #3 Draft**.

Rama: `feat/mvp-core-v1`  
Base: `feat/technical-spike-v1`

## Última regresión verde

- workflow: `MVP Core Smoke`
- run: `33713395781` (#48)
- conclusión: `success`

La regresión valida sobre el estado actual:

- `npm ci` reproducible;
- TypeScript strict;
- unit tests, incluidos delivery y labor offline;
- build PWA;
- inspección del bundle para impedir secretos de servidor.

## Recorrido usable implementado

```text
Login
  -> Inicio
  -> Mi Campo
     -> Explotación
     -> Finca
     -> Parcela
     -> Labor
     -> Historia de parcela
        -> Labores
        -> Entregas
        -> Rendimientos
  -> botón central + / Campaña
     -> Campaña
     -> Entrega
        -> Finca
        -> Parcela dependiente
        -> Ticket privado opcional
     -> Rendimiento posterior
     -> Resumen
  -> Mágina
  -> Mi Mágina
```

### Identidad y navegación

El MVP sigue la Biblia Visual V2 del proyecto:

- marfil `#F4F1E6`;
- verde oscuro `#2E3A22`;
- verde olivar `#5C7A46`;
- verde suave `#A7B497`;
- dorado `#D4A017`;
- familias tipográficas declaradas Playfair Display + Inter con fallbacks;
- tarjetas limpias;
- mobile-first;
- barra fija V2: `Inicio · Mi Campo · + · Mágina · Mi Mágina`.

No se ha creado otro logo. El asset gráfico aprobado en el flujo visual se importará como recurso único cuando esté disponible.

### Identidad / cuenta

Implementado:

- sesión real Better Auth;
- login;
- logout;
- petición de recuperación de contraseña;
- `/reset-password?token=...` para completar el cambio;
- mensajes públicos que no revelan si un email existe;
- sesiones anteriores revocadas por el backend tras reset, según el gate técnico ya validado.

### Inicio

El dashboard consume datos reales de la API y muestra:

- campaña activa;
- kilos entregados;
- rendimiento ponderado;
- número de entregas;
- entregas pendientes de rendimiento;
- cobertura explícita del rendimiento;
- accesos rápidos.

No calcula métricas críticas en el navegador: reutiliza el resumen determinista del backend.

### Mi Campo

La UI permite:

- crear/seleccionar explotación;
- crear/seleccionar finca;
- crear parcela;
- guardar superficie;
- referencia SIGPAC opcional;
- número de olivos;
- secano/regadío/mixto;
- consultar las parcelas de la finca activa;
- registrar labores por parcela;
- asociar una labor opcionalmente a campaña;
- guardar superficie afectada y coste;
- guardar producto, cantidad y unidad para tratamiento, abonado o riego;
- guardar referencia de producto fitosanitario en tratamientos;
- añadir notas y observaciones;
- consultar una historia única por parcela con labores, entregas y rendimientos.

Tipos de labor V1:

`Tratamiento · Abonado · Poda · Desbroce · Laboreo · Riego · Recolección · Mantenimiento · Plantación/reposición · Análisis/muestreo · Observación · Otra`

La `Recolección` sigue siendo una labor de campo y **no** sustituye una `Entrega` oficial de campaña.

El cuaderno V1 es personal. Guardar estos datos no constituye por sí mismo una anotación oficial CUE/SIEX.

### Campaña, entregas y documentos

La UI permite:

- crear/seleccionar campaña;
- registrar kilos;
- destino de almazara/cooperativa;
- fecha/hora;
- ticket textual;
- variedad y notas;
- finca opcional;
- cargar únicamente parcelas pertenecientes a la finca seleccionada;
- generar `clientGeneratedId`;
- usar el mismo valor como `Idempotency-Key` para la entrega;
- consultar entregas;
- añadir un rendimiento posterior a una entrega;
- refrescar el resumen de campaña;
- adjuntar JPG, PNG, WEBP o PDF del ticket, máximo 10 MB;
- guardar el ticket en almacenamiento privado y vincularlo a la entrega;
- adjuntar el ticket posteriormente a una entrega existente.

El backend sigue validando también la coherencia finca/parcela, de forma que la UI no es la única barrera de integridad.

### Offline

La integración de campo cubre ya **entregas y labores**:

- una entrega creada sin conexión entra en la outbox IndexedDB;
- una labor creada sin conexión entra en la misma outbox, separada por tipo de operación;
- ambas operaciones quedan aisladas por usuario;
- el banner distingue cuántas pendientes son `entregas` y cuántas son `labores`;
- al recuperar red se intenta sincronizar automáticamente;
- existe botón manual `Sincronizar`;
- tras sincronización se emite `magina:sync-complete`;
- la campaña se refresca después de sincronizar entregas;
- la historia de parcela se refresca después de sincronizar labores;
- existen avisos específicos `Entrega guardada en este móvil` y `Labor guardada en este móvil`;
- otro aviso confirma la sincronización terminada;
- los reintentos de entrega conservan su `Idempotency-Key`;
- las labores usan un `clientGeneratedId` estable como UUID de dominio para que un reintento ambiguo no cree una segunda labor;
- las operaciones solo se eliminan de la outbox después de una respuesta HTTP satisfactoria;
- una respuesta no-2xx mantiene la operación pendiente y registra intento/error;
- cambiar de usuario no expone ni sincroniza operaciones pendientes de otro usuario;
- una actualización PWA se aplaza mientras haya outbox pendiente.

Las lecturas recientes de esta sesión usan únicamente una caché privada en memoria; al hacer logout se borra. La outbox sí es persistente.

### Archivos y offline

Los tickets/fotos **no se guardan todavía en IndexedDB**. Es una decisión deliberada:

- el registro de entrega puede quedar seguro offline;
- el archivo privado requiere conexión;
- si se seleccionó archivo mientras la entrega quedó en outbox, la UI avisa de que el archivo no se ha subido;
- una vez sincronizada la entrega puede adjuntarse el ticket desde la propia fila.

Esto evita persistir archivos privados grandes en el navegador antes de definir una política explícita de cifrado, retención y espacio.

## Pendientes P0 del núcleo

Antes de considerar este recorrido listo para piloto:

1. decidir y probar política segura de lectura `cold-start` offline para datos privados;
2. integrar el logo gráfico aprobado real;
3. completar accesibilidad/teclado/lector de pantalla del recorrido;
4. añadir pruebas browser/end-to-end cuando exista staging real;
5. ejecutar los gates externos HTTPS/R2/correo/restore definidos por el spike técnico;
6. validar el flujo con 2–5 olivareros usando datos sintéticos o documentos anonimizados antes de introducir información real.

Ya cerrados respecto a la primera versión del MVP:

- dependencia `Finca -> Parcelas` en nueva entrega;
- foto/ticket privado en la UI;
- labores de campo;
- timeline de parcela;
- delivery offline;
- labor offline;
- avisos y conteo visible de sincronización pendiente.

## Regla de datos reales

Este PR continúa usando únicamente datos sintéticos en validación. No introducir datos reales de agricultores hasta superar los gates de staging externo definidos en `docs/spike/EXTERNAL_STAGING_RUNBOOK.md`.
