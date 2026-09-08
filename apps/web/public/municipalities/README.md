# Imágenes de municipios — Mágina Olivo

Este directorio reserva los activos visuales del hero y del futuro selector de pueblos.

## Estructura por municipio

```text
<slug>/
  hero.webp
  hero-mobile.webp
  thumb.webp
```

Slugs admitidos inicialmente:

```text
albanchez-de-magina
bedmar-y-garciez
belmez-de-la-moraleda
cabra-del-santo-cristo
cambil
campillo-de-arenas
carcheles
guardia-de-jaen
huelma
jimena
jodar
larva
mancha-real
pegalajar
torres
```

## Reglas

1. No copiar imágenes de Google ni de webs de terceros sin verificar derechos.
2. Documentar autor, fuente y licencia/autorización en `municipality-visuals.ts` antes de marcar un activo como `ready`.
3. No incluir marcas de agua.
4. Mantener WebP y tamaños razonables para PWA móvil.
5. Si un activo aún no está aprobado, Mágina utiliza `/photos/home-sierra-magina.webp`.
6. Los nombres de carpetas deben coincidir exactamente con `public_municipalities.slug`.

## Objetivo de tamaños

- `hero.webp`: 1920×900 aprox., <= 350 KB preferentemente.
- `hero-mobile.webp`: 900×1200 aprox., <= 250 KB preferentemente.
- `thumb.webp`: 500×350 aprox., <= 100 KB preferentemente.

La presencia física del archivo no basta para publicarlo: el registro visual debe tener `ready: true` y metadatos de procedencia revisados.