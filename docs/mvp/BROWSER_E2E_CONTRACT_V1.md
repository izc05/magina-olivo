# Mágina Olivo — Browser E2E Contract V1

Estado: **contrato preparado; runner browser pendiente de staging**.

## Objetivo

Definir qué debe demostrar un navegador real antes del piloto para no reducir E2E a comprobar que una página abre.

Este contrato es independiente del runner. La rama visual ya utiliza Playwright, pero el MVP no añadirá esa dependencia hasta decidir el entorno de staging y evitar modificar el lockfile sin necesidad.

## Datos

Todos los escenarios usarán usuarios y registros sintéticos únicos por ejecución.

Prohibido usar:

- datos reales de agricultores;
- documentos reales;
- credenciales de cooperativas;
- tokens o secretos codificados en el test.

## Escenario 1 — Login y navegación

1. Abrir `/`.
2. Iniciar sesión con usuario sintético.
3. Confirmar que se muestra `Inicio`.
4. Activar `Mi Campo`.
5. Activar botón central `+`.
6. Activar `Mágina`.
7. Activar `Mi Mágina`.
8. Confirmar que en cada cambio solo la sección correspondiente expone estado actual.
9. Confirmar que el foco pasa al contenido principal.

## Escenario 2 — Primera estructura agrícola

Partiendo de una cuenta vacía:

1. crear explotación `Explotación E2E`;
2. crear finca `Las Viñas E2E`, 3,25 ha;
3. crear parcela `Parcela Norte E2E`, 1,75 ha, 210 olivos, secano;
4. confirmar que la parcela aparece bajo la finca correcta;
5. cambiar de finca y comprobar que no aparecen parcelas ajenas.

## Escenario 3 — Campaña y entrega

1. crear campaña sintética 2026/27;
2. abrir nueva entrega;
3. seleccionar `Las Viñas E2E`;
4. confirmar que el selector de parcela carga únicamente sus parcelas;
5. registrar 1.842 kg;
6. destino `Almazara E2E`;
7. ticket `004281`;
8. variedad `Picual`;
9. guardar;
10. comprobar una única entrega visible;
11. comprobar que el dashboard/resumen se actualiza.

## Escenario 4 — Rendimiento posterior

1. localizar la entrega de 1.842 kg;
2. añadir 21,90 %;
3. comprobar que el resumen muestra cobertura 100 %;
4. comprobar rendimiento ponderado 21,9 %;
5. comprobar que el timeline de parcela incorpora el rendimiento por separado.

## Escenario 5 — Labor

1. ir a `Mi Campo`;
2. seleccionar `Parcela Norte E2E`;
3. crear labor `Poda`;
4. coste 85,50 €;
5. notas `Poda sintética E2E`;
6. guardar;
7. comprobar que aparece una vez en la historia;
8. comprobar que `Recolección` y `Entrega` siguen siendo conceptos distintos en UI.

## Escenario 6 — Ticket privado

1. seleccionar un PDF sintético pequeño;
2. adjuntarlo a la entrega;
3. comprobar mensaje de éxito;
4. comprobar por API autenticada que el documento está vinculado a esa entrega;
5. con segundo usuario, confirmar que documento y contenido devuelven 404.

## Escenario 7 — Entrega offline

1. sesión online válida;
2. pasar el contexto del navegador a offline;
3. registrar una segunda entrega sintética;
4. comprobar aviso `Entrega guardada en este móvil`;
5. comprobar banner con una entrega pendiente;
6. volver online;
7. esperar sincronización;
8. comprobar aviso `Datos sincronizados`;
9. comprobar que servidor contiene exactamente una copia de esa entrega.

## Escenario 8 — Labor offline

1. pasar offline;
2. registrar una labor `Observación`;
3. comprobar aviso `Labor guardada en este móvil`;
4. comprobar contador de labores pendiente;
5. volver online;
6. comprobar una única labor sincronizada.

## Escenario 9 — Cold-start protegido

1. con sesión previamente validada, dejar una operación en outbox;
2. cerrar/recrear contexto browser preservando storage;
3. iniciar sin red;
4. comprobar `Modo protegido`;
5. comprobar que no se muestran nombres privados de fincas/campañas persistidos como réplica;
6. comprobar que sí aparece el conteo de pendientes;
7. recuperar red;
8. comprobar revalidación de sesión y posterior sincronización.

## Escenario 10 — Logout protegido

1. dejar una operación offline pendiente;
2. intentar cerrar sesión;
3. comprobar bloqueo y explicación;
4. sincronizar;
5. cerrar sesión;
6. comprobar retorno al login y ausencia de datos privados visibles.

## Escenario 11 — Accesibilidad browser automatizable

El E2E debe verificar al menos:

- `aria-current=page` en navegación activa;
- nombres accesibles de controles críticos;
- `aria-pressed` de finca activa;
- foco visible/no perdido tras navegación;
- ausencia de inputs file como única acción invisible;
- errores y estados con regiones anunciables;
- recorrido posible con `Tab`, `Enter` y `Space` en los puntos críticos.

La auditoría con TalkBack/NVDA sigue siendo manual según `ACCESSIBILITY_GATE_V1.md`.

## Escenario 12 — Responsive

Ejecutar al menos en:

- móvil pequeño: ~360×740;
- móvil medio: ~390×844;
- tablet: ~768×1024;
- escritorio: ~1280×800.

Comprobar:

- sin scroll horizontal inesperado;
- navegación inferior no oculta controles;
- formularios no salen del viewport;
- ticket/rendimiento siguen accionables;
- textos esenciales no se recortan.

## Evidencia

En CI/staging conservar:

- commit SHA;
- navegador/versión;
- PASS/FAIL por escenario;
- screenshot solo al fallar y siempre con datos sintéticos;
- trace/video únicamente con datos sintéticos;
- ningún secreto, cookie o token en artefactos.

## Criterio PASS

Browser E2E V1 queda verde cuando los escenarios 1–12 pasan en al menos Chromium móvil emulado + Chromium desktop, y los fallos de seguridad/aislamiento no pueden quedar como `flaky` ignorado.
