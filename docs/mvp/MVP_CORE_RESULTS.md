# Mágina Olivo — MVP Core Results

Estado: **V1 funcional en desarrollo, PR #3 Draft**.

Rama: `feat/mvp-core-v1`
Base: `feat/technical-spike-v1`

## Última regresión verde

- workflow: `MVP Core Smoke`
- run: `33689107767` (#24)
- conclusión: `success`

La regresión valida:

- `npm ci` reproducible;
- TypeScript strict;
- unit tests;
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
  -> botón central + / Campaña
     -> Campaña
     -> Entrega
     -> Rendimiento
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
- consultar las parcelas de la finca activa.

### Campaña y entregas

La UI permite:

- crear/seleccionar campaña;
- registrar kilos;
- destino de almazara/cooperativa;
- fecha/hora;
- ticket textual;
- finca/parcela opcional;
- generar `clientGeneratedId`;
- usar el mismo valor como `Idempotency-Key`;
- consultar entregas;
- añadir un rendimiento posterior a una entrega;
- refrescar el resumen de campaña.

### Offline

La primera integración de campo ya está activa:

- si el móvil está offline, una nueva entrega se guarda en la outbox IndexedDB existente;
- la operación sigue estando asociada al usuario de la sesión;
- conserva `Idempotency-Key`;
- el banner superior informa de falta de conexión y operaciones pendientes;
- al recuperar red se intenta sincronizar;
- existe botón manual `Sincronizar`;
- tras sincronización se emite `magina:sync-complete` y la campaña se refresca;
- un aviso confirma `Entrega guardada en este móvil`;
- otro aviso confirma sincronización terminada;
- lecturas recientes de esta sesión usan únicamente una caché privada en memoria; al hacer logout se borra.

La outbox sí es persistente; la caché de lecturas no lo es. El arranque completamente offline después de cerrar la app sigue pendiente de una política explícita para datos privados.

## Pendientes P0 del núcleo

Antes de considerar este recorrido listo para piloto:

1. hacer dependiente `Finca -> Parcelas` dentro del formulario de nueva entrega;
2. integrar foto/ticket privado en la UI de entrega;
3. estado visual específico del delivery recién encolado hasta sincronización;
4. decidir y probar política segura de lectura cold-start offline;
5. integrar el logo gráfico aprobado real;
6. añadir labores de campo y timeline de parcela;
7. completar accesibilidad/teclado/lector de pantalla del recorrido;
8. añadir pruebas browser/end-to-end cuando exista staging real;
9. ejecutar los gates externos HTTPS/R2/correo/restore definidos por el spike técnico.

## Regla de datos reales

Este PR continúa usando únicamente datos sintéticos en validación. No introducir datos reales de agricultores hasta superar los gates de staging externo definidos en `docs/spike/EXTERNAL_STAGING_RUNBOOK.md`.
