# Modelo de datos inicial — Mágina Olivo

> Documento de diseño. No equivale todavía al esquema definitivo de base de datos.

## Entidades principales

### users

- id
- email
- name
- locale
- timezone
- created_at
- updated_at

### holdings / explotaciones

- id
- owner_user_id
- name
- description
- municipality
- province
- active
- created_at
- updated_at

Diseñar desde el inicio pensando en que una explotación pueda tener varios miembros en una fase posterior.

### farms / fincas

- id
- holding_id
- name
- description
- area_ha
- latitude
- longitude
- active
- created_at
- updated_at

### plots / parcelas

- id
- farm_id
- name
- area_ha
- sigpac_reference
- latitude
- longitude
- irrigation_type
- olive_tree_count
- notes
- active
- created_at
- updated_at

### plot_varieties

Relación entre parcela y variedad.

- id
- plot_id
- variety_name
- percentage_or_count opcional

### campaigns

- id
- holding_id
- name
- season_start_year
- season_end_year
- start_date
- end_date
- status
- notes
- created_at
- updated_at

### cooperatives

Información de directorio, separada de los datos privados del usuario.

- id
- official_name
- municipality
- province
- address
- phone
- website_url
- public_description
- source_url
- source_checked_at
- verification_status
- created_at
- updated_at

### deliveries / entregas

- id
- campaign_id
- plot_id opcional
- farm_id opcional
- cooperative_id opcional
- custom_destination opcional
- delivered_at
- kilograms
- variety opcional
- ticket_number opcional
- yield_percentage opcional
- notes
- created_by
- created_at
- updated_at

Una entrega puede vincularse a una parcela concreta o, cuando el usuario no pueda separarla, solo a una finca/campaña.

### activities / labores

- id
- campaign_id opcional
- plot_id
- activity_type
- performed_at
- description
- product_or_material opcional
- quantity opcional
- unit opcional
- cost_amount opcional
- notes
- created_by
- created_at
- updated_at

### tasks

- id
- holding_id
- plot_id opcional
- title
- description
- due_at
- status
- priority
- created_by
- created_at
- updated_at

### documents

El archivo físico/objeto debe permanecer en almacenamiento privado.

- id
- owner_scope
- storage_key
- original_filename
- mime_type
- size_bytes
- document_type
- uploaded_by
- created_at

### document_links

Permite relacionar un documento con una entrega, labor, finca, parcela o campaña sin duplicar el archivo.

- id
- document_id
- entity_type
- entity_id

### notifications

- id
- user_id
- type
- title
- body
- read_at
- related_entity_type opcional
- related_entity_id opcional
- created_at

### automation_rules

- id
- owner_scope
- type
- enabled
- configuration
- created_at
- updated_at

### automation_runs

- id
- rule_id
- started_at
- finished_at
- status
- retry_count
- error_code opcional
- metadata limitada

## Datos derivados

Evitar usar campos agregados como única fuente de verdad.

Ejemplos:

- kilos totales de campaña = suma de entregas válidas.
- rendimiento medio = cálculo definido sobre entregas con rendimiento.
- gasto total = suma de costes incluidos según criterio documentado.

Se podrán mantener agregados/cache para rendimiento, pero siempre deben poder reconstruirse desde los registros base.

## Rendimiento medio

Antes de implementar hay que decidir y documentar claramente si la vista principal muestra:

1. media aritmética simple de porcentajes; o
2. media ponderada por kilos.

Para producción de aceite normalmente será más informativo permitir una **media ponderada por kilos**, evitando que una entrega pequeña pese igual que una grande.

## Borrado y archivo

Los registros importantes deberían admitir archivado lógico cuando sea necesario mantener trazabilidad.

Las operaciones de borrado definitivo de documentos o datos personales deberán tratarse por separado.

## Multiusuario futuro

Preparar una extensión con:

- holding_members
- roles: owner / admin / collaborator / viewer

Toda consulta privada deberá comprobar membresía y permisos en backend.
