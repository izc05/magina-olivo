# AGENTS.md — Mágina Olivo

## Propósito

Este repositorio contiene Mágina Olivo, una plataforma web/PWA para gestión del olivar, campañas, entregas, rendimientos, labores, documentos, cooperativas y automatizaciones.

## Reglas de trabajo

1. No desarrollar funcionalidades fuera del alcance documentado sin actualizar antes la documentación afectada.
2. No acoplar el núcleo del producto a una API de IA.
3. No introducir secretos, credenciales, tokens ni datos reales de usuarios en el repositorio.
4. No asumir que una cooperativa dispone de API oficial sin verificarlo.
5. No copiar contenido de webs de terceros de forma indiscriminada.
6. Toda integración externa debe quedar detrás de una interfaz/adapter propio.
7. Los cálculos de kilos, rendimientos, fechas y agregados críticos deben ser deterministas.
8. Las respuestas de IA deben validarse antes de convertirse en datos persistidos.
9. Las escrituras críticas propuestas por IA requieren confirmación del usuario salvo que exista una automatización explícita y segura.
10. Priorizar experiencia móvil y accesibilidad.
11. Mantener separación clara entre datos públicos de cooperativas y datos privados de explotaciones.
12. Toda consulta privada debe comprobar autorización en backend.
13. Añadir tests para reglas de negocio críticas.
14. Evitar dependencias innecesarias y mantener la arquitectura sencilla en V1.

## Fuente de verdad documental

Orden de prioridad:

1. `MASTER_PLAN.md`
2. `ARCHITECTURE.md`
3. `docs/DATA_MODEL.md`
4. documentación específica de cada módulo
5. implementación

Si la implementación contradice una decisión aprobada en documentación, no ocultar la contradicción: corregir código o actualizar explícitamente la decisión.

### Evolución UX V3 post-staging

Para cualquier trabajo de **interfaz, navegación, jerarquía visual, flujo de Mi Campo, parcela, botón `+`, Inicio o Campaña posterior a la aceptación de staging**, leer además obligatoriamente y en este orden:

1. `docs/design/UX_INFORMATION_ARCHITECTURE_V3.md`
2. `docs/design/UX_V3_MIGRATION_MAP.md`
3. `docs/CODEX_UX_V3_BRIEF.md`
4. `docs/design/PARCEL_MAP_FIRST_V1.md`

Estos documentos son una **extensión explícita de la visión y principios de `MASTER_PLAN.md` para la evolución UX post-staging**. `docs/V1_SCREEN_MAP.md` y `docs/V1_WIREFRAMES.md` continúan como referencia funcional/histórica, pero no deben usarse para reintroducir una navegación V1 que contradiga la convergencia V3 aprobada.

### Guardarraíl de staging

La arquitectura UX V3 **no autoriza a modificar ni reemplazar un candidato de staging congelado**.

En particular, mientras `staging/candidate-v11-2026-09-05` sea la referencia de aceptación:

- tratar su SHA como inmutable;
- trabajar UX V3 solo en ramas separadas cuando exista autorización;
- no fusionar una convergencia visual sobre la rama de aceptación por iniciativa propia;
- no sustituir los gates de staging por pruebas visuales;
- preservar offline, seguridad, privacidad y accesibilidad ya validados.

## Flujo Git

- `main`: base estable.
- Funcionalidades y cambios de arquitectura: ramas `feat/*`.
- Correcciones: ramas `fix/*`.
- Documentación importante puede convivir en la rama funcional correspondiente.
- Evitar merges directos de trabajo incompleto.
- Para UX V3, preferir PRs pequeños y secuenciales (`shell`, `Mi Campo`, `parcela`, `quick actions`, `Inicio`, `Campaña`) en lugar de una convergencia gigante.

## Criterios antes de merge

- Código compila.
- Tests relevantes pasan.
- No hay secretos.
- Migraciones son reproducibles si existen.
- Documentación queda coherente con el cambio.
- Responsive básico comprobado cuando haya interfaz.
- Se ha considerado aislamiento entre usuarios/explotaciones.
- En cambios UX V3, se han comprobado también estados loading/empty/error/offline, teclado, foco y móvil estrecho.
- No se ha eliminado una capacidad V11 únicamente para simplificar navegación: debe conservarse, converger o documentarse su sustitución.

## IA

Nombre de producto provisional: `Mágina IA`.

La IA se usará principalmente para:

- interpretar lenguaje natural;
- extraer campos de documentos;
- ayudar a consultar datos propios;
- generar resúmenes explicativos.

No usar IA para sustituir consultas SQL/cálculos deterministas ni presentarla como autoridad agronómica.
