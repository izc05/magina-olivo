# Codex Brief — Vincular parcela existente con Catastro

Fecha: 2026-09-08  
Documento funcional obligatorio: `docs/design/CATASTRO_LINK_EXISTING_PLOT_V1.md`

## Objetivo

Añadir a una parcela que ya existe en Mágina Olivo una acción clara:

```text
Vincular con Catastro
```

con dos caminos principales:

```text
1. Estoy en la finca -> GPS -> mapa Catastro -> seleccionar
2. Buscar manualmente -> referencia / polígono-parcela / mover mapa -> seleccionar
```

No obligar a borrar ni recrear la parcela.

## Reutilización obligatoria

Antes de implementar, inspeccionar y reutilizar/refactorizar:

- `apps/web/src/CatastroParcelPanel.tsx`
- `apps/web/src/PlotMapEditor.tsx`
- `apps/web/src/ParcelSourceComparisonPanel.tsx`
- `apps/api/src/catastro-client.ts`
- `apps/api/src/catastro-map-routes.ts`
- `apps/api/src/plot-routes.ts`
- migraciones de perímetro/provenance/referencia catastral
- tests de Catastro y geometría existentes.

No crear un segundo cliente Catastro ni un segundo modelo de geometría si los contratos actuales pueden evolucionar.

## UX objetivo

Desde `ParcelPage`:

```text
Ubicación y lindes
Sin Catastro
[Vincular con Catastro]
```

Selector inicial:

```text
¿Cómo quieres encontrar tu parcela?

[📍 Estoy en la finca]
[🔎 Buscar manualmente]
```

### GPS

- pedir `navigator.geolocation` solo tras pulsación explícita;
- centrar viewport;
- consultar parcelas catastrales cercanas con límite razonable;
- mostrar precisión si está disponible;
- permitir pan/zoom y selección manual;
- si permiso denegado, ofrecer búsqueda manual sin bloquear.

### Manual

Ofrecer en una misma experiencia:

- referencia catastral;
- municipio + polígono + parcela;
- mover/zoom del mapa hasta localizar visualmente.

Todas las opciones terminan en el mismo selector cartográfico y la misma pantalla de confirmación.

## Verificación

El navegador no persiste una geometría como autoridad.

Al confirmar:

1. enviar referencia seleccionada;
2. backend autentica y autoriza;
3. valida que `plotId` pertenece al holding/farm del usuario;
4. vuelve a consultar Catastro;
5. valida geometría y referencia;
6. guarda referencia, perímetro, superficie/provenance y fecha de verificación según contratos vigentes.

Conservar la filosofía actual de doble confirmación de `CatastroParcelPanel`.

## Superficie/perímetro previos

Si existe superficie manual diferente, no sobrescribir silenciosamente.

Si existe perímetro manual, presentar comparación y selección explícita del perímetro principal. Conservar provenance/histórico conforme a la arquitectura actual.

## Después de guardar

Volver a la parcela y mostrar:

```text
Catastro ✓
RC ...
Superficie ...
Verificado ...
[Ver mapa completo]
```

El mapa completo debe permitir ortofoto + perímetro privado + Catastro, y SIGPAC como capa secundaria cuando esté disponible.

## Errores

Catastro caído, GPS denegado o referencia no encontrada nunca deben modificar la parcela existente ni impedir seguir registrando labores.

## Tests mínimos

- GPS allowed/denied/unavailable/low accuracy;
- referencia válida/inválida;
- polígono/parcela;
- búsqueda manual moviendo mapa;
- 0/1/N resultados;
- selección y cambio de selección;
- referencia ya vinculada;
- cambio de vínculo;
- superficie manual diferente;
- perímetro manual previo;
- Catastro timeout/5xx;
- autorización e aislamiento entre holdings;
- touch/320 px/teclado.

## Fuera de alcance

- demostrar propiedad;
- datos protegidos del titular;
- guardar historial de GPS personal;
- asumir que Catastro y SIGPAC son equivalentes;
- sustituir automáticamente datos del usuario sin confirmación.
