# Mágina Olivo — instrucciones de repositorio

Estas instrucciones describen la dirección canónica actual del proyecto y prevalecen sobre documentación histórica que todavía hable de una PWA como producto principal.

## Baseline canónica
- Producto principal: aplicación Android nativa.
- Arquitectura: offline-first.
- Backend desacoplado: Supabase.
- Núcleo de dominio: finca → parcela → campaña → actuación → cosecha / gastos / documentos.
- Catastro se usa para localizar e incorporar parcelas y conservar geometrías propias.
- Enfoque inicial: el propio agricultor y sus propias fincas de olivar. El modo profesional para fincas de terceros queda para una fase posterior.
- Desarrollo por fases y gates, en ramas aisladas.
- Diseño canónico: crema + verde olivo, fotografía del olivar/Sierra Mágina, tipografía editorial + sans operativa, tarjetas suaves y navegación móvil coherente.
- Onboarding: 4–6 pantallas.
- El histórico de campañas debe mostrar kilos, fechas, rendimientos y comparativas.
- Inicio debe quedar preparado para tiempo/radar, alertas, mercado del aceite y accesos al olivar.

## Reglas
1. No reescribas la arquitectura por iniciativa propia.
2. No cambies decisiones canónicas salvo petición explícita.
3. No mezcles ramas funcionales activas.
4. Antes de implementar, identifica gate y criterios de aceptación.
5. Mantén modelos desacoplados de proveedores externos.
6. Prioriza funcionamiento offline y sincronización segura.
7. Las integraciones externas deben degradar con elegancia sin red.
8. No introduzcas secretos ni tokens.
9. Cada cambio debe ser pequeño, verificable y reversible.
10. Si documentación histórica contradice esta baseline, señala la discrepancia y usa la baseline actual.

## Skills
Carga la skill específica cuando corresponda:
- `.github/skills/project-guardrails/SKILL.md`
- `.github/skills/android-offline-first/SKILL.md`
- `.github/skills/olivar-domain/SKILL.md`
- `.github/skills/catastro-maps/SKILL.md`
- `.github/skills/weather-alerts/SKILL.md`
- `.github/skills/supabase-sync/SKILL.md`
- `.github/skills/ui-canonical/SKILL.md`
- `.github/skills/testing-gates/SKILL.md`
- `.github/skills/git-safe-workflow/SKILL.md`
