# Mágina Olivo — Mapa de Parcelas V1

Fecha: 2026-09-03

## Objetivo

Añadir a **Mi Campo** una localización funcional de parcelas sin romper el modelo agrícola existente.

Nombre visible: **Mapa de Parcelas**.

Nombre técnico: **geolocalización de parcelas**.

## Alcance V1

Cada parcela puede guardar:

- un punto de localización (`latitude`, `longitude`);
- superficie declarada;
- referencia SIGPAC;
- número de olivos;
- tipo de riego;
- notas;
- su historial ya existente de labores, entregas y rendimientos.

La interfaz permite:

1. seleccionar una parcela;
2. verla sobre un mapa real de OpenStreetMap;
3. usar la ubicación GPS del dispositivo para situarla;
4. introducir o corregir coordenadas manualmente;
5. guardar la localización con autorización de la explotación;
6. abrir la ubicación en un mapa externo para navegación.

## Decisiones técnicas

- No se añade una dependencia cartográfica npm en V1. El mapa se integra mediante la vista embebida oficial de OpenStreetMap para mantener el bundle y el lockfile estables.
- Las coordenadas privadas siguen pasando exclusivamente por la API autenticada.
- El backend valida rangos WGS84: latitud `-90..90`, longitud `-180..180`.
- La edición comprueba permisos `owner/admin/collaborator` mediante el mismo control de acceso de parcelas.
- Los datos geográficos pertenecen a la parcela y no se publican en el directorio público.

## Fuera de alcance de este primer corte

Quedan preparados como evolución, pero no se presentan como terminados:

- dibujo y edición de perímetros/polígonos;
- cálculo automático de superficie desde el polígono;
- importación o superposición oficial de recintos SIGPAC;
- ortofoto PNOA;
- caché completa de teselas para uso sin cobertura.

Estas funciones requieren una capa geoespacial específica y, en el caso de SIGPAC/PNOA, integración documentada con sus fuentes oficiales.

## Integración funcional

El mapa se presenta dentro de **Mi Campo**, junto al cuaderno personal. La selección de parcela conserva el mismo identificador que ya relaciona:

- labores;
- entregas;
- rendimientos;
- documentos;
- campañas.

Por tanto, la geolocalización amplía la parcela existente; no crea una entidad paralela.

## Criterios de aceptación

- GET de parcelas devuelve `latitude` y `longitude`.
- POST de parcela admite coordenadas opcionales.
- PATCH de una parcela permite actualizar su localización sin cambiar otros datos.
- Un usuario sin permiso de escritura no puede cambiar coordenadas.
- La UI muestra claramente parcelas localizadas y pendientes de localizar.
- GPS requiere acción explícita del usuario y usa la API `navigator.geolocation`.
- Los errores de permisos, GPS y red son visibles y recuperables.
- La vista es usable en móvil y no bloquea el cuaderno de campo si el mapa externo no carga.
