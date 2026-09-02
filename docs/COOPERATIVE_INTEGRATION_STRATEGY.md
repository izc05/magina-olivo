# Estrategia de integración con cooperativas y almazaras

Fecha de revisión: 2026-09-02

## Hallazgo clave

Parte del sector ya dispone de soluciones digitales especializadas para la relación almazara-agricultor.

Se ha confirmado que S.C.A. San Sebastián (La Guardia de Jaén) enlaza desde su web oficial un `ACCESO SOCIOS` alojado en `sansebastian.almazaras.com`.

AM System comercializa soluciones para almazaras y dispone de la app MolturALO. La ficha pública de MolturALO describe acceso del agricultor a información como:

- entradas de productos;
- rendimientos;
- liquidaciones;
- entregas a cuenta;
- facturas;
- albaranes;
- DAT;
- parcelas/mapas;
- estadísticas.

Esto demuestra que Mágina Olivo no debe asumir que los datos de cooperativa están siempre aislados o en papel.

## Consecuencia de producto

Mágina Olivo NO debe intentar convertirse en el ERP de una almazara en la V1.

Su papel es el lado del agricultor:

`campo personal + campaña + varias cooperativas + información territorial + histórico propio`

Una cooperativa puede cambiar de software. El agricultor no debería perder por ello su histórico personal en Mágina Olivo.

## Escenarios de integración

### Nivel 0 — Manual

El usuario introduce:

- kilos;
- fecha;
- cooperativa;
- parcela/origen opcional;
- rendimiento cuando lo recibe;
- documento/foto opcional.

Este nivel debe ser siempre funcional.

### Nivel 1 — Documento asistido

El usuario adjunta un albarán, ticket o documento que posee legítimamente.

Mágina Olivo extrae un borrador de campos y el usuario confirma.

La extracción puede realizarse con parsing clásico, OCR/visión o IA según formato y coste.

### Nivel 2 — Importación de exportación

Si el portal de socio permite descargar CSV, Excel, PDF o formato estructurado:

- el usuario descarga sus datos;
- Mágina Olivo los importa;
- se conserva fuente/origen;
- se evita automatizar acceso privado.

Este es el primer camino de integración que conviene buscar.

### Nivel 3 — Integración autorizada con proveedor/cooperativa

Con autorización formal:

- API del proveedor;
- API propia de cooperativa;
- OAuth/token específico;
- webhook;
- exportación SFTP u otro canal pactado.

Mágina Olivo usa un adapter por proveedor, no lógica específica dispersa.

### Nivel 4 — Portal automatizado

No usar como estrategia de producto salvo que exista autorización contractual explícita y estable. Automatizar credenciales o scraping de zonas privadas es frágil, inseguro y puede vulnerar condiciones de uso.

## Modelo de adapter

Ejemplo conceptual:

```text
CooperativeDataProvider
  listDeliveries(userLink, campaign)
  listYields(userLink, campaign)
  listDocuments(userLink, campaign)
  getCampaignSummary(userLink, campaign)
```

Implementaciones futuras:

- `ManualProvider`
- `DocumentImportProvider`
- `CsvImportProvider`
- `AMSystemProvider` (solo si existe integración autorizada)
- proveedores futuros

## Identidad y deduplicación

Nunca usar el ID de un proveedor externo como ID canónico de Mágina Olivo.

Cada registro importado debe conservar:

- `source_provider`;
- `source_entity_id` cuando exista;
- `source_import_id`;
- `source_timestamp`;
- hash/clave de deduplicación;
- fecha de importación;
- estado de verificación.

## Datos sensibles

Entregas, rendimientos, liquidaciones, facturas y documentos son datos privados del usuario/socio.

Requisitos:

- consentimiento explícito;
- cifrado en tránsito;
- almacenamiento privado;
- revocación de conexión;
- auditoría;
- exportación/borrado;
- nunca exponer credenciales de cooperativa al frontend o a terceros.

## Posicionamiento frente a MolturALO

MolturALO está ligada a almazaras que utilizan el ecosistema ALO/AM System.

Mágina Olivo debe ser neutral al proveedor y aportar valor incluso cuando:

- el agricultor trabaja con dos cooperativas;
- una cooperativa no tiene portal;
- otra usa AM System;
- el agricultor quiere relacionar sus entregas con labores, costes, parcelas y campañas propias;
- cambia de cooperativa;
- quiere conservar un histórico personal independiente.

## Prioridad de investigación

Para cada cooperativa objetivo marcar:

- `portal_socios`: sí/no/desconocido;
- `provider_detected`: proveedor o desconocido;
- `mobile_app`: sí/no/desconocido;
- `export_available`: csv/xlsx/pdf/desconocido;
- `official_api`: sí/no/desconocido;
- `contact_for_integration`: dato público;
- `integration_level_possible`: 0-4.

## Fuentes de este hallazgo

- S.C.A. San Sebastián: https://senoriodemesia.es/
- MolturALO App Store: https://apps.apple.com/es/app/molturalo/id6444869462
- AM System / referencias públicas: https://amsystem.es/

## Decisión actual

V1 = Nivel 0 + diseño preparado para Nivel 1/2.

No retrasar el producto esperando APIs de cooperativas.
