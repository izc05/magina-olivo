# AGENTS.md — Mágina Olivo

## Propósito

Este repositorio contiene Mágina Olivo, una plataforma web/PWA para gestión del olivar, campañas, entregas, rendimientos, labores, documentos, cooperativas, información pública de Sierra Mágina y automatizaciones.

## Lectura obligatoria antes de trabajar

Codex o cualquier agente debe revisar, como mínimo y en este orden:

1. `AGENTS.md`
2. `docs/APP_MASTER_MAP.md`
3. `MASTER_PLAN.md`
4. `ARCHITECTURE.md`
5. documentación específica del módulo afectado
6. issues/PRs abiertos que impongan gates, congelaciones o cambios de prioridad

No debe inferirse el alcance únicamente a partir de las pantallas existentes.

## Gate operativo vigente

Mientras el issue **#7 — P0: Ejecutar staging real antes del piloto** siga abierto:

- usar exclusivamente `staging/candidate-v11-2026-09-05` como candidato de aceptación;
- SHA congelado: `063767560fe824c3415f200e0314dc5b2e8f4122`;
- **no modificar V11**;
- no ampliar nuevas áreas grandes;
- no iniciar piloto con datos reales;
- si aparece un defecto bloqueante, corregir fuera del candidato y crear una nueva revisión/candidato;
- `docs/APP_MASTER_MAP.md` sirve como guía de producto y backlog, no como permiso para saltarse el gate P0.

## Reglas de trabajo

1. No desarrollar funcionalidades fuera del alcance documentado sin actualizar antes o junto con el cambio la documentación afectada.
2. No acoplar el núcleo del producto a una API de IA.
3. No introducir secretos, credenciales, tokens ni datos reales de usuarios en el repositorio.
4. No asumir que una cooperativa dispone de API oficial sin verificarlo.
5. No copiar contenido de webs de terceros de forma indiscriminada.
6. Toda integración externa debe quedar detrás de una interfaz/adapter propio.
7. Los cálculos de kilos, rendimientos, fechas y agregados críticos deben ser deterministas.
8. Las respuestas de IA deben validarse antes de convertirse en datos persistidos.
9. Las escrituras críticas propuestas por IA requieren confirmación del usuario salvo que exista una automatización explícita y segura.
10. Priorizar experiencia móvil y accesibilidad.
11. Mantener separación clara entre datos públicos de cooperativas/contenido y datos privados de explotaciones.
12. Toda consulta privada debe comprobar autorización en backend.
13. Añadir tests para reglas de negocio críticas.
14. Evitar dependencias innecesarias y mantener la arquitectura sencilla en V1.
15. No confundir “pantalla creada” con “bloque terminado”: revisar datos, API, permisos, errores, responsive, accesibilidad, operación y tests cuando correspondan.
16. No implementar bloques P3/P4/P5 durante trabajo P0/P1 salvo instrucción explícita y revisión de alcance.

## Fuente de verdad documental

Orden de prioridad general:

1. gates/criterios de aceptación vigentes del trabajo en curso (`docs/mvp/*` e issues P0 cuando apliquen)
2. `docs/APP_MASTER_MAP.md` — mapa completo de producto, prioridades y dirección
3. `MASTER_PLAN.md` — reglas funcionales consolidadas de V1
4. `ARCHITECTURE.md` — límites y decisiones técnicas
5. `docs/DATA_MODEL.md`
6. documentación específica de cada módulo
7. implementación

Si la implementación contradice una decisión aprobada en documentación, no ocultar la contradicción: corregir código o actualizar explícitamente la decisión.

## Prioridades de producto

- **P0:** staging, seguridad, aceptación y trazabilidad.
- **P1:** núcleo agrícola y recorrido de oro.
- **P2:** tiempo, alertas, noticias, mercado y cooperativas.
- **P3:** ecosistema territorial/local y crecimiento orgánico.
- **P4:** publicidad, recompensas y gamificación.
- **P5:** automatización avanzada e IA.

El detalle de cada bloque está en `docs/APP_MASTER_MAP.md`.

## Flujo Git

- `main`: base estable.
- Funcionalidades y cambios de arquitectura: ramas `feat/*`.
- Correcciones: ramas `fix/*`.
- Documentación importante: ramas `docs/*` o la rama funcional correspondiente.
- Evitar merges directos de trabajo incompleto.
- No mover ni reescribir un candidato de staging congelado.

## Criterios antes de merge

- Código compila.
- Tests relevantes pasan.
- No hay secretos.
- Migraciones son reproducibles si existen.
- Documentación queda coherente con el cambio.
- Responsive básico comprobado cuando haya interfaz.
- Accesibilidad considerada y validada según el gate aplicable.
- Se ha considerado aislamiento entre usuarios/explotaciones.
- No se rompe el recorrido de oro.
- El cambio respeta la prioridad y el gate vigente.

## Recorrido de oro

Preservar especialmente:

`Cuenta -> Explotación -> Finca/Parcela -> Labor -> Entrega -> Ticket -> Rendimiento -> Resumen de campaña -> Información pública separada -> Exportación/Informe`

Las grandes evoluciones visuales o funcionales deben mantener este recorrido operativo y sus reglas de autorización.

## IA

Nombre de producto provisional: `Mágina IA`.

La IA se usará principalmente para:

- interpretar lenguaje natural;
- extraer campos de documentos;
- ayudar a consultar datos propios;
- generar resúmenes explicativos;
- asistir en clasificación/resumen de contenido público con fuentes.

No usar IA para sustituir consultas SQL/cálculos deterministas ni presentarla como autoridad agronómica. El servidor no necesita “instalar ChatGPT”: las capacidades externas se integran mediante APIs/adapters cuando proceda.
