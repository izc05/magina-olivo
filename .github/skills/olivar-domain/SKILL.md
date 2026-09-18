---
name: olivar-domain
description: Usa esta skill cuando trabajes con fincas, parcelas, campañas, actuaciones, cosechas, rendimientos, gastos, documentos o histórico agrícola.
---

# Dominio del olivar

## Modelo base
- Una finca tiene nombre propio e imagen de portada opcional.
- Una finca puede contener muchas parcelas.
- Una parcela puede tener alias/número/letra y referencia catastral cuando exista.
- La geometría de la parcela se conserva como dato propio aunque provenga inicialmente de una fuente externa.
- Una campaña agrupa la actividad de un periodo agrícola.
- Las actuaciones registran labores, tratamientos, riegos, notas, fotos y otros trabajos.
- La cosecha registra entregas, kilos, fechas, rendimiento y datos asociados.
- Gastos y documentos pertenecen al contexto de finca/parcela/campaña según corresponda.

## Histórico
Las campañas anteriores deben soportar:
- kilos recolectados;
- fechas de recolección y entrega;
- rendimientos;
- comparativas entre campañas;
- resúmenes y gráficas.

## Reglas
- No diseñes el núcleo alrededor de una cooperativa concreta.
- No obligues a tener referencia catastral para crear una parcela manual.
- Evita duplicar una misma parcela solo porque cambie la fuente de datos.
- Conserva trazabilidad del origen de geometría/datos cuando sea útil.
- Los módulos futuros deben engancharse al núcleo sin romperlo.
