# Automatizaciones — Mágina Olivo

## Principio

Una automatización no debe usar IA cuando una regla determinista sea suficiente.

Esto reduce coste, errores y dependencia de proveedores.

## Tipos de automatización

### 1. Automatizaciones por evento

Se ejecutan cuando ocurre algo dentro de la aplicación.

Ejemplos:

- Nueva entrega → recalcular kilos de campaña.
- Rendimiento añadido → recalcular media ponderada.
- Labor creada → actualizar actividad reciente de parcela.
- Documento adjunto → vincularlo al registro correspondiente.
- Tarea completada → cerrar recordatorio relacionado.

### 2. Automatizaciones programadas

Se ejecutan según una frecuencia.

Ejemplos:

- Meteorología: cada cierto número de horas según proveedor y coste.
- Resumen diario: una vez al día.
- Resumen semanal: una vez a la semana.
- Comprobación de tareas vencidas: diaria.
- Comprobación de fuentes públicas: frecuencia prudente según condiciones de uso.

### 3. Automatizaciones condicionadas

Reglas tipo:

```text
SI probabilidad_lluvia >= umbral
Y usuario tiene tarea sensible a lluvia
ENTONCES generar aviso
```

Otros ejemplos:

- Riesgo de helada.
- Temperatura alta.
- Viento superior a umbral.
- Tarea próxima a vencer.
- Entrega sin rendimiento después de X días.
- Campaña sin actividad durante un periodo configurable.

## Motor de automatización

Cada regla debería conservar:

- id
- propietario/ámbito
- tipo
- activa/inactiva
- condición
- acción
- última ejecución
- próxima ejecución si aplica
- resultado
- número de reintentos

Cada ejecución debe generar un registro auditable.

## Notificaciones

Canales posibles por fases:

1. Centro de avisos dentro de la PWA.
2. Notificaciones push web.
3. Correo electrónico opcional.
4. Otros canales solo si existe una necesidad clara.

Evitar spam: consolidar avisos repetidos y permitir preferencias por usuario.

## Meteorología

La meteorología debe asociarse a coordenadas reales de finca/parcela o a una localización seleccionada.

No almacenar indefinidamente todos los datos del proveedor si su licencia no lo permite.

El backend debe normalizar el proveedor a un formato interno para poder cambiarlo posteriormente.

## Cooperativas

La actualización de información pública no debe diseñarse como scraping agresivo.

Antes de automatizar una fuente se documentará:

- URL/fuente.
- Qué datos se recuperan.
- Frecuencia.
- Condiciones de uso.
- Mecanismo de atribución.
- Fecha de última comprobación.

Cuando exista API oficial se priorizará sobre extracción HTML.

## IA dentro de automatizaciones

Casos permitidos:

- Clasificar texto no estructurado.
- Extraer campos de un documento.
- Generar un resumen a petición del usuario.

Casos que no necesitan IA:

- Sumar kilos.
- Calcular rendimiento.
- Detectar una fecha vencida.
- Comparar un valor meteorológico con un umbral.
- Programar un recordatorio.

## Seguridad

Las automatizaciones deben ejecutarse con el mínimo privilegio posible.

Una ejecución asociada al usuario A nunca podrá acceder a los datos privados del usuario B salvo que exista una relación explícita de permisos.

## Fiabilidad

Toda automatización importante debe ser:

- idempotente cuando sea posible;
- reintentable;
- observable;
- segura ante ejecuciones duplicadas;
- capaz de registrar fallo sin bloquear la aplicación principal.
