# Antigravity Task — Mi Olivo V1

## Misión

Mejora, completa e integra el módulo **Mi Olivo** de Mágina Olivo sobre el código existente. No lo reconstruyas desde cero.

Rama obligatoria de trabajo:

`feat/mi-olivo-gamification-convergence-v1`

No trabajar directamente sobre `main`.

Documento funcional de referencia:

`docs/MI_OLIVO_GAMIFICATION_V1.md`

## Antes de tocar código

Lee en este orden:

1. `AGENTS.md`
2. `MASTER_PLAN.md`
3. `ARCHITECTURE.md`
4. `docs/DESIGN_SYSTEM_V1.md`
5. `docs/MI_OLIVO_GAMIFICATION_V1.md`

Después inspecciona como mínimo:

- `apps/web/src/App.tsx`
- `apps/web/src/LoyaltyOlivePage.tsx`
- `apps/web/src/loyalty-api.ts`
- `apps/web/src/RewardCatalogPage.tsx`
- `apps/api/src/loyalty-routes.ts`
- `apps/api/src/loyalty-service.ts`
- `apps/api/src/reward-routes.ts`
- `apps/api/src/reward-service.ts`
- `db/migrations/0040_loyalty_olives_foundation.sql`
- `db/migrations/0041_loyalty_collect_idempotency.sql`
- `db/migrations/0042_aove_rewards.sql`
- `db/migrations/0043_reward_partner_validation.sql`
- `db/migrations/0044_loyalty_redemption_expiry.sql`

Ejecuta la app antes de modificarla y revisa visualmente el estado actual en viewport móvil y escritorio.

## Decisión UX principal

La navegación móvil actual tiene cinco espacios. No añadas un sexto.

Objetivo:

```text
Inicio | Mi Campo | + Campaña | Mágina | Mi Olivo
```

La función de perfil/configuración que actualmente vive bajo `Mi Mágina`/`MoreTab` debe seguir siendo accesible mediante el avatar de cabecera o un acceso equivalente claro.

No elimines funciones para hacer sitio a Mi Olivo.

## Resultado esperado

### 1. Inicio

Crear una tarjeta compacta `Tu Olivo` con:

- miniatura/escena del árbol;
- aceitunas disponibles;
- pendientes si las hay;
- nivel;
- una misión destacada;
- CTA a Mi Olivo.

La tarjeta no debe desplazar el contenido agrícola principal ni convertir Inicio en un dashboard de juego.

### 2. Mi Olivo

Evolucionar la experiencia actual hacia una pantalla principal con cuatro secciones internas:

- Olivo
- Misiones
- Recompensas
- Logros

La vista inicial es `Olivo`.

Conservar y mejorar:

- olivo SVG actual;
- aceitunas visibles;
- saldo pendiente/disponible;
- vareo y recogida;
- niveles;
- `prefers-reduced-motion`.

Añadir:

- progreso al siguiente nivel más claro;
- misión recomendada;
- racha resumida si ya existe soporte o como siguiente bloque bien aislado;
- historial de movimientos;
- acceso integrado al catálogo de recompensas.

### 3. Misiones

Construir una primera versión real sobre el motor `loyalty_rules` existente.

Necesitamos distinguir visualmente:

- Hoy
- Esta semana
- Especiales

No inventes saldo desde frontend. La misión se completa solo cuando backend confirma el evento/recompensa.

Para V1, prioriza eventos ya existentes y acciones agrícolas verificables. Si necesitas ampliar el modelo, crea migración nueva, reversible y documentada; nunca edites migraciones aplicadas como si fueran nuevas.

### 4. Reward feedback

Cuando una acción genere aceitunas, añade feedback discreto:

```text
Misión completada
+10 🫒
Registrar una labor
[Ver mi olivo]
```

La UI debe usar el resultado confirmado por backend.

### 5. Recompensas

Integra visualmente el catálogo ya existente dentro de Mi Olivo sin romper rutas o deep links actuales.

Preserva:

- stock;
- validación;
- redención;
- QR/código;
- partner;
- expiración;
- historial/sincronización de estado existente.

### 6. Admin

Primero inspecciona si ya existe un área Admin en la rama actual o en el roadmap del proyecto. Si existe, integra `Fidelización` siguiendo su patrón. Si no existe una base madura, crea únicamente la arquitectura/documentación y componentes aislados necesarios para no bloquear la convergencia de usuario.

El futuro `Admin → Fidelización` debe poder gestionar reglas, misiones y recompensas sin editar código.

## Reglas de arquitectura

- El ledger existente es la fuente de verdad.
- No crear `user.points` ni otro saldo duplicado.
- No aceptar cantidad de premio enviada por cliente.
- Mantener idempotencia.
- Mantener límites/cooldown.
- Mantener transacciones de canje seguras.
- No acoplar el módulo a IA.
- No introducir nueva dependencia salvo justificación clara.
- No introducir secretos.
- Respetar autorización backend.
- Evitar romper offline del núcleo agrícola.

## Antifraude

Especial atención a acciones repetibles:

- leer noticias;
- consultar tiempo;
- compartir;
- registrar labores repetidas;
- referidos.

Cada una necesita una estrategia de deduplicación y límite. Si la verificación no es fiable, reduce el valor, limita fuertemente o deja la misión fuera de V1.

## Calidad visual

No hagas una estética infantil ni un panel administrativo genérico.

Buscamos:

- agrícola;
- premium pero cercana;
- visual;
- simple para usuario poco digital;
- coherente con Mágina Olivo;
- buen uso con una mano en móvil;
- jerarquía clara;
- animación breve y útil.

El olivo debe ser protagonista visual en Mi Olivo, no un emoji gigante.

## Clima visual

Si la integración es sencilla con la fuente meteorológica ya existente, permite que la escena responda suavemente a sol/nubes/lluvia/viento. Es un enhancement: nunca debe bloquear saldo, misión o navegación.

## Tests mínimos

Añade o adapta pruebas para cubrir:

1. una recompensa válida se registra una sola vez;
2. misma idempotency key no duplica premio;
3. cooldown/límite bloquea abuso;
4. collect mueve pending → available sin crear saldo;
5. canje no deja saldo negativo;
6. recompensa agotada/no válida no se canjea;
7. navegación a Mi Olivo funciona;
8. perfil sigue siendo accesible;
9. estados loading/error/auth son utilizables;
10. reduced motion no depende de animaciones para comunicar el resultado.

Ejecuta los scripts existentes de test/typecheck/build del monorepo. No inventes comandos sin revisar `package.json`.

## Validación visual obligatoria

Comprueba al menos:

- móvil 360–390 px;
- móvil grande ~430 px;
- tablet;
- escritorio >= 1280 px.

Revisar:

- navegación;
- scroll;
- safe areas;
- botones táctiles;
- textos largos;
- contador de aceitunas;
- tarjeta de Inicio;
- olivo/vareo;
- Misiones;
- Recompensas;
- estados vacíos;
- errores.

## Secuencia de trabajo recomendada

1. Auditoría rápida del módulo existente.
2. Escribir en el PR un resumen de lo encontrado antes de grandes cambios.
3. Corregir navegación y acceso a perfil.
4. Integrar tarjeta de Inicio.
5. Refactorizar `LoyaltyOlivePage` en componentes manejables sin reescritura innecesaria.
6. Integrar Misiones.
7. Integrar Recompensas.
8. Añadir feedback de premio.
9. Añadir historial.
10. Tests y revisión visual.
11. Documentar pendientes de Fase 2.

## Commits

Usa commits pequeños y legibles, por ejemplo:

- `refactor(web): converge Mi Olivo navigation`
- `feat(web): add Mi Olivo home summary`
- `feat(loyalty): expose mission progress`
- `feat(web): integrate missions into Mi Olivo`
- `feat(web): integrate reward catalog into Mi Olivo`
- `test(loyalty): cover mission award idempotency`
- `docs: record Mi Olivo convergence results`

## Prohibiciones

- No mergear a `main` automáticamente.
- No borrar el sistema de loyalty/rewards existente para reemplazarlo.
- No duplicar wallets, balances o ledger.
- No otorgar puntos desde cliente.
- No introducir premios infinitos por clicks.
- No ocultar errores de migración o tests.
- No declarar terminado si no se ha comprobado visualmente.

## Definition of Done

El trabajo está listo para revisión cuando:

- Mi Olivo está integrado como destino principal sin romper navegación;
- Inicio resume el progreso;
- el olivo/vareo existente sigue funcionando y se ve mejor;
- Misiones utiliza datos reales;
- Recompensas está integrada;
- el perfil sigue accesible;
- saldos y canjes conservan seguridad/idempotencia;
- tests, typecheck y build pasan;
- móvil y escritorio han sido revisados visualmente;
- existe un documento final `docs/MI_OLIVO_IMPLEMENTATION_RESULTS_V1.md` con cambios, capturas/rutas verificadas, tests ejecutados y pendientes.
