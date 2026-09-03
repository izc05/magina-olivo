# Mágina Olivo — MVP Core Results

Estado: **V1 funcional en desarrollo, PR #3 Draft**.

Rama: `feat/mvp-core-v1`  
Base: `feat/technical-spike-v1`

## Última regresión verde de código

- workflow: `MVP Core Smoke`
- run: `33715150669` (#71)
- conclusión: `success`

La regresión valida sobre el estado actual:

- `npm ci` reproducible;
- TypeScript strict;
- unit tests, incluidos delivery/labor offline y regresiones de accesibilidad;
- validación sintáctica del gate de staging `scripts/mvp-core-flow-gate.sh`;
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

El MVP usa ya la identidad oficial V2 del proyecto:

- logo oficial importado desde `feat/visual-v2-foundation` sin redibujarlo;
- activo: `apps/web/public/brand/magina-olivo-mark.svg`;
- concepto del isotipo: rama de olivo + paisaje de Sierra Mágina + gota dorada de aceite;
- marfil `#F4F1E6`;
- verde oscuro `#2E3A22`;
- verde olivar `#5C7A46`;
- verde suave `#A7B497`;
- dorado `#D4A017`;
- Playfair Display + Inter con fallbacks;
- tarjetas limpias;
- mobile-first;
- barra fija V2: `Inicio · Mi Campo · + · Mágina · Mi Mágina`.

El mismo isotipo oficial se utiliza también en el manifest de la PWA para evitar una identidad distinta al instalarla.

### Identidad / cuenta

Implementado:

- sesión real Better Auth;
- login;
- logout;
- petición de recuperación de contraseña;
- `/reset-password?token=...` para completar el cambio;
- mensajes públicos que no revelan si un email existe;
- sesiones anteriores revocadas por el backend tras reset, según el gate técnico ya validado;
- logout bloqueado si existen operaciones privadas pendientes de sincronizar.

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
- las labores usan un `clientGeneratedId` estable para que un reintento ambiguo no cree una segunda labor;
- las operaciones solo se eliminan de la outbox después de una respuesta HTTP satisfactoria;
- una respuesta no-2xx mantiene la operación pendiente y registra intento/error;
- cambiar de usuario no expone ni sincroniza operaciones pendientes de otro usuario;
- una actualización PWA se aplaza mientras haya outbox pendiente.

Las lecturas recientes de una sesión abierta usan únicamente una caché privada en memoria. La outbox sí es persistente.

### Cold-start offline protegido

El P0 de arranque en frío offline queda cerrado para el piloto V1 con política **fail closed**:

- si la PWA se reabre sin conexión y existe identidad local previa, no simula un logout definitivo;
- entra en `Modo protegido`;
- no persiste ni muestra una réplica completa en claro de fincas/campañas privadas;
- muestra únicamente el conteo de operaciones pendientes de la outbox del propietario local;
- las operaciones pendientes permanecen intactas;
- cuando vuelve la red se revalida la sesión online;
- no se permite cerrar sesión con operaciones pendientes.

La política queda documentada en `docs/OFFLINE_SYNC_SPEC.md`.

### Archivos y offline

Los tickets/fotos **no se guardan todavía en IndexedDB**. Es una decisión deliberada:

- el registro de entrega puede quedar seguro offline;
- el archivo privado requiere conexión;
- si se seleccionó archivo mientras la entrega quedó en outbox, la UI avisa de que el archivo no se ha subido;
- una vez sincronizada la entrega puede adjuntarse el ticket desde la propia fila.

### Accesibilidad V1

Aplicado en código:

- `aria-current` para sección activa;
- `aria-pressed` para finca seleccionada;
- foco programático al contenido principal tras cambiar de sección;
- foco visible de alto contraste mediante `:focus-visible`;
- controles críticos con objetivos táctiles aproximados de al menos 44 px;
- adjunto posterior de ticket mediante botón real operable con teclado;
- estados de upload y guardado con `aria-live`, `aria-busy` y `role=alert/status` donde corresponde;
- soporte `prefers-reduced-motion`;
- mejora para `forced-colors`;
- campo de rendimiento con nombre accesible e `inputMode=decimal`.

Existe además `apps/web/src/accessibility-source.test.ts` para detectar regresiones básicas de estas garantías dentro del CI.

Gate manual: `docs/mvp/ACCESSIBILITY_GATE_V1.md`.

La parte de código está verde. La accesibilidad **no se declara auditada completamente** hasta probar teclado + TalkBack/NVDA + zoom/reflow en staging real.

### Staging preparado

Se añadió `scripts/mvp-core-flow-gate.sh`, cuya sintaxis ya forma parte de `MVP Core Smoke`.

Cuando exista staging real, el gate sintético comprobará:

- dos usuarios aislados;
- explotación -> finca -> parcela -> campaña;
- entrega de 1.842 kg e idempotencia;
- rendimiento posterior 21,9 %;
- labor retry-safe;
- timeline con labor + entrega + rendimiento;
- resumen determinista de 1.842 kg, cobertura 100 % y rendimiento ponderado 21,9 %;
- ticket PDF privado y roundtrip de bytes;
- bloqueo de acceso al timeline/documento desde el segundo usuario.

Orden completo: `docs/mvp/STAGING_ACCEPTANCE_V1.md`.

## Pendientes P0 antes de piloto

Los pendientes que quedan requieren ya entorno o personas reales de validación:

1. ejecutar el gate funcional sintético contra staging real;
2. ejecutar HTTPS/R2/correo/restore del runbook externo;
3. ejecutar teclado + TalkBack/NVDA + zoom/reflow sobre staging;
4. añadir/ejecutar browser E2E sobre staging real;
5. validar el flujo con 2–5 olivareros usando datos sintéticos o documentos anonimizados antes de introducir información real.

Ya cerrados en código:

- logo oficial V2 integrado;
- dependencia `Finca -> Parcelas` en nueva entrega;
- foto/ticket privado en UI;
- labores de campo;
- timeline de parcela;
- delivery offline;
- labor offline;
- avisos y conteo visible de sincronización pendiente;
- cold-start offline protegido;
- base de accesibilidad por teclado/lector de pantalla;
- tests automáticos de regresión accesible;
- gate sintético de recorrido MVP preparado para staging.

## Regla de datos reales

Este PR continúa usando únicamente datos sintéticos en validación. No introducir datos reales de agricultores hasta superar los gates de staging externo definidos en `docs/spike/EXTERNAL_STAGING_RUNBOOK.md` y `docs/mvp/STAGING_ACCEPTANCE_V1.md`.
