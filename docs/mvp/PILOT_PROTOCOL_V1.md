# Protocolo de piloto V1 — Mágina Olivo

## Objetivo

Validar que el núcleo de Mágina Olivo sea entendible, rápido y confiable para olivareros reales antes de ampliar alcance o publicar una V1 abierta.

El piloto no busca confirmar si la aplicación “gusta”. Debe demostrar si una persona puede completar las tareas centrales sin ayuda, sin perder datos y entendiendo qué información es propia, pública, verificada, pendiente o desactualizada.

## Condiciones previas

No iniciar el piloto hasta que `docs/mvp/STAGING_ACCEPTANCE_V1.md` esté cerrado en verde.

Obligatorio:

- staging HTTPS real;
- PR/commit identificado por SHA;
- base de datos de staging separada;
- almacenamiento privado real;
- correo/reset funcional;
- backup/restore probado;
- PWA instalable;
- flujo offline/sync probado manualmente;
- solo datos sintéticos o documentos expresamente anonimizados.

## Participantes

Primera ronda: **2–5 olivareros**.

Intentar cubrir perfiles distintos:

1. persona que usa aplicaciones móviles con soltura;
2. persona con uso digital básico;
3. explotación pequeña;
4. explotación con varias fincas/parcelas;
5. si es posible, dos cooperativas o destinos habituales distintos.

No hace falta que todos los perfiles estén representados en la primera ronda.

## Regla de moderación

El moderador presenta el objetivo y la tarea, pero no explica dónde pulsar.

Si el participante queda bloqueado:

- esperar unos segundos;
- registrar el punto exacto de bloqueo;
- dar la mínima pista posible;
- marcar la tarea como completada **con ayuda**.

No corregir al usuario mientras piensa en voz alta.

## Datos sintéticos base

Usar un conjunto sencillo y reconocible:

- explotación: `Olivar piloto`;
- finca: `Las Viñas`;
- parcela: `Parcela Norte`;
- superficie: `1,75 ha`;
- variedad: `Picual`;
- campaña: `2026/27`;
- entrega: `1.842 kg`;
- destino: `Almazara sintética`;
- ticket: PDF/JPG sintético;
- rendimiento posterior: `21,9 %`;
- labor: poda, `1,75 ha`, coste `85,50 €`.

No usar tickets, DNI, teléfonos, liquidaciones ni documentos reales en la primera ronda.

## Tareas

### T1 — Entrar y orientarse

Pedir:

> Entra en Mágina Olivo y dime dónde irías para ver tus fincas y parcelas.

Medir:

- encuentra `Mi Campo` sin ayuda;
- entiende la diferencia entre información pública y datos privados;
- tiempo hasta localizar la zona correcta.

Criterio deseado: **≤15 s** para localizar Mi Campo una vez iniciada sesión.

### T2 — Crear estructura de campo

Pedir:

> Crea una explotación llamada Olivar piloto, una finca Las Viñas y una parcela Parcela Norte de 1,75 ha.

Observar:

- nombres de campos entendibles;
- errores de validación;
- si distingue finca de parcela;
- si sabe cuándo ha quedado guardado.

Criterio deseado: completar sin ayuda y sin duplicados.

### T3 — Registrar una labor

Pedir:

> Apunta una poda de la Parcela Norte, para toda la parcela, con un coste de 85,50 €.

Objetivo de producto: **<45 s** desde que abre el formulario hasta confirmación de guardado.

Registrar:

- tiempo;
- campos que generan dudas;
- ayuda necesaria;
- percepción del estado guardado/sincronizado.

### T4 — Registrar una entrega

Pedir:

> En la campaña 2026/27 registra una entrega de 1.842 kg de Picual a Almazara sintética y adjunta este ticket de prueba.

Objetivo de producto: **<30 s** para los datos de entrega, excluyendo el tiempo del selector de archivo si el sistema operativo introduce demora ajena a la app.

Comprobar:

- destino manual entendido;
- finca/parcela opcionales no confunden;
- no aparecen duplicados si se repite una pulsación o se reintenta;
- el ticket queda privado y vinculado a la entrega.

### T5 — Añadir rendimiento después

Pedir:

> Dos días después te comunican que esa entrega tuvo un rendimiento del 21,9 %. Añádelo.

Objetivo de producto: **<15 s**.

Validar que el usuario entiende que entrega y rendimiento son momentos distintos.

### T6 — Entender el histórico

Pedir:

> Busca ahora todo lo que ha ocurrido en la Parcela Norte y dime qué ves.

Debe poder identificar al menos:

- poda;
- entrega;
- rendimiento;
- campaña relacionada.

### T7 — Tiempo y confianza de la fuente

Pedir:

> Mira el tiempo de un municipio y dime si confiarías en esa predicción para organizar mañana una labor. ¿Por qué?

No buscamos una decisión agronómica correcta. Buscamos que vea y entienda:

- fuente AEMET;
- fecha de elaboración;
- estado de frescura;
- aviso de servicio degradado si aplica;
- alcance municipal, no parcelario.

### T8 — Directorio y procedencia

Pedir:

> Busca una cooperativa o almazara y dime de dónde sale esa información y cuándo se revisó.

Debe poder distinguir:

- fuente verificada;
- pendiente de verificación;
- revisión pendiente;
- vínculo con la fuente pública;
- ausencia de relación comercial implícita con Mágina Olivo.

### T9 — Mercado

Pedir:

> Mira Aceite y Mercado y dime qué precio te pagaría tu cooperativa.

La respuesta esperada es que **la aplicación no puede deducirlo de esa pantalla**.

Debe entender que:

- mercado es contexto;
- no equivale a liquidación individual;
- no se publican precios estructurados mientras la fuente no esté verificada.

### T10 — Prueba sin cobertura

Solo después de completar tareas online.

1. activar modo avión o desconectar red;
2. registrar una labor o entrega compatible con offline;
3. comprobar que la app indica claramente que queda pendiente;
4. recuperar conexión;
5. esperar sincronización;
6. verificar que aparece **una sola vez**.

Criterio bloqueante:

- cero pérdida silenciosa;
- cero duplicados;
- estado offline/pendiente comprensible.

Los archivos privados no forman parte de la cola offline V1. El participante debe entender que el ticket se adjunta al recuperar conexión.

## Métricas por tarea

Registrar por participante:

| Campo | Valor |
|---|---|
| Completada | Sí / No |
| Ayuda | Ninguna / Pista / Guiada |
| Tiempo | segundos |
| Error de interfaz | Sí / No |
| Error técnico | Sí / No |
| Reintento | Sí / No |
| Duda verbalizada | texto breve |
| Confianza al terminar | 1–5 |

## Métricas de salida de la primera ronda

Objetivos mínimos antes de considerar la V1 lista para ampliar piloto:

- **≥80 %** de tareas centrales completadas sin ayuda;
- entrega mediana **<30 s**;
- labor mediana **<45 s**;
- rendimiento mediano **<15 s**;
- **0** pérdidas de datos;
- **0** duplicados por replay/reintento;
- **0** accesos cruzados entre usuarios;
- **100 %** de participantes entienden que Mercado ≠ liquidación;
- **100 %** identifican al menos fuente y fecha/estado en Tiempo y Directorio tras una breve exploración;
- ningún bloqueo crítico de accesibilidad móvil.

Las medianas evitan que un participante muy rápido o muy lento distorsione la ronda pequeña.

## Severidad de hallazgos

### P0 — Bloquea piloto/V1

- pérdida de datos;
- duplicación de entrega/labor;
- acceso a datos de otro usuario;
- ticket privado accesible por otro usuario;
- sesión insegura;
- app inutilizable offline tras prometer guardado;
- dato público desactualizado presentado como actual sin aviso.

### P1 — Corregir antes de ampliar piloto

- tarea central imposible sin ayuda;
- navegación que provoca abandonos;
- usuario no distingue finca/parcela/campaña;
- no entiende si un registro se guardó o está pendiente;
- tiempos muy por encima de objetivo.

### P2 — Mejorable

- texto poco natural;
- orden de campos mejorable;
- detalle visual;
- petición de función que no impide el flujo principal.

## Preguntas finales

Hacerlas solo al terminar las tareas:

1. ¿Qué parte usarías realmente durante una campaña?
2. ¿Qué dato te daría miedo perder?
3. ¿En qué momento dudaste de si algo se había guardado?
4. ¿Qué parte te pareció información pública y cuál información tuya?
5. ¿Hay algo que esperabas encontrar y no estaba?
6. Si mañana tuvieras que registrar otra entrega sin ayuda, ¿sabrías hacerlo?

Evitar preguntas dirigidas como “¿te ha gustado?” antes de observar el comportamiento.

## Decisión después del piloto

### GO

Pasar a una ronda mayor si:

- no quedan P0;
- métricas centrales alcanzan o se acercan de forma razonable a los objetivos;
- los P1 tienen correcciones concretas y acotadas.

### NO-GO

No ampliar si existe cualquier P0 o si el flujo de entrega/labor necesita explicación recurrente.

En ese caso:

1. corregir;
2. repetir las tareas afectadas;
3. comparar tiempos y errores con la ronda anterior;
4. solo entonces ampliar usuarios o funciones.
