# Operación y licencias de fuentes externas — Mágina Olivo

Fecha de revisión: 2026-09-02

## Objetivo

Convertir las fuentes públicas investigadas en integraciones operables y legalmente trazables, evitando que una API externa pueda romper el núcleo de la aplicación.

## Regla común

Cada fuente externa se implementa detrás de un adapter y guarda:

- proveedor/fuente;
- versión o endpoint relevante;
- momento de consulta;
- licencia/condiciones conocidas;
- atribución requerida;
- estado de la última sincronización;
- error sanitizado;
- fecha de última revisión humana de condiciones.

La ausencia temporal de una fuente no impide registrar entregas, labores ni consultar el histórico propio.

---

## AEMET OpenData

### Uso

- predicción meteorológica;
- temperaturas;
- precipitación;
- viento;
- avisos derivados por reglas propias.

### Situación operativa 2026

AEMET OpenData permite acceso programado mediante API y descarga gratuita de los datos incluidos en su catálogo.

Requiere API Key.

Las FAQs actuales indican:
- API keys con validez de 3 meses;
- posibilidad de generar una nueva antes de caducar;
- límite individual general de 40 consultas/minuto;
- posibles límites adicionales por recurso;
- antiguas claves sin caducidad dejarán de aceptarse el 15/10/2026.

### Diseño

No consultar AEMET por cada apertura de pantalla.

Crear caché backend por localización/área y ventana temporal.

Ejemplo:

`AEMET -> WeatherAdapter -> weather_snapshots -> usuarios`

Una finca próxima a otra puede reutilizar una respuesta cuando el dato y granularidad lo permitan.

### Gestión de clave

- secreto solo en backend;
- registrar `expires_at` operativo fuera de la base de negocio si procede;
- alerta interna 14 días antes de caducar;
- rotación sin cambiar código;
- nunca exponer API key en PWA.

### Atribución

Mantener referencia visible a AEMET en las vistas que presenten sus datos según las condiciones vigentes.

---

## RAIF

### Uso

Capa informativa fitosanitaria local:
- evolución de plagas/enfermedades del olivar;
- contexto provincial/municipal;
- avisos informativos derivados sin convertirlos en prescripción automática.

### Licencia

El dataset RAIF del Portal de Datos Abiertos de la Junta de Andalucía figura con licencia **CC BY 4.0**.

Esto permite reutilización con reconocimiento adecuado.

### Actualización

La página pública indica actualización semanal para olivar, aunque algunos metadatos generales del portal pueden mostrar otras frecuencias. La integración debe registrar la fecha real del fichero ingerido y no asumir que siempre llega el mismo día.

### Diseño de ingesta

No descargar/procesar el histórico completo en cada ejecución.

Pipeline:

`descarga -> checksum -> staging -> parser XML -> normalización -> snapshot/version -> publicación`

Guardar:
- hash del fichero;
- fecha declarada del dataset;
- fecha de descarga;
- parser_version;
- filas aceptadas/rechazadas;
- licencia/atribución.

### UX

Los datos RAIF son contexto de red de seguimiento, no diagnóstico de la parcela privada del usuario.

Mostrar explícitamente algo equivalente a:

`Información de seguimiento RAIF de la zona. No equivale a una observación realizada en tu parcela.`

---

## SIGPAC Andalucía

### Uso

- localizar/identificar parcelas;
- facilitar referencia SIGPAC;
- importar geometría cuando sea apropiado;
- mostrar superficie/recintos como ayuda al alta.

### Condiciones de reutilización verificadas

La Junta publica información SIGPAC para descarga por provincia/municipio y contempla licencia de uso no comercial y comercial.

Para uso comercial se exige, entre otras condiciones:
- reconocimiento visible `©Junta de Andalucía`;
- informar al usuario final de que la cartografía/información geográfica está disponible gratuitamente en el portal de la Consejería;
- respetar las condiciones de transformación y reutilización indicadas en la fuente.

### Consecuencia de producto

Mágina Olivo no debe copiar geometrías y ocultar su procedencia.

Toda vista que utilice cartografía/información SIGPAC debe disponer de atribución conforme a licencia.

### Estrategia V1

1. permitir referencia SIGPAC manual;
2. facilitar búsqueda/selección asistida;
3. importar geometría solo cuando el contrato/licencia y el mecanismo técnico estén cerrados;
4. almacenar `source_year`, porque SIGPAC cambia por campaña/año.

No confundir:
- parcela/finca que el agricultor usa como concepto propio;
- recinto/parcela SIGPAC administrativa.

---

## DOP Sierra Mágina / webs de cooperativas

### Uso

Directorio y enlaces oficiales.

Los datos básicos se guardan con:
- URL fuente;
- fecha de comprobación;
- estado de verificación.

No replicar automáticamente:
- fotografías;
- textos editoriales largos;
- artículos completos;
- contenido privado de socios.

Para noticias/avisos se prioriza:
- título/resumen propio breve;
- enlace a fuente;
- fecha;
- atribución.

---

## Proveedores privados de almazara

AM System/Almazaras.com, Proyalma/Aicor, Toolagro u otros.

No se consideran fuentes públicas de libre extracción.

Integración solo mediante:
- exportación que el propio usuario obtenga legalmente;
- API/acuerdo autorizado;
- fichero proporcionado por cooperativa/proveedor;
- webhook/mecanismo oficial.

Nunca almacenar credenciales de un socio para automatizar navegación privada.

---

## Health checks

Cada adapter externo expone estado interno:

- `healthy`
- `degraded`
- `auth_expiring`
- `rate_limited`
- `schema_changed`
- `unavailable`

Una caída externa no debe producir error 500 en pantallas agrícolas básicas.

## Rate limiting y caché

Usar caché y consolidación para reducir:
- coste;
- dependencia;
- riesgo de bloqueo;
- consumo innecesario.

No lanzar una petición externa por usuario cuando varios usuarios comparten zona/dato público equivalente.

## Cambios de esquema

Todo parser de fichero externo debe tener fixtures de prueba anonimizados/públicos y tests de contrato.

Si cambia el esquema:
- ingesta nueva se detiene;
- la última versión válida sigue disponible si la licencia/semántica lo permite;
- se genera alerta de mantenimiento;
- nunca mapear columnas desconocidas a ciegas.

## Registro de procedencia

Para cualquier dato externo material conservar al menos:

- `source_system`
- `source_url` o identificador lógico
- `source_observed_at`
- `source_published_at` si existe
- `source_version` si existe
- `license_code` cuando aplique
- `attribution_text`

## Revisión periódica

Antes de una V1 comercial:
- revisar de nuevo licencias/condiciones;
- verificar endpoints y límites;
- documentar cambios;
- añadir pruebas de atribución en UI.