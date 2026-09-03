# Mágina Olivo — Integración Visual V2 + MVP Core V1

Fecha: 2026-09-03
Rama: `feat/integration-v2-mvp-v1`
Estado: integración P0 en curso

## Objetivo

Unificar la interfaz Visual V2 con el backend y las reglas de negocio ya validadas en `feat/mvp-core-v1`, sin crear una segunda aplicación ni una segunda fuente de verdad.

## Autoridades del proyecto

### Presentación

`feat/visual-v2-foundation` es la autoridad de:
- identidad visual;
- jerarquía de pantallas;
- lenguaje editorial;
- navegación;
- responsive;
- composición visual.

### Backend y reglas de negocio

`feat/mvp-core-v1` es la autoridad de:
- Fastify;
- PostgreSQL;
- Better Auth;
- sesiones;
- autorización server-side;
- holdings, fincas y parcelas;
- campañas, entregas y rendimientos;
- documentos privados;
- offline/outbox;
- idempotencia;
- cálculos deterministas;
- worker;
- seguridad y gates de staging.

## Decisión cerrada

La arquitectura de integración es:

```text
Visual V2
  -> componentes/presentación
  -> adaptadores o repositorios de frontend
  -> /api/v1 MVP Core
  -> Fastify
  -> PostgreSQL
```

Los repositorios demo se permiten únicamente para:
- capturas visuales;
- pruebas de presentación;
- desarrollo aislado de UI.

Nunca serán fuente de verdad en producción.

## Primera rebanada integrada

La rama parte directamente de `feat/mvp-core-v1`.

Primer cambio aplicado:
- se conserva `App.tsx` y toda su lógica real;
- se conserva autenticación, API, offline y cálculos;
- se añade `apps/web/src/integration-v2.css` como capa de presentación;
- se reutiliza el logo aprobado existente en `/brand/magina-olivo-mark.svg`;
- no se introduce `lucide-react` ni otra dependencia visual nueva;
- no se copian valores demo desde Visual V2.

Objetivo de este corte: acercar Login, cabecera, Inicio y componentes base al sistema V2 sin alterar comportamiento productivo.

## Orden P0

1. Login/sesión.
2. Inicio/dashboard real.
3. Mi Campo: explotación -> finca -> parcela.
4. Cuaderno/labores.
5. Campaña -> entrega -> rendimiento.
6. Documentos privados.
7. Offline/sync.
8. Meteorología y datos públicos.
9. Directorio/mercado/noticias.

## Reglas de integración

- Ningún dato real hardcodeado en JSX.
- Ningún cálculo crítico duplicado en frontend.
- Ninguna autorización trasladada al cliente.
- IDs y semántica del MVP Core son canónicos.
- Cambios visuales no pueden degradar accesibilidad ni objetivos táctiles.
- Offline/outbox y actualización PWA no se reescriben por motivos visuales.
- No introducir PocketBase como backend alternativo en esta línea.
- No fusionar a `main` antes de staging real y revisión de la integración.

## Gate de cierre de esta fase

La fase podrá considerarse cerrada cuando:

- el flujo `Login -> Inicio -> Mi Campo -> Parcela -> Cuaderno -> Campaña -> Entrega -> Rendimiento` use presentación V2;
- todos los datos del flujo procedan del backend real;
- CI de MVP Core siga verde;
- los tests de accesibilidad y offline sigan verdes;
- el bundle no contenga secretos;
- no exista dependencia productiva de `demoRepositories`;
- se haya ejecutado el recorrido contra staging real.

## Siguiente paso

Migrar la composición de **Mi Campo** hacia la jerarquía visual V2 usando exclusivamente `Holding`, `Farm`, `Plot` y datos derivados del backend MVP Core. Después, aplicar el mismo patrón a Cuaderno y Campaña.
