# Plan de piloto real — Mágina Olivo

Fecha: 2026-09-02

## Objetivo

Validar que Mágina Olivo resuelve problemas reales de campaña antes de construir automatizaciones o integraciones costosas.

El piloto no busca demostrar que todas las funciones imaginadas funcionan; busca descubrir cuáles son realmente necesarias.

## Participantes

Primera ronda: 3 a 5 olivareros.

Buscar variedad, no volumen:

- agricultor con 1-3 parcelas;
- agricultor con varias fincas/parcelas;
- socio de cooperativa con portal digital;
- agricultor que reciba información principalmente en papel/WhatsApp/oficina;
- si es posible, alguien que entregue en más de una almazara o haya cambiado de cooperativa entre campañas.

No es necesario que todos pertenezcan a la DOP Sierra Mágina, pero la mayoría debería operar en el territorio objetivo inicial.

## Material que necesitamos

Siempre anonimizado o con consentimiento explícito:

- 3-5 tickets de entrega de formatos distintos;
- 2-3 documentos o capturas donde aparezca rendimiento;
- 1 liquidación de ejemplo;
- ejemplo de albarán/factura agrícola si el usuario lo utiliza;
- ejemplo de cómo identifica una finca/parcela actualmente;
- captura o explicación de su portal/app de socio cuando exista;
- lista real de labores que suele anotar durante el año.

Nunca pedir credenciales de portales de socio.

## Entrevista inicial — 20/30 min

Preguntas núcleo:

1. ¿Dónde apuntas ahora las labores?
2. ¿Cómo sabes cuántos kilos llevas entregados?
3. ¿Cuándo y cómo recibes el rendimiento?
4. ¿Guardas los tickets? ¿Dónde?
5. ¿Entregas siempre en la misma cooperativa/almazara?
6. ¿Distingues normalmente los kilos por parcela/finca?
7. ¿Qué miras más durante campaña: kilos, rendimiento, precio, documentos, otra cosa?
8. ¿Qué información te manda la cooperativa y por qué canal?
9. ¿Usas SIGPAC? ¿Para qué?
10. ¿Miras meteorología antes de alguna labor concreta?
11. ¿Qué es lo que más te molesta de las aplicaciones agrícolas actuales?
12. Si solo pudieras tener tres cosas en Mágina Olivo, ¿cuáles serían?

No enseñar demasiadas funciones antes de escuchar el flujo actual para evitar sesgar respuestas.

## Test de prototipo

Tareas sin explicar dónde pulsar:

### T1 — Alta inicial

"Tienes una finca llamada Las Viñas con dos parcelas. Añádela."

Medir:
- entiende explotación/finca/parcela;
- dudas con superficie/SIGPAC;
- campos que considera innecesarios.

### T2 — Registrar entrega

"Acabas de dejar 1.842 kg en tu cooperativa. Apúntalo."

Objetivo: < 30 s después del onboarding.

Medir:
- tiempo;
- errores;
- campos que busca y no encuentra;
- si sabe qué origen/parcela seleccionar.

### T3 — Rendimiento posterior

"Dos días después te dicen que esa entrega tiene un 21,7 %. Añádelo."

Validar que el concepto de resultado separado de la entrega se entiende aunque internamente sean entidades distintas.

### T4 — Trabajo de campo

"Hoy has podado la parcela Norte. Anótalo."

Objetivo labor simple: < 45 s.

### T5 — Ticket

"Quieres guardar este ticket junto con la entrega."

Medir si fotografía/documento se entiende sin explicación.

### T6 — Mala cobertura

Simular sin red:
- registrar entrega;
- cerrar PWA;
- abrir;
- comprobar `pendiente de sincronizar`;
- recuperar red;
- confirmar una sola entrega en servidor.

### T7 — Resumen

"¿Cuántos kilos llevas y cuál es tu rendimiento medio?"

El usuario debe encontrarlo sin buscar en menús secundarios.

## Métricas

### UX

- tiempo mediano de nueva entrega;
- tiempo mediano de labor simple;
- % tareas completadas sin ayuda;
- errores por tarea;
- retrocesos/navegación perdida;
- campos omitidos voluntariamente.

### Valor

Escala 1-5 después del test:
- utilidad de campaña;
- utilidad del histórico;
- utilidad del archivo de tickets;
- utilidad meteorológica;
- utilidad RAIF;
- interés en importar desde portal de cooperativa;
- intención de usar la app una semana;
- intención de usarla una campaña completa.

### Retención piloto

Si se habilita una prueba de varias semanas:
- usuarios activos semanales;
- entregas registradas vs estimadas reales;
- labores registradas;
- documentos adjuntos;
- borradores abandonados;
- errores de sincronización;
- % de usuarios que vuelven sin recordatorio.

No usar métricas de vanidad como número de pantallas visitadas si no explican valor.

## Criterios para cambiar diseño

Cambiar modelo/flujo antes de MVP si:
- 2+ de 5 usuarios no entienden `finca/parcela`;
- 2+ buscan rendimiento desde un lugar distinto al previsto;
- nueva entrega supera consistentemente 45 s;
- los usuarios no saben asociar una entrega a parcela y esto bloquea el guardado;
- el ticket resulta ser el principal punto de entrada y no un adjunto secundario;
- aparece un dato crítico repetido que no modelamos.

## Hipótesis a validar

H1. El principal valor inicial es el histórico unificado campaña + campo.

H2. Registrar manualmente una entrega sigue siendo útil incluso cuando existe portal de cooperativa.

H3. El rendimiento debe poder registrarse después sin editar de forma confusa la entrega original.

H4. La asociación de entrega a parcela debe ser opcional.

H5. Un dashboard con kilos + rendimiento + pendientes aporta valor diario en campaña.

H6. El agricultor valora más una app sencilla y específica de olivar que un ERP agrícola completo.

H7. El modo offline parcial evita abandonos reales en campo.

## No preguntar todavía

Evitar convertir el piloto en encuesta de deseos sobre:
- IA generativa;
- sensores IoT;
- facturación avanzada;
- gestión de trabajadores;
- CUE completo;
- marketplace.

Primero validar el núcleo.

## Resultado del piloto

Crear `docs/pilot/ROUND_1_FINDINGS.md` con:
- participantes anonimizados P1-P5;
- hechos observados;
- problemas comunes;
- decisiones modificadas;
- decisiones confirmadas;
- funciones aplazadas;
- backlog priorizado.

No guardar documentos reales con datos personales dentro del repositorio Git.