# Mágina Olivo — Contratos de pantalla Mi Campo V4.1

Fecha: 2026-09-08  
Estado: especificación de pantallas para implementación  
Visual: `docs/design/MI_CAMPO_UI_V4_1_CAMPO_CLARO.md`  
Funcional: `docs/design/MI_CAMPO_UX_V4.md`

> Este documento define qué contiene cada pantalla, qué acción primaria tiene, cómo recibe contexto y qué no debe duplicar.

---

## 1. Shell privado común

Barra inferior única:

```text
Inicio | Mi Campo | + | Campaña | Más
```

Reglas:

- persistente salvo formularios/modalidades que necesiten foco completo;
- `+` abre Centro de acciones;
- mantener safe-area Android/iOS;
- back del sistema vuelve al nivel anterior real;
- no introducir tabs globales adicionales.

Cabecera compacta opcional:

```text
Mágina Olivo
Contexto actual / explotación
estado offline si aplica
```

No repetir un hero fotográfico global en todos los módulos.

---

## 2. Pantalla `Mi Campo`

### Propósito

Responder:

> `¿Cómo está organizado mi campo y dónde quiero entrar?`

### Orden

```text
Mi Campo
Resumen: N fincas · N parcelas · X ha

Fincas y parcelas
Mapa y lindes

Cuaderno      Tareas
Riegos        Tratamientos
Jornales y maquinaria

Campaña actual
```

### Acción primaria

No necesita un botón de alta gigante si ya existe el Centro `+`.

El bloque `Fincas y parcelas` puede incluir `Gestionar` / `Añadir parcela` como acción contextual secundaria.

### Regla

Mi Campo es índice operativo, no timeline completo ni formulario.

---

## 3. `Fincas y parcelas`

### Cabecera

```text
Fincas y parcelas
Organiza tu explotación
```

### Resumen

```text
N fincas · N parcelas · superficie total
```

### Buscador

Busca por:

- nombre de finca;
- nombre de parcela;
- municipio.

### Contenido

Agrupar por finca.

```text
Finca Cortijo del Río
2 parcelas · 5,58 ha

Parcela Norte
3,42 ha · estado · Catastro vinculado · fotos

Las Erillas
2,16 ha · estado · Catastro vinculado · fotos
```

### Interacción

- tocar finca -> `Resumen de finca`;
- tocar parcela -> `Resumen de parcela`;
- expand/collapse finca permitido;
- no obligar a expandir si hay deep-link directo.

### Acción

`+ Añadir parcelas` secundaria/contextual y `+ -> Finca/parcela` global deben converger en el mismo flujo.

---

## 4. `Resumen de finca`

### Familia visual

Identidad / territorio.

### Cabecera

Foto cover + nombre + municipio.

```text
Cortijo del Río
Bedmar · Jaén
5,58 ha · 2 parcelas
```

### Resumen KPI

Máximo 4:

- superficie;
- parcelas;
- olivos aproximados;
- campaña actual.

### Bloques

1. Parcelas (máx. 3–5 visibles);
2. Actividad reciente (máx. 3);
3. Estado general / alertas relevantes;
4. Campaña actual;
5. documentos/fotos secundarios.

### CTA

`Registrar trabajo`

### Contexto

Al registrar desde finca:

```text
Cortijo del Río
¿Dónde se realizó?
Toda la finca | Elegir parcelas
```

### No hacer

- no mostrar todos los formularios;
- no mostrar Catastro técnico aquí;
- no convertir campaña en un dashboard completo.

---

## 5. `Resumen de parcela`

### Familia visual

Identidad / territorio.

### Cabecera

Foto cover + nombre + finca + municipio + estado.

### Acciones superiores

```text
Ver mapa
Vincular con Catastro / Catastro vinculado
```

### KPIs

Máximo 4:

- superficie;
- olivos;
- variedad;
- riego.

### Riego

Si existe:

```text
Tipo
Comunidad/red
Sector
Días habituales
Avisos activados/desactivados
```

Si no existe:

```text
Sin configuración de riego
[Configurar]
```

### Atención

Una tarjeta única `Mágina recomienda` / `Necesita atención` cuando exista dato relevante.

### Navegación secundaria

```text
Actividad | Cosecha | Datos | Documentos
```

### CTA

`Registrar`

Abre Centro de acciones con `farmId` + `plotId` preseleccionados.

---

## 6. `Mapa y lindes`

### Familia visual

Territorio / GIS.

### Cabecera

Búsqueda universal:

```text
municipio / polígono / parcela / referencia catastral
```

Entradas rápidas:

```text
Mapa | Mi ubicación | Ref. catastral | Polígono/parcela
```

### Mapa

Capas:

- ortofoto/base;
- mis parcelas;
- Catastro;
- SIGPAC.

### Bottom sheet

Cuando hay selección:

```text
Nombre parcela
RC
Superficie Catastro
Municipio
Polígono/parcela

[Confirmar / Esta es la parcela que gestiono]
[Ver ficha]
```

### Regla crítica

La UI selecciona; servidor verifica antes de persistir.

### GPS

- pedir permiso bajo acción explícita;
- mostrar precisión;
- permitir fallback manual;
- no guardar trayectoria personal.

---

## 7. `Centro de acciones (+)`

### Familia visual

Gestión / productividad.

### Presentación

Pantalla o sheet casi completa, sin foto decorativa.

Cabecera:

```text
¿Qué quieres añadir?
Añade algo a tu campo.
```

### Acciones V1

```text
Trabajo
Tarea
Riego
Tratamiento
Jornal
Maquinaria
Entrega
Observación
Documento
Finca/parcela
```

### Contexto

Zona inferior fija si se conoce:

```text
Contexto actual
Cortijo del Río · Parcela Norte
[Cambiar]
```

### Reglas

- cada tile abre un formulario específico;
- no crear un único megaformulario;
- si el contexto ya es válido, no preguntar de nuevo;
- `Finca/parcela` abre el flujo de alta/organización, no un formulario de trabajo.

---

## 8. `Tareas`

### Familia visual

Gestión.

### Resumen

```text
N pendientes · N para hoy
```

### CTA

`Nueva tarea`

### Secciones

```text
Hoy
Próximas
Completadas recientemente
```

Máximo 3–5 filas por sección antes de `Ver todas`.

### Filtros históricos

- todas;
- pendientes;
- completadas;
- finca;
- parcela;
- prioridad.

### Nueva tarea

Campos mínimos:

```text
Dónde
Qué hay que hacer
Fecha
Hora opcional
Prioridad opcional
Aviso opcional
Notas opcionales
```

Debe admitir finca completa o parcela.

---

## 9. `Riegos`

### Familia visual

Gestión.

### Resumen

Si hay configuración/contexto seleccionado:

```text
Red/comunidad · Sector
Próximo aviso/riego si existe
Notificaciones on/off
```

### CTA

`Registrar riego`

### Filtros/contexto

Finca y parcela seleccionables.

### Últimos registros

Cada fila:

```text
fecha/hora
finca/parcela
duración
volumen si existe
sector
```

### Configuración de riego

No debe dominar la pantalla.

Bloque secundario:

```text
Tipo
Comunidad/red
Sector
Días habituales
Recibir avisos
[Editar]
```

### Modelo de datos esperado

Por parcela, permitir:

```text
irrigation_enabled
irrigation_type
irrigation_network_name
irrigation_sector
irrigation_usual_days[]
irrigation_notifications_enabled
```

Nombres definitivos deben adaptarse al esquema existente y migraciones, no copiarse sin inspección.

### Avisos externos

Los avisos de administración deben resolver destinatarios por red/comunidad + sector y respetar preferencias de notificación.

---

## 10. `Tratamientos`

### Resumen

```text
Último tratamiento
N esta campaña
pendientes/documentación si procede
```

### CTA

`Registrar tratamiento`

### Últimos registros

- fecha;
- finca/parcela;
- producto/descripcion breve;
- estado/documento si procede.

### Formulario

Primer nivel:

```text
Dónde
Fecha/hora
Producto o descripción
```

`Más detalles`:

- cantidad/unidad;
- dosis;
- superficie;
- coste;
- foto/documento;
- notas;
- campos regulatorios futuros cuando estén soportados.

No inferir autorización del producto sin fuente normativa.

---

## 11. `Jornales y maquinaria`

### Resumen

```text
jornales del periodo
horas
coste registrado
```

### CTAs

Primario: `Añadir jornal`

Secundario: `Registrar maquinaria`

### Últimos registros

Mezclar en una lista tipada o separar por tabs según volumen real, pero no duplicar información.

Jornal:

```text
persona/cuadrilla
horas/jornales
trabajo
finca/parcela
fecha
coste opcional
```

Maquinaria:

```text
equipo
horas/uso
trabajo
finca/parcela
fecha
coste opcional
```

### Equipos

Mostrar recientes con QR solo si QR ya existe en producto o está en la fase autorizada.

No bloquear V4.1 por QR.

---

## 12. `Cuaderno`

### Propósito

Ser la **historia unificada**, no otro lugar para duplicar altas.

### Timeline

Puede integrar:

- trabajos;
- tratamientos;
- riegos;
- observaciones;
- jornales relacionados;
- tareas completadas;
- entregas cuando corresponda.

### Filtros

```text
Todas | Trabajos | Riegos | Tratamientos | Observaciones | Otros
```

### CTA

Puede usar `+ Añadir` que abre el Centro de acciones; no crear formulario propio de cuaderno.

---

## 13. `Campaña`

Se conserva como destino global de navegación.

Resumen:

- kilos;
- entregas;
- rendimiento ponderado;
- pendientes de rendimiento;
- origen finca/parcela;
- documentos;
- histórico.

Mi Campo solo muestra un resumen y deep-link.

---

## 14. `Datos de parcela`

Debe contener:

### Identidad

- nombre;
- finca;
- municipio;
- foto principal.

### Agronómicos

- variedad;
- riego;
- nº olivos aproximado;
- superficie de trabajo.

### Riego

- tipo;
- red/comunidad;
- sector;
- días habituales;
- avisos.

### Cartografía

- referencia catastral;
- fuente de geometría;
- fecha de verificación;
- SIGPAC asociado;
- comparación de superficies cuando proceda.

No presentar Catastro como prueba de propiedad.

---

## 15. `Documentos de finca/parcela`

Tipos visibles:

- foto;
- análisis;
- ticket;
- informe;
- tratamiento;
- otros.

Acciones:

```text
Hacer foto
Elegir galería
Adjuntar archivo
```

Usar almacenamiento privado actual.

No fingir subida offline si no existe cola de archivos segura.

---

## 16. `Admin > Alertas de riego`

### Propósito

Crear avisos dirigidos a usuarios cuyas parcelas coinciden con una red/comunidad y sector.

### Formulario

```text
Comunidad/red
Sector
Fecha
Hora
Mensaje
```

### Destinatarios

Antes de enviar mostrar:

```text
N usuarios
N parcelas coincidentes
criterio: red X + sector Y
```

Permitir inspección de destinatarios según permisos/admin y privacidad.

### Vista previa

Mostrar preview push antes de enviar.

### Envío

Requiere confirmación explícita.

Registrar auditoría:

- admin;
- fecha/hora;
- criterio;
- cantidad de destinatarios;
- contenido;
- estado de entrega agregado.

### Regla

No enviar a quien tenga avisos de riego desactivados, salvo un futuro tipo de alerta administrativa obligatoria definido expresamente.

---

## 17. Formularios — patrón universal

Toda alta debe seguir:

```text
Título
Contexto
Campos imprescindibles
[Más detalles]
CTA Guardar
```

Al guardar:

```text
✓ Entidad guardada
contexto
siguiente acción opcional
```

No colocar `Cancelar` con mismo peso que `Guardar`.

---

## 18. Estados obligatorios por pantalla

Cada contrato debe contemplar:

- loading;
- vacío;
- error;
- offline;
- sin permisos;
- dato antiguo;
- fuente externa caída cuando aplique;
- sincronización pendiente.

---

## 19. Deep links/contexto

Rutas exactas se adaptan al router existente, pero conceptualmente soportar:

```text
Mi Campo -> Finca
Mi Campo -> Parcela
Mapa -> Parcela
Tarea -> Parcela
Aviso riego -> Parcela/Riegos
Centro + -> formulario con contexto
Campaña -> entrega
```

No perder contexto al navegar atrás.

---

## 20. Definición de terminado de pantalla

Una pantalla no está terminada solo por parecerse a un mockup.

Debe tener:

- estado real conectado;
- acción real;
- loading/error/empty/offline;
- accesibilidad;
- navegación atrás;
- responsive;
- pruebas del flujo principal;
- sin duplicar API/modelo existente.
