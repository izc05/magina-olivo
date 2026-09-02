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

## Flujo Git

- `main`: base estable.
- Funcionalidades y cambios de arquitectura: ramas `feat/*`.
- Correcciones: ramas `fix/*`.
- Documentación importante puede convivir en la rama funcional correspondiente.
- Evitar merges directos de trabajo incompleto.

## Criterios antes de merge

- Código compila.
- Tests relevantes pasan.
- No hay secretos.
- Migraciones son reproducibles si existen.
- Documentación queda coherente con el cambio.
- Responsive básico comprobado cuando haya interfaz.
- Se ha considerado aislamiento entre usuarios/explotaciones.

## IA

Nombre de producto provisional: `Mágina IA`.

La IA se usará principalmente para:

- interpretar lenguaje natural;
- extraer campos de documentos;
- ayudar a consultar datos propios;
- generar resúmenes explicativos.

No usar IA para sustituir consultas SQL/cálculos deterministas ni presentarla como autoridad agronómica.
