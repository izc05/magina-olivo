# Contrato de importación de datos — Mágina Olivo

Fecha: 2026-09-02
Estado: diseño V1

## Objetivo

Permitir que datos procedentes de distintos canales terminen en un modelo común sin perder trazabilidad:

- entrada manual;
- foto/ticket;
- PDF;
- CSV/XLSX;
- exportación de portal de socio;
- futura API autorizada de cooperativa/proveedor.

Mágina Olivo no debe depender del formato de AM System, Aicor, Toolagro ni de ninguna cooperativa concreta.

## Regla central

```text
FUENTE EXTERNA
      ↓
  parser/adapter
      ↓
 staging normalizado
      ↓
 preview + deduplicación
      ↓
 confirmación/reglas seguras
      ↓
 MODELO CANÓNICO MÁGINA OLIVO
```

Nunca adaptar el núcleo de la aplicación directamente al esquema de un proveedor.

## 1. Tipos de entrada

### MANUAL

Datos escritos directamente por el usuario.

Ventajas:
- disponible desde V1;
- independiente de terceros;
- muy simple.

Riesgo:
- error de transcripción.

Estado habitual:
- `user_confirmed`.

### DOCUMENT_IMPORT

Foto, PDF o documento emitido por cooperativa/almazara.

V1 puede permitir:
- guardar documento;
- rellenar datos manualmente mientras se visualiza;
- asociarlo a entrega/resultado.

Futuro:
- OCR/IA prepara campos;
- usuario confirma antes de crear el registro.

### FILE_IMPORT

CSV/XLSX u otro fichero estructurado descargado por el propio agricultor.

Siempre debe pasar por:
- parser conocido;
- staging;
- preview;
- detección de duplicados;
- confirmación.

### PROVIDER_SYNC

API/exportación automática mediante acuerdo o mecanismo autorizado.

Requisitos:
- autenticación oficial;
- scopes mínimos;
- adapter separado;
- idempotencia;
- logs de sincronización;
- revocación por el usuario.

## 2. Contrato canónico de entrega

Campos mínimos normalizados:

```json
{
  "campaign": "2026/27",
  "delivered_at": "2026-11-18T18:42:00+01:00",
  "kilograms": 1842.0,
  "destination": {
    "cooperative_id": "optional-internal-id",
    "external_name": "optional-source-name"
  },
  "origin": {
    "farm_id": "optional",
    "plot_id": "optional"
  },
  "ticket_number": "optional",
  "variety": "optional",
  "harvest_origin": "optional",
  "source": {
    "type": "manual|document_import|file_import|provider_sync",
    "provider": "optional",
    "external_id": "optional"
  }
}
```

### Validaciones mínimas

- `kilograms > 0`;
- fecha razonable para la campaña, con posibilidad de excepción confirmada;
- destino vacío permitido solo si el usuario confirma que lo completará después;
- finca/parcela opcionales;
- ticket opcional;
- rendimiento no obligatorio.

## 3. Contrato canónico de resultado/rendimiento

```json
{
  "delivery_ref": "internal-or-staging-reference",
  "result_type": "yield_percentage",
  "value": 21.7,
  "unit": "%",
  "measured_at": "optional",
  "source": {
    "type": "manual|document_import|file_import|provider_sync",
    "provider": "optional",
    "external_id": "optional"
  }
}
```

### Validación

Para porcentajes:
- rango técnico configurable;
- valores fuera de rango no se descartan silenciosamente;
- se marcan como `warning` y requieren revisión.

No asumir que todos los proveedores llaman `rendimiento` a la misma magnitud. El adapter debe mapear semántica, no solo nombres de columnas.

## 4. Contrato documental

Un documento importado debe conservar:

- archivo original;
- hash;
- tipo MIME;
- fecha de carga;
- usuario;
- tipo documental declarado/detectado;
- relaciones con registros;
- origen.

El contenido extraído nunca sustituye al documento original.

## 5. Staging

Todo fichero estructurado y toda extracción automática compleja entra primero en staging.

Cada fila/registro debe poder mostrar:

- datos originales relevantes;
- datos normalizados;
- warnings;
- posible duplicado;
- destino canónico;
- acción propuesta.

Acciones de usuario:
- aceptar;
- editar;
- ignorar;
- unir con registro existente.

## 6. Deduplicación

### Coincidencia fuerte

Ejemplos:
- mismo proveedor + mismo `external_id`;
- mismo ticket verificado en misma cooperativa/campaña;
- mismo hash de documento vinculado a la misma entrega.

Acción:
- no crear duplicado;
- actualizar solo campos permitidos según política de confianza.

### Coincidencia probable

Ejemplo:
- misma cooperativa;
- fecha muy cercana;
- mismos kilos;
- ticket ausente.

Acción:
- mostrar al usuario ambas opciones;
- no fusionar automáticamente.

## 7. Conflictos

Ejemplo:

Registro manual:
- 1.842 kg

CSV posterior:
- 1.824 kg

Mágina Olivo debe mostrar el conflicto y su fuente.

No hacer:
- `UPDATE kilograms=1824` silencioso.

Sí hacer:
- comparar;
- priorizar evidencia más fiable cuando proceda;
- pedir confirmación si modifica un dato relevante ya confirmado;
- conservar auditoría del cambio.

## 8. Política de actualización

Campos de identidad externa:
- pueden sincronizarse automáticamente cuando la API es oficial y estable.

Campos económicos/productivos críticos:
- no sobrescribir silenciosamente una edición confirmada del usuario si la fuente nueva es menos fiable.

Documentos:
- nunca reemplazar un original por otro distinto con el mismo nombre de archivo.

## 9. Adaptadores

Interfaz conceptual:

```text
probe(input) -> reconoce formato/proveedor
parse(input) -> filas fuente
normalize(row) -> objeto staging canónico
validate(normalized) -> errores/warnings
fingerprint(normalized) -> dedup key
```

Futuro:

```text
AMSystemAdapter
ProyalmaAdapter
ToolagroAdapter
GenericCsvAdapter
GenericTicketDocumentAdapter
```

El nombre de estos adapters no implica que exista hoy autorización/API pública de dichos proveedores.

## 10. CSV genérico V1/V1.1

Podemos ofrecer una plantilla propia para evitar depender de proveedores.

Columnas sugeridas:

```text
campaign
fecha_hora
cooperativa
finca
parcela
kilos
ticket
variedad
rendimiento
notas
```

La app debe permitir mapear columnas cuando el usuario carga un CSV diferente.

## 11. Exportación del usuario

La interoperabilidad debe funcionar también hacia fuera.

El agricultor debe poder exportar como mínimo:
- fincas/parcelas;
- campañas;
- entregas;
- resultados;
- labores;
- referencias de documentos.

Formatos iniciales:
- CSV para tablas;
- ZIP/estructura documental cuando proceda;
- resumen PDF puede añadirse como salida de presentación, no como único backup de datos.

## 12. Seguridad

- validar MIME y extensión;
- límites de tamaño;
- almacenamiento privado;
- nombres internos aleatorios;
- no ejecutar macros de XLSX;
- no procesar contenido activo como código;
- antivirus/escaneo cuando la infraestructura lo permita;
- logs sin volcar contenido sensible completo;
- borrado controlado de staging temporal.

## 13. Privacidad

El hecho de que el usuario tenga acceso a un documento de cooperativa no autoriza a Mágina Olivo a reutilizarlo para otros usuarios.

Cada importación pertenece a su explotación y no alimentará datasets compartidos con datos personales/productivos sin una base jurídica y consentimiento adecuados.

## 14. Criterio de éxito

La arquitectura será válida si una misma pantalla de campaña puede mostrar juntas, sin distinguir en la experiencia principal:

- una entrega escrita manualmente;
- una importada desde CSV;
- una creada desde ticket;
- una sincronizada oficialmente;

pero al abrir el detalle siempre se puede saber **de dónde salió el dato y quién lo confirmó**.
