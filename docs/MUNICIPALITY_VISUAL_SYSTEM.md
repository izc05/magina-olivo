# Municipality Visual System — Mágina Olivo

Estado: diseño implementable en rama funcional
Fecha: 2026-09-08

## Objetivo

La portada pública de Mágina Olivo debe adaptar su hero al municipio de referencia seleccionado por la persona usuaria, manteniendo la estética Visual V2, la meteorología contextual y un fallback seguro de Sierra Mágina.

El municipio es contexto territorial compartido, no una propiedad exclusiva de la fotografía. La misma selección podrá alimentar progresivamente meteorología, noticias, eventos, directorio y servicios cercanos.

## Fuente territorial

La fuente de verdad de municipios continúa siendo `public_municipalities`. El registro visual del frontend solo enlaza activos y reglas de encuadre mediante el `slug`; no debe convertirse en un segundo catálogo administrativo.

Ámbito inicial de Mágina Olivo: los 15 términos municipales de la D.O. Sierra Mágina:

- Albanchez de Mágina
- Bedmar y Garcíez
- Bélmez de la Moraleda
- Cabra del Santo Cristo
- Cambil (incluye Arbuniel como alias/localidad)
- Campillo de Arenas
- Cárcheles
- La Guardia de Jaén
- Huelma (incluye Solera como alias/localidad)
- Jimena
- Jódar
- Larva
- Mancha Real
- Pegalajar
- Torres

`Larva` debe incorporarse a `public_municipalities` con el código AEMET verificado `23054` mediante una migración nueva para que instalaciones ya desplegadas también reciban el dato.

## Contrato de activos

Ruta reservada:

```text
apps/web/public/municipalities/
  README.md
  <slug>/
    hero.webp
    hero-mobile.webp
    thumb.webp
```

No se debe añadir una imagen de un tercero hasta documentar autoría, fuente y licencia/autorización de reutilización. Las imágenes pendientes usan `/photos/home-sierra-magina.webp` como fallback y nunca deben provocar un hero roto.

Tamaños objetivo:

- `hero.webp`: aproximadamente 1920×900, WebP, preferentemente <= 350 KB.
- `hero-mobile.webp`: aproximadamente 900×1200, WebP, preferentemente <= 250 KB.
- `thumb.webp`: aproximadamente 500×350, WebP, preferentemente <= 100 KB.

La fotografía debe ser reconocible como el municipio, panorámica, sin marcas de agua y con encuadre usable en móvil y escritorio.

## Selección y persistencia

Prioridad inicial:

1. municipio elegido explícitamente en la interfaz pública y guardado localmente;
2. municipio de la explotación activa cuando existe sesión y todavía no hay preferencia explícita;
3. fallback territorial de Sierra Mágina.

La preferencia visual local no altera el municipio real de una explotación ni ningún dato agrícola privado.

Clave local propuesta: `magina-olivo-public-municipality`.

La sincronización entre dispositivos podrá añadirse después como preferencia de usuario, sin convertir `user_preferences` en fuente de verdad agrícola.

## Comportamiento del hero

Al cambiar de municipio:

- actualizar inmediatamente el municipio de referencia;
- solicitar meteorología con el mismo `slug`;
- cambiar la fotografía cuando exista un activo aprobado;
- conservar fallback si el activo falta o falla;
- adaptar `object-position` por municipio;
- mantener el efecto meteorológico Visual V2 encima de la foto;
- respetar `prefers-reduced-motion`;
- mantener contraste y textos accesibles.

## Componentes

Implementación inicial deliberadamente sencilla:

- `municipality-visuals.ts`: registro visual por `slug`, aliases de compatibilidad, persistencia local y resolución de fallback.
- `PublicHomePage.tsx`: selector territorial, resolución desde explotación y consulta meteorológica por municipio seleccionado.
- `municipality-hero.css`: presentación del selector, `<picture>` y transición visual.
- `public-municipality-source.test.ts`: coherencia de los 15 municipios y Larva.

No se crea un store global ni una segunda tabla de imágenes en V1. Se evita añadir dependencias.

## Flujo futuro

```text
Municipio seleccionado
        │
        ├── Hero / fotografía
        ├── AEMET
        ├── Noticias locales
        ├── Eventos
        ├── Cooperativas / almazaras
        ├── Servicios cercanos
        └── Descubre Sierra Mágina
```

## Criterios de aceptación

- Los 15 municipios aparecen en el selector.
- La selección persiste al recargar en el mismo dispositivo.
- Una explotación con municipio reconocido puede establecer el contexto inicial si no existe preferencia manual.
- La petición AEMET usa el mismo `slug` seleccionado.
- Larva funciona como municipio válido (`23054`).
- Falta de fotografía o error de carga => fallback Sierra Mágina, nunca imagen rota.
- Cambiar de municipio no modifica datos privados de la explotación.
- El hero conserva el tratamiento soleado/parcial/lluvioso ya existente.
- Teclado, lector de pantalla y reduced-motion siguen funcionando.

## Regla de integración

Esta funcionalidad se desarrolla fuera de `staging/candidate-v11-2026-09-05`. No debe fusionarse en el candidato mientras continúe la aceptación P0 de V11.