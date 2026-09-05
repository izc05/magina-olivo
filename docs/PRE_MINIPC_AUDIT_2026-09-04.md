# Mágina Olivo — auditoría previa a Mini PC

Fecha: 2026-09-04

## Objetivo

Llegar a la primera instalación en Mini PC con una única aplicación: la interfaz Visual V2 aprobada, conectada a la funcionalidad real ya desarrollada en MVP Core / Integration V2.

No se acepta una segunda interfaz técnica como producto final. `feat/visual-v2-foundation` sigue siendo la autoridad visual y `feat/integration-v2-mvp-v1` la base funcional a la que hay que llevar esa presentación.

## Criterio de salida a Mini PC

Antes de generar `mini-pc-candidate-v1` deben cumplirse estos puntos:

1. La preview que revisa el propietario coincide visualmente con Visual V2.
2. No hay botones principales muertos o meramente decorativos sin indicación.
3. Datos privados principales usan API/BD, no `localStorage` como fuente de verdad.
4. Datos públicos prioritarios usan fuentes reales y muestran fuente/fecha.
5. Login, recuperación, offline, documentos y sincronización están integrados en la misma interfaz.
6. Build, responsive, accesibilidad y smoke E2E están verdes.
7. Se prueba el flujo completo antes de congelar el candidato.

## Estado por área

| Área | Visual V2 | Funcionalidad existente | Trabajo antes Mini PC | Prioridad |
| --- | --- | --- | --- | --- |
| Marca / logo | Sí | Asset aprobado | Corregir rutas bajo subpath Pages y verificar todas las pantallas | P0 |
| Introducción de bienvenida | Nueva pasada 5 pasos | Onboarding técnico existe aparte | Mantener tour de producto + onboarding de cuenta como dos fases distintas | P0 |
| Login / sesión | Estado visual diseñado | Better Auth, sesión y recuperación reales | Vestir el flujo real con Visual V2 sin cambiar lógica | P0 |
| Inicio | Diseño aprobado | Dashboard real existe en integración | Sustituir valores demo por adaptadores/API conservando exactamente la composición Visual V2 | P0 |
| Mi Campo | Diseño amplio | Holdings, fincas y parcelas reales | Reemplazar `fieldStore/localStorage` por repositorios API; conservar demo solo en preview | P0 |
| Parcelas / mapa | Diseño aprobado | SIGPAC, Catastro y límites de parcela disponibles | Integrar editor/mapa real en la pantalla Visual V2 | P0 |
| Cuaderno | Diseño aprobado | Activities + outbox offline | Conectar altas/listados reales, filtros y estados de sincronización | P0 |
| Tareas / calendario | Acceso visual parcial | API de tareas y calendario ya implementada | Dar pantalla/flujo Visual V2 completo; hoy el acceso de Inicio no representa toda la función | P0 |
| Campaña / entregas / rendimiento | Diseño aprobado | API, cálculos y entregas reales | Llevar los formularios y resultados reales a Visual V2 | P0 |
| Costes / rentabilidad | Diseño y datos demo | Modelo parcial | Confirmar persistencia/API de gastos y cálculo de rentabilidad; eliminar valores hardcodeados | P1 |
| Documentos | Diseño demo | Almacenamiento privado y API real | Subir, listar, abrir, descargar y asociar documentos desde Visual V2 | P0 |
| Maquinaria | Pantalla visual | Sin cierre funcional equivalente identificado | Definir persistencia mínima o marcar fuera del piloto | P1 |
| Meteorología | Diseño completo | AEMET/public weather real | Conectar resumen, horaria, 5 días, fuente, actualización y errores | P0 |
| Radar / lluvia | Diseño base | Ramas de radar + rain alerts | Integrar radar animado y alarma de lluvia en la misma pantalla meteorológica | P0 |
| Alertas de campo | Diseño | RAIF/public field alerts | Conectar avisos reales, frescura y contexto de parcela | P0 |
| Noticias | Diseño editorial | API pública + rama real-news | Reemplazar stories demo por metadata real, búsqueda y guardado | P0 |
| Mercado aceite | Diseño | Rama market-real + worker/source | Conectar AOVE/Virgen/Lampante, gráfica, fuente y fecha | P0 |
| Cooperativas | Diseño de directorio/ficha | Directorio público + rama cooperatives-alerts | Usar entidades verificadas, web/fuente, horarios/avisos solo cuando estén confirmados | P0 |
| Mágina Local | Diseño | Municipios/destinos públicos parciales | Conectar servicios reales disponibles; evitar fichas inventadas | P1 |
| Descubre | Diseño y fotos | Destinos públicos parciales | Conectar rutas/pueblos/oleoturismo progresivamente | P1 |
| Agenda | Diseño demo | No hay cierre de fuente externa equivalente | Definir fuente o mantener claramente contenido curado | P1 |
| Comunidad | Diseño demo | Sin backend social final identificado | Decidir alcance de piloto; no bloquear Mini PC si queda explícitamente beta | P2 |
| Mi Mágina / perfil | Diseño | Preferencias/exportación reales | Conectar perfil, preferencias, exportación y seguridad | P0 |
| Guardados / favoritos | Diseño demo | Persistencia final no identificada | Añadir modelo/API o dejar fuera del primer piloto | P1 |
| Notificaciones | UI existente | Notice/Pilot alerts parciales | Unificar preferencias y avisos; push real puede quedar para fase posterior si no bloquea alarmas internas | P1 |
| Offline / PWA | Estados visuales | Outbox/PWA real en integración | Integrar sin volver a crear service workers paralelos; validar actualización y caché | P0 |
| Errores / vacío / carga | Diseñados | Lógica real dispersa | Usar los estados V2 en cada petición real | P0 |
| Backup / restore | N/A visual | Scripts/gates disponibles | Verificar en Mini PC, pero dejar scripts y runbook cerrados antes | P0 instalación |

## Hallazgo principal

El proyecto no está corto de funcionalidad: gran parte de la lógica real ya existe. El principal riesgo previo al Mini PC es la **convergencia**: que esa lógica termine dentro de la aplicación Visual V2 aprobada y no en una segunda interfaz técnica.

## Plan de cierre

### Fase A — Integridad visual y revisión móvil

- logo y assets correctos;
- tour de bienvenida;
- navegación completa;
- localizar botones muertos;
- corregir scroll, overlays, safe areas y responsive;
- mantener GitHub Pages exclusivamente como preview Visual V2.

### Fase B — Convergencia P0 pública

- meteorología + lluvia/radar;
- alertas RAIF;
- noticias reales;
- mercado real;
- cooperativas verificadas.

### Fase C — Convergencia P0 privada

- auth/sesión;
- fincas/parcelas/mapa;
- cuaderno;
- tareas/calendario;
- campaña/entregas/rendimiento;
- documentos;
- perfil/preferencias.

### Fase D — Robustez

- offline/outbox;
- estados carga/error/vacío;
- accesibilidad;
- PWA update policy;
- privacidad/exportación;
- pruebas E2E.

### Fase E — Candidato Mini PC

Solo entonces congelar una revisión única como `mini-pc-candidate-v1`, ejecutar CI completo y proceder a instalación de prueba.

## Estado de convergencia — corte 2026-09-04

Este bloque no sustituye la matriz original; registra qué líneas P0 ya han sido llevadas a la aplicación convergente y qué comprobaciones siguen abiertas antes de congelar el candidato.

### P0 ya convergido en código

- **Inicio Visual V2:** usa explotación, campaña, kilos, rendimiento, cobertura, AEMET, alertas, noticias y la referencia real de mercado mediante API; no utiliza valores privados demo como fuente de verdad.
- **Mi Campo / parcelas / mapa / cuaderno:** holdings, fincas, parcelas, editor de perímetro y cuaderno están conectados a los flujos reales; la simulación queda limitada a `VITE_DEMO_MODE` para la preview.
- **Campaña:** entregas y rendimientos reales están dentro de la capa Visual V2, manteniendo idempotencia, estados pendientes y cálculo ponderado del backend.
- **Documentos:** subida, listado, descarga privada y asociación a entregas están integrados. La campaña puede exportarse en PDF, CSV y JSON; el PDF resume cosecha por finca y parcela sin estimar rendimientos pendientes.
- **Tareas / calendario:** alta, prioridades, recordatorios, vencidas y completar tarea usan la API real y respetan permisos de solo lectura.
- **Meteorología / radar / lluvia:** predicción municipal AEMET, frescura, fallback acotado, radar animado y alarma de lluvia comparten la misma experiencia.
- **Alertas de campo:** RAIF permanece como fuente pública con control de frescura y sin convertir información regional en diagnóstico de parcela.
- **Noticias:** solo se presentan metadatos verificados, fecha, tema y enlace original; se han añadido búsqueda, filtro por tema, estado vacío y reintento.
- **Mercado del aceite:** endpoint público server-side sobre el Observatorio de Precios y Mercados de la Junta, con Virgen Extra, Virgen y Lampante en semanas sincronizadas, gráfica diferenciada, fecha/frescura, caché degradada limitada y separación explícita entre referencia de mercado y liquidación individual.
- **Cooperativas / almazaras:** directorio público con filtros, web/fuente y estados `verified / unverified / stale`; aparecer en el directorio no implica colaboración ni acceso a datos privados.
- **Mi Mágina / Mi Cuenta:** perfil, preferencias, avisos, cooperativa habitual, privacidad, copia estructurada de datos y cierre de sesión están integrados.
- **Offline / PWA:** outbox real, bloqueo de cierre con trabajo pendiente, reintento al recuperar conectividad, sincronización al arranque y estados móviles de pendiente/error están integrados.
- **Carga / error / vacío:** existe una capa Visual V2 común con accesibilidad, `prefers-reduced-motion`, contraste forzado y safe areas móviles.

### Comprobaciones que siguen abiertas antes de `mini-pc-candidate-v1`

1. **Preview final revisable por el propietario:** publicar un único corte demo aislado de la rama convergente y recorrerlo en móvil; no convertir la preview en producción ni permitir datos reales.
2. **Auditoría final de botones y rutas:** recorrer navegación principal, accesos rápidos, formularios, descargas, enlaces públicos, reintentos y vuelta atrás para confirmar que no queda una acción principal muerta.
3. **Smoke E2E de navegador:** los gates actuales cubren typecheck, pruebas unitarias/integración, API, migraciones, PWA, seguridad, contenedores y deploy/rollback, pero el criterio de salida exige además un recorrido real de navegador antes del freeze.
4. **Revisión responsive final:** Android móvil, anchuras estrechas, teclado abierto, safe areas, overlays de sincronización, calendario, mapa, gráfica de mercado y documentos.
5. **Backup / restore en el Mini PC:** los scripts y guards deben pasar además sobre el equipo de prueba, con evidencia del restore antes de considerar el candidato instalable.
6. **Freeze trazable:** solo cuando lo anterior esté verde, fijar un SHA único como `mini-pc-candidate-v1`; no seguir añadiendo funcionalidades P1/P2 dentro de ese candidato.

### Fuera del bloqueo del primer Mini PC

Costes/rentabilidad, maquinaria, Mágina Local ampliado, Descubre, Agenda, Comunidad, favoritos/guardados y push externo permanecen como P1/P2 salvo que una revisión posterior demuestre que alguno es imprescindible para el flujo piloto. No deben retrasar el cierre P0 ni volver a ampliar el alcance antes de la primera instalación.

## Regla de trabajo desde esta auditoría

Todo desarrollo nuevo que afecte al usuario debe responder a una fila de esta matriz. No abrir una tercera interfaz ni duplicar lógica. Primero converger y cerrar lo que ya está diseñado.
