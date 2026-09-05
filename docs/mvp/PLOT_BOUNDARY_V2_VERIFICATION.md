# Plot Boundary V2 — verificación

Fecha: 2026-09-03

## Rama validada

`feat/plot-boundary-v2`

## Gates ejecutados

GitHub Actions `Mágina Olivo Pages Preview`, run `33798691681`:

- instalación bloqueada de dependencias: OK;
- TypeScript de workspaces: OK;
- tests unitarios/source-contract: OK;
- tests geométricos de perímetro: OK;
- build web: OK;
- creación de artefacto Pages: OK;
- despliegue de preview: OK.

## Casos geométricos automáticos

- área determinista de un cuadrado WGS84 pequeño (~1 ha): OK;
- conversión a hectáreas dentro de tolerancia 0,9–1,1 ha: OK;
- rechazo de anillo abierto: OK;
- rechazo de menos de tres vértices distintos: OK.

## Seguridad / aislamiento

El endpoint de perímetro reutiliza la autorización de finca y exige rol con escritura. Una parcela ajena se resuelve como no encontrada y la superficie enviada por el cliente no se persiste: el backend la recalcula desde GeoJSON.

## Alcance pendiente deliberado

- overlay SIGPAC oficial;
- importación de geometría SIGPAC/Catastro;
- multipolígonos y huecos interiores;
- snapping a lindes;
- mapa offline completo.
