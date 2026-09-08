# Mi Olivo — Gamificación y fidelización V1

## Estado

**Documento de convergencia.** Este módulo ya tiene una base técnica real en el repositorio. No se debe reescribir desde cero ni crear un sistema paralelo.

Rama de trabajo recomendada:

`feat/mi-olivo-gamification-convergence-v1`

Base utilizada:

`feat/reward-redemption-status-sync-v1`

## Objetivo de producto

Convertir **Mi Olivo** en el sistema de progreso y fidelización de Mágina Olivo. La gamificación debe premiar acciones útiles del usuario dentro de la plataforma y conectar ese progreso con recompensas reales o digitales.

El usuario no ve "puntos": ve **Aceitunas 🫒**.

Ciclo principal:

```text
Abrir Mágina
  → realizar una acción útil
  → completar una misión o evento
  → ganar aceitunas pendientes
  → ver crecer/cargarse el olivo
  → varear/recoger
  → aceitunas disponibles
  → subir de nivel / desbloquear logros
  → canjear recompensas
  → volver a usar Mágina
```

## Principio fundamental

**Mi Campo y Mi Olivo son módulos diferentes.**

- `Mi Campo`: fincas → parcelas → labores → campaña → cosecha → entregas → costes/documentación.
- `Mi Olivo`: progreso → aceitunas → misiones → niveles → rachas → logros → recompensas → referidos.

Mi Olivo recompensa el uso útil de Mi Campo y del resto de Mágina, pero no sustituye la gestión agrícola.

---

# 1. Lo que ya existe y DEBE reutilizarse

Antes de modificar código, inspeccionar y preservar las decisiones ya implementadas en:

### Backend

- `apps/api/src/loyalty-routes.ts`
- `apps/api/src/loyalty-service.ts`
- `apps/api/src/reward-routes.ts`
- `apps/api/src/reward-service.ts`
- `apps/api/src/reward-partner-routes.ts`
- `apps/api/src/reward-partner-service.ts`
- `apps/api/src/reward-partner-inspect.ts`

### Frontend

- `apps/web/src/LoyaltyOlivePage.tsx`
- `apps/web/src/loyalty-api.ts`
- `apps/web/src/loyalty-olive.css`
- `apps/web/src/RewardCatalogPage.tsx`
- `apps/web/src/RewardPickupCodePanel.tsx`
- `apps/web/src/RewardValidatorPage.tsx`
- `apps/web/src/LocalRewardQr.tsx`
- `apps/web/src/reward-api.ts`
- `apps/web/src/reward-partner-api.ts`
- `apps/web/src/local-qr.ts`
- `apps/web/src/reward-redemption-status.ts`

### Worker

- `apps/worker/src/reward-redemption-expiry.ts`

### Base de datos

- `db/migrations/0040_loyalty_olives_foundation.sql`
- `db/migrations/0041_loyalty_collect_idempotency.sql`
- `db/migrations/0042_aove_rewards.sql`
- `db/migrations/0043_reward_partner_validation.sql`
- `db/migrations/0044_loyalty_redemption_expiry.sql`

La base ya incluye:

- wallet por usuario;
- ledger/transactions como fuente de verdad;
- saldo pendiente y disponible;
- lifetime earned;
- niveles;
- reglas de premios por evento;
- idempotencia;
- límites vitalicios y cooldown;
- catálogo de recompensas;
- canje;
- QR/código local;
- validación de partner;
- expiración de canjes;
- sincronización de estado.

**Prohibido** introducir una segunda tabla de balance o un segundo ledger si la necesidad puede resolverse extendiendo lo existente.

---

# 2. Identidad visual

Nombre visible del módulo:

**Mi Olivo**

Moneda/puntuación visible:

**Aceitunas 🫒**

El olivo es la representación visual del progreso del usuario. Debe sentirse integrado con la identidad de Sierra Mágina, no como un minijuego infantil separado de la aplicación.

La pantalla actual `LoyaltyOlivePage.tsx` ya contiene un olivo SVG, frutos, vareo, red, animación y saldo. Antigravity debe **mejorar esta base**, no sustituirla por un dashboard genérico.

Estados de evolución recomendados:

1. Brote
2. Olivo joven
3. Olivo
4. Olivo maduro
5. Olivo centenario

Los niveles definitivos deben derivarse de `loyalty_levels`; si se cambian, hacerlo mediante migración y mantener compatibilidad.

---

# 3. Navegación e integración en la app

La navegación móvil actual ya dispone de cinco espacios principales y un botón central de campaña. No añadir un sexto elemento.

## Navegación móvil/PWA objetivo

```text
Inicio | Mi Campo | + Campaña | Mágina | Mi Olivo
```

La cabecera ya dispone del avatar/perfil. El acceso a cuenta, configuración y cierre de sesión debe mantenerse desde el avatar o un flujo equivalente, por lo que el espacio actual de `Mi Mágina` puede evolucionar a `Mi Olivo` sin perder acceso al perfil.

Antes de hacer este cambio, comprobar que todas las funciones actualmente accesibles desde `MoreTab` siguen alcanzables desde el avatar/cuenta.

## Inicio

Añadir una tarjeta compacta, no invasiva:

- imagen/miniatura del olivo;
- saldo disponible 🫒;
- aceitunas pendientes si existen;
- nivel;
- máximo 1–2 misiones destacadas;
- CTA `Ver mi olivo`.

## Cabecera

Cuando haya sesión, valorar un contador compacto `1.280 🫒` que abra Mi Olivo. No debe saturar móvil ni competir con alertas/perfil.

## Ruta dedicada

Mantener una experiencia dedicada accesible directamente por URL, idealmente:

`/mi-olivo`

Si la infraestructura actual utiliza entrypoints/routing manual en lugar de React Router, implementar la ruta de forma coherente con el patrón existente y documentarla.

## Escritorio

En layout ancho, Mi Olivo debe ser un destino de primer nivel en la navegación lateral o equivalente, sin duplicar Recompensas como sección principal si puede vivir dentro de Mi Olivo.

---

# 4. Estructura UX de Mi Olivo

La página debe organizarse en cuatro vistas internas o secciones claramente navegables:

1. **Olivo**
2. **Misiones**
3. **Recompensas**
4. **Logros**

La vista inicial debe ser `Olivo`.

## Vista Olivo

Mostrar como mínimo:

- olivo visual;
- nivel actual;
- progreso al siguiente nivel;
- aceitunas pendientes;
- aceitunas disponibles;
- animación de vareo/recogida;
- racha resumida;
- misión recomendada;
- acceso a historial de movimientos.

La acción `Varear y recoger` actual se conserva porque da personalidad al sistema. Debe respetar `prefers-reduced-motion`.

## Misiones

Agrupar:

- Hoy
- Esta semana
- Especiales / campaña

Cada misión debe mostrar:

- nombre;
- descripción corta;
- recompensa;
- progreso;
- frecuencia/límite;
- CTA contextual (`Ir a Mi Campo`, `Leer`, `Compartir`, etc.).

Las misiones NO deben completarse por un simple clic arbitrario. Deben depender de eventos verificables del backend siempre que sea posible.

## Recompensas

Reutilizar `RewardCatalogPage` y el flujo de canje existente, pero integrarlo visualmente dentro de Mi Olivo.

Tipos futuros:

- botella AOVE;
- estuche/cata;
- descuento en negocio local;
- recompensa digital;
- participación en sorteo/campaña;
- beneficio patrocinado.

## Logros

Ejemplos iniciales:

- Primera parcela
- Primera labor
- Primera cosecha
- Primera entrega
- Campaña completada
- 7 días activo
- Embajador de Mágina
- Olivo centenario

Un logro puede otorgar o no aceitunas. La concesión debe ser determinista y auditable.

---

# 5. Misiones y eventos

La base actual ya premia eventos mediante `loyalty_rules`. Este mecanismo debe convertirse en la fuente de verdad para misiones automáticas siempre que encaje.

Eventos existentes de la migración inicial:

- `account.created`
- `profile.completed`
- `parcel.first_created`
- `parcel.completed`
- `harvest.first_created`
- `yield.recorded`
- `campaign.completed`
- `referral.validated`

Eventos V1 a estudiar/añadir de forma controlada:

- `activity.created` / labor registrada;
- `delivery.created` / entrega registrada;
- `weather.checked` con límite estricto;
- `news.read` con validación mínima de lectura y límite;
- `content.shared` con límite diario;
- `plot.photo.added` si existe soporte de fotos;
- `weekly.goal.completed`;
- `streak.goal.completed`.

No premiar acciones de bajo valor de forma ilimitada.

Ejemplos de reglas razonables:

| Acción | Premio inicial | Límite recomendado |
|---|---:|---|
| Completar perfil | 75 🫒 | una vez |
| Primera parcela | 150 🫒 | una vez |
| Registrar labor | 10 🫒 | con límite diario/semanal |
| Añadir rendimiento | 50 🫒 | anti-duplicado |
| Completar campaña | 250 🫒 | una vez por campaña |
| Compartir contenido | 10 🫒 | máx. 1 recompensa/día |
| Referido validado | 300 🫒 | solo conversión real |

Los valores deben quedar configurables mediante reglas; no dispersarlos como constantes por el frontend.

---

# 6. Modelo a extender, no duplicar

Mantener el ledger actual como fuente de verdad.

Añadir nuevas tablas solo cuando aporten semántica que hoy no existe. Candidatas:

- `loyalty_missions`
- `loyalty_mission_progress`
- `loyalty_achievements`
- `loyalty_user_achievements`
- `loyalty_streaks`
- `loyalty_referrals` si el flujo actual no dispone de una entidad equivalente
- `loyalty_campaigns` solo si no puede modelarse con las campañas/recompensas existentes

Antes de crear cada tabla, buscar si existe una entidad equivalente en el repositorio.

No almacenar `user.points` como fuente de verdad. El balance se deriva del ledger existente.

---

# 7. Seguridad y antifraude

Obligatorio:

- todas las escrituras de recompensa en backend;
- idempotency keys estables;
- no confiar en cantidades enviadas por cliente;
- límites por usuario/regla;
- cooldown y/o límite diario/semanal;
- referidos solo después de una acción de activación real;
- no premiar refresh/repetición del mismo request;
- auditoría de ajustes manuales;
- canjes transaccionales y sin saldo negativo;
- QR/códigos de un solo uso según el flujo existente;
- mantener expiración de canjes y validación de partner;
- tests de concurrencia en movimientos críticos.

Para eventos como compartir o leer noticias, diseñar primero el criterio verificable y el límite; si no puede verificarse de forma segura, el premio debe ser pequeño y fuertemente limitado.

---

# 8. Rachas

Evitar mecánicas punitivas que obliguen al usuario a entrar 365 días.

V1 recomendada:

- objetivo semanal flexible: actividad útil en 5 de 7 días;
- racha visible pero no dominante;
- bonus solo cuando se cumple la condición;
- no generar recompensas repetibles mediante abrir/cerrar la app.

---

# 9. Administración

Crear/planificar `Admin → Fidelización` reutilizando el sistema de reglas y recompensas.

Secciones:

- Misiones
- Reglas de aceitunas
- Recompensas
- Logros
- Campañas
- Referidos
- Patrocinadores/partners
- Canjes
- Estadísticas

El administrador debe poder activar/desactivar y programar reglas sin editar código.

Primera fase Admin mínima:

- listar reglas;
- crear/editar regla segura;
- activar/desactivar;
- fechas inicio/fin;
- aceitunas;
- límite;
- cooldown;
- ver movimientos/canjes de forma auditada.

No permitir que el frontend admin escriba directamente saldos.

---

# 10. Notificación de misión completada

Cuando una acción normal genera aceitunas, mostrar una notificación breve que no bloquee el flujo:

```text
Misión completada
+10 🫒
Registrar una labor
[Ver mi olivo]
```

El evento de backend debe ser la fuente que confirme la recompensa. No mostrar una recompensa optimista que luego no exista en ledger.

---

# 11. Clima y escena del olivo

La escena puede evolucionar visualmente con el clima ya disponible en Mágina:

- sol;
- nubes;
- lluvia;
- viento ligero.

Esto es puramente visual y nunca debe bloquear la pantalla ni convertir la llamada meteorológica en dependencia crítica del saldo/recompensas.

Aplicar degradación elegante si no hay datos meteorológicos.

---

# 12. Accesibilidad y rendimiento

Obligatorio:

- mobile first;
- objetivos táctiles adecuados;
- contraste suficiente;
- textos legibles para usuario no técnico;
- semántica ARIA donde corresponda;
- teclado en escritorio;
- `prefers-reduced-motion`;
- no depender solo del color para progreso/estado;
- escena/animaciones ligeras;
- lazy loading de recursos visuales pesados;
- no romper modo offline del núcleo.

---

# 13. Fases de implementación

## Fase 1 — Convergencia funcional

- consolidar navegación a Mi Olivo;
- integrar tarjeta en Inicio;
- preservar olivo/vareo actual;
- integrar saldo, niveles e historial;
- crear UI de Misiones sobre el motor de reglas;
- integrar catálogo de Recompensas dentro del módulo;
- notificación de premio;
- pruebas responsive y accesibilidad.

## Fase 2 — Retención

- logros;
- rachas;
- misión diaria/semanal;
- mejoras visuales del árbol;
- clima ambiental.

## Fase 3 — Ecosistema local

- recompensas de cooperativas/negocios;
- QR completo;
- stock;
- campañas patrocinadas;
- estadísticas para partners.

## Fase 4 — Minijuego

- vareo más interactivo;
- animación/háptica opcional;
- eventos de temporada;

El minijuego no puede ser la fuente de creación de saldo: solo representa/recolecta saldo ya ganado o usa reglas server-side específicas.

---

# 14. Criterios de aceptación V1

La convergencia V1 se considera terminada cuando:

- [ ] Mi Olivo es accesible desde la navegación principal móvil sin añadir un sexto destino.
- [ ] Perfil/configuración siguen accesibles.
- [ ] Inicio muestra resumen de Mi Olivo.
- [ ] El saldo mostrado coincide con el ledger backend.
- [ ] Las aceitunas pendientes se pueden varear/recoger sin duplicación.
- [ ] Los niveles se calculan desde backend.
- [ ] Existe una vista Misiones con progreso real.
- [ ] Las reglas no dependen de cantidades confiadas al cliente.
- [ ] Recompensas reutiliza el catálogo/canje ya existente.
- [ ] QR/partner/expiración existentes no se rompen.
- [ ] Hay historial auditable de movimientos.
- [ ] Una petición repetida con la misma idempotency key no duplica premio.
- [ ] Los eventos repetibles tienen límites/cooldown apropiados.
- [ ] Responsive móvil y escritorio comprobados.
- [ ] `prefers-reduced-motion` comprobado.
- [ ] Tests unitarios/integración de reglas críticas pasan.
- [ ] Build y typecheck pasan.
- [ ] No se introducen secretos.
- [ ] La documentación queda actualizada.

---

# 15. Instrucción de diseño para Antigravity

Antigravity debe tratar este trabajo como **mejora y convergencia de un módulo existente**, no como generación desde cero.

Debe:

1. leer `AGENTS.md`, `MASTER_PLAN.md`, `ARCHITECTURE.md`, `docs/DESIGN_SYSTEM_V1.md` y este documento;
2. inspeccionar primero los archivos de loyalty/rewards listados arriba;
3. ejecutar la aplicación y capturar el estado visual actual antes de modificarlo;
4. conservar lo que ya funciona;
5. mejorar navegación, jerarquía visual y flujo;
6. implementar por pequeños commits coherentes;
7. ejecutar tests/typecheck/build tras cada bloque importante;
8. comprobar móvil y escritorio en navegador;
9. documentar cualquier desviación;
10. dejar evidencia clara de qué se reutilizó, qué se cambió y qué queda pendiente.

La experiencia final debe sentirse como una parte natural de Mágina Olivo: útil, sencilla, agrícola, visual y con personalidad propia.
