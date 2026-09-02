# Exportación y portabilidad V1 — Mágina Olivo

Estado: diseño funcional/técnico previo a piloto.

## Principio

Los datos del agricultor no deben quedar atrapados en Mágina Olivo.

La V1 debe permitir exportar información propia en formatos útiles y documentados, independientemente de que exista o no integración con una cooperativa.

## Objetivos

1. Copia comprensible para el usuario.
2. Formato estructurado para reutilización.
3. Exportación de documentos originales.
4. Trazabilidad de origen.
5. Evitar formatos propietarios opacos.

## Exportación mínima V1

### CSV

Ficheros separados:
- `holdings.csv`
- `farms.csv`
- `plots.csv`
- `campaigns.csv`
- `deliveries.csv`
- `delivery_results.csv`
- `activities.csv`
- `tasks.csv`
- `document_index.csv`

CSV UTF-8, cabeceras estables y fechas ISO 8601.

Mitigar spreadsheet formula injection: valores que empiecen por caracteres interpretables como fórmula deben escaparse/sanitizarse de forma segura en la exportación destinada a hojas de cálculo.

### JSON

`magina-olivo-export-v1.json`

Debe contener:
- `schema_version`;
- fecha exportación;
- timezone/locale relevante;
- entidades estructuradas;
- IDs estables;
- relaciones.

JSON es la copia más completa para una futura importación/reutilización técnica.

### Documentos

ZIP opcional:

```text
export/
  data/
  documents/
  manifest.json
```

El `manifest` relaciona documentos con entidades sin depender del nombre original como identificador.

## Alcance de «mis datos»

Exportar datos privados de la explotación a los que el usuario tenga derecho según rol.

No exportar como si fueran del usuario:
- bases completas de cooperativas;
- datos de otros miembros no necesarios;
- secretos;
- logs internos;
- datos personales de terceros sin justificación.

## Roles

### owner
Puede solicitar exportación integral de su holding, sujeto a controles de seguridad.

### admin/collaborator/viewer
La capacidad de exportación integral debe definirse expresamente; no asumir que `viewer` puede descargar todo el archivo de explotación.

Para piloto single-owner la decisión es sencilla, pero el contrato debe quedar preparado.

## Seguridad de exportación

Una exportación integral es sensible.

Controles candidatos:
- sesión fresca/reautenticación si procede;
- job asíncrono;
- archivo temporal;
- URL firmada de corta duración;
- audit event;
- expiración/borrado del ZIP generado;
- no enviar adjuntos grandes por email.

## Job de exportación

Estados:
`requested -> generating -> ready -> expired | failed`

El usuario puede cerrar la app mientras se genera.

No generar exportaciones pesadas en request HTTP largo.

## Versionado

Cada export incluye `schema_version`.

Cambios de columnas/semántica requieren:
- documentación;
- compatibilidad de lector cuando sea razonable;
- migrador/importador futuro si se soporta reimportación.

## Portabilidad RGPD

Cuando resulte aplicable el derecho de portabilidad, la AEPD describe la entrega de datos personales en formato estructurado, de uso común y lectura mecánica, e incluso transmisión directa a otro responsable cuando sea técnicamente posible.

Mágina Olivo debe diseñar sus exportaciones para facilitar ese principio, sin confundir una exportación completa de producto con el alcance jurídico exacto del derecho en cada caso.

La revisión jurídica previa a piloto determinará:
- base de legitimación;
- alcance exacto de datos portables;
- tratamiento de datos inferidos/externos;
- canal de ejercicio de derechos.

## Exportación de campaña

Además de exportación integral, ofrecer una exportación práctica por campaña:
- resumen;
- entregas;
- rendimientos;
- labores;
- documentos relacionados.

Útil para:
- archivo personal;
- asesor;
- comparar temporadas;
- migrar de herramienta.

## PDF

Un PDF resumen puede ser útil para lectura humana, pero no sustituye CSV/JSON para portabilidad.

PDF futuro candidato:
- campaña;
- kilos;
- rendimiento ponderado + cobertura;
- gráficos;
- listado entregas;
- principales labores;
- fuentes/avisos.

## Importación inversa

No se promete «exportar y reimportar todo» en V1, pero el JSON debe diseñarse con IDs/versionado para que sea viable más adelante.

## Borrado de cuenta y exportación

Antes de una supresión voluntaria, la UI puede ofrecer:

> Descargar una copia de tus datos

pero no condicionar el ejercicio de derechos a que el usuario la descargue.

## Datos públicos en export

Si se incluye nombre/datos básicos de una cooperativa para dar contexto a una entrega:
- incluir solo lo necesario;
- indicar referencia/ID;
- no empaquetar contenido editorial/fotos ajenas.

## Criterios de aceptación V1

- [ ] owner exporta CSV de entregas y resultados;
- [ ] media/kilos exportados coinciden con API/dashboard;
- [ ] fechas ISO;
- [ ] null no se convierte en cero;
- [ ] CSV no ejecuta fórmulas peligrosas al abrirse en hoja de cálculo;
- [ ] exportación no contiene datos de otro holding;
- [ ] JSON incluye schema version;
- [ ] documentos descargados requieren autorización;
- [ ] export job queda auditado;
- [ ] archivo temporal expira.
