# Mapa funcional de pantallas V1 — Mágina Olivo

Fecha: 2026-09-02

## Objetivo de UX

Mágina Olivo se diseña móvil primero. Las acciones frecuentes deben poder completarse con una mano, pocos campos y sin navegar por un ERP.

Principio:

> Consultar debe ser inmediato. Registrar debe ser corto. Corregir debe ser posible. El dato original debe conservar trazabilidad.

## Navegación principal móvil

Propuesta de barra inferior con cinco destinos:

1. **Inicio**
2. **Campo**
3. **Campaña**
4. **Cooperativas**
5. **Más**

Botón flotante/contextual `+` para acción rápida.

El objetivo es evitar una barra con 9-10 iconos.

### Menú `Más`

- Labores
- Documentos
- Avisos
- Meteorología
- RAIF
- Importar datos
- Ajustes / Perfil

## 1. Onboarding

### Pantalla 1 — Bienvenida

Mensaje corto:

`Tu olivar y tu campaña, en un mismo sitio.`

Acciones:
- Crear cuenta
- Iniciar sesión

### Pantalla 2 — Crear explotación

Campos mínimos:
- Nombre de la explotación
- Municipio
- Provincia (preseleccionable: Jaén)

No exigir CIF, REAFA ni otros datos administrativos en el primer acceso.

### Pantalla 3 — Añadir primera finca

Opciones:
- Añadir manualmente
- Buscar/ubicar en mapa
- Importar SIGPAC (cuando esté disponible)
- Omitir por ahora

### Pantalla 4 — Seleccionar cooperativa habitual

Buscador sobre directorio Sierra Mágina.

Opciones:
- seleccionar una o varias;
- `Otra almazara/cooperativa`;
- `Lo haré después`.

La cooperativa no es obligatoria para crear la explotación.

### Pantalla 5 — Campaña actual

Sugerir campaña según fecha, pero permitir cambiarla.

Ejemplo:
- `Campaña 2026/27`

## 2. Inicio / Dashboard

Debe responder en menos de 10 segundos a:

- ¿Cómo va mi campaña?
- ¿Hay algo que deba mirar hoy?
- ¿Qué hago ahora?

### Cabecera

- saludo/nombre opcional;
- campaña activa;
- selector de explotación si existe más de una.

### Tarjeta campaña

- kilos entregados;
- número de entregas;
- rendimiento medio ponderado;
- última entrega;
- variación frente a campaña anterior cuando haya histórico.

### Tiempo

- situación actual;
- lluvia próxima;
- helada/viento solo si es relevante;
- acceso a previsión ampliada.

### Avisos

Máximo 3 prioritarios:
- tarea vencida;
- entrega pendiente de rendimiento;
- alerta meteorológica;
- aviso público importante de cooperativa;
- alerta RAIF relevante.

### Actividad reciente

- última labor;
- última entrega;
- documento añadido.

### Acciones rápidas

Botones grandes:
- `+ Entrega`
- `+ Labor`
- `+ Foto/Documento`
- `+ Tarea`

Durante campaña de recolección, `+ Entrega` debe ocupar la posición principal.

## 3. Campo

### Vista principal

Tarjetas de fincas con:
- nombre;
- superficie;
- número de parcelas;
- última actividad;
- campaña activa;
- pequeño mapa/miniatura opcional.

### Finca

Resumen:
- superficie;
- parcelas;
- kilos campaña;
- labores recientes;
- documentos;
- notas.

Acciones:
- añadir parcela;
- registrar labor para toda la finca;
- registrar entrega sin repartir por parcela;
- ver mapa.

### Parcela

Cabecera:
- nombre;
- superficie;
- SIGPAC;
- secano/regadío;
- variedades;
- nº olivos opcional.

Pestañas o segmentos:
- Resumen
- Labores
- Campañas
- Documentos

Resumen:
- mapa;
- última labor;
- kilos asociados en campaña;
- histórico básico;
- notas/fotos.

## 4. Flujo `+ Entrega`

Esta es una de las acciones más importantes de toda la aplicación.

### Objetivo

Registro manual normal en menos de 20-30 segundos.

### Paso único preferido

Formulario compacto:

- Fecha/hora: ahora por defecto
- Cooperativa: última usada por defecto
- Kilos: campo principal grande
- Origen: finca/parcela opcional
- Nº ticket: opcional
- Rendimiento: opcional, normalmente se añade después
- Adjuntar foto/ticket: opcional
- Nota: opcional

Botón:
- `Guardar entrega`

### Después de guardar

Mostrar:

`Entrega guardada · 1.842 kg`

Y:
- `Añadir otra`
- `Añadir rendimiento`
- `Ver campaña`

### Reglas

- no obligar a elegir parcela si la carga mezcla varias;
- no obligar a rendimiento;
- recordar última cooperativa;
- detectar posible duplicado;
- permitir editar;
- conservar origen de importación si no es manual.

## 5. Añadir rendimiento

### Entrada desde una entrega

- rendimiento industrial / graso: porcentaje;
- fecha de resultado opcional;
- documento/foto opcional;
- observación opcional.

### Entrada masiva

Vista `Pendientes de rendimiento`:

| Fecha | Kg | Cooperativa | Rendimiento |
|---|---:|---|---|

Entrada rápida de porcentajes para varias entregas.

### Dashboard de rendimientos

- media ponderada de campaña;
- máximo/mínimo;
- evolución temporal;
- por finca/parcela;
- por cooperativa;
- comparación de campañas.

No presentar correlación como causalidad.

## 6. Campaña

### Vista de campaña

Cabecera:
- `2026/27`
- estado: preparada / activa / cerrada

KPIs:
- kilos totales;
- entregas;
- rendimiento ponderado;
- número de días de entrega;
- cooperativas utilizadas.

Bloques:
- entregas recientes;
- rendimiento;
- origen por fincas/parcelas;
- documentos;
- costes básicos si se activan;
- comparación histórica.

### Lista de entregas

Filtros:
- fecha;
- cooperativa;
- finca/parcela;
- con/sin rendimiento;
- manual/importada.

### Cierre de campaña

No bloquear edición de forma irreversible.

Acciones:
- marcar como cerrada;
- generar/exportar resumen;
- comparar con anterior.

## 7. Labores

### Lista / timeline

Orden cronológico con iconos sencillos:
- tratamiento;
- abonado;
- poda;
- desbroce;
- laboreo;
- riego;
- recolección;
- mantenimiento;
- otra.

### `+ Labor`

Campos iniciales:
- tipo;
- finca/parcela;
- fecha;
- descripción corta.

Campos opcionales desplegables:
- producto/material;
- cantidad/unidad;
- coste;
- foto/documento;
- notas;
- recordatorio posterior.

No convertir en la primera versión el formulario en un CUE completo obligatorio.

## 8. Cooperativas

## Directorio

Buscador y filtros por:
- municipio;
- tipo;
- DOP;
- cooperativas seleccionadas por el usuario.

Tarjeta:
- nombre;
- municipio;
- teléfono;
- web;
- estado de información (`verificada hace X`);
- icono si existe acceso de socio público conocido.

### Ficha cooperativa

Secciones:

#### Información
- datos básicos;
- dirección;
- contacto;
- horarios verificados;
- web oficial;
- marcas;
- servicios conocidos.

#### Mi campaña aquí
Solo datos privados del usuario:
- kilos entregados;
- rendimiento medio;
- entregas;
- documentos relacionados.

#### Avisos
Solo información pública reutilizable/enlazable con fuente y fecha.

#### Acceso oficial
Si existe portal/app de socio:
- botón `Abrir acceso oficial`;
- proveedor conocido si está verificado;
- nunca guardar contraseña en Mágina Olivo para automatizar navegación.

#### Importar
- subir ticket/PDF;
- CSV/XLSX cuando exista parser;
- integración oficial futura si existe.

### Mensaje clave de UX

Mágina Olivo no debe dar a entender que representa a la cooperativa.

Ejemplo:

`Información recopilada de fuentes públicas. Para trámites oficiales, utiliza los canales de la cooperativa.`

## 9. Importar datos

Pantalla propia dentro de `Más` y accesible desde una cooperativa.

### Opciones

- Foto de ticket
- PDF / albarán
- CSV / Excel
- Importación desde proveedor conectado (futuro)

### Flujo seguro

1. seleccionar archivo;
2. identificar formato;
3. vista previa;
4. marcar duplicados;
5. mostrar campos no reconocidos;
6. usuario confirma;
7. crear registros con `source=import`;
8. conservar archivo original cuando corresponda.

Nunca importar silenciosamente datos dudosos.

## 10. Documentos

### Biblioteca

Filtros:
- campaña;
- tipo;
- cooperativa;
- finca/parcela;
- fecha.

Tipos iniciales:
- ticket;
- albarán;
- liquidación;
- factura;
- análisis/rendimiento;
- tratamiento/labor;
- otros.

Cada documento puede mostrar relaciones:

`Este documento está vinculado a: Entrega 12/11/2026 · Cooperativa X`

## 11. Avisos

Centro unificado.

Categorías:
- Tiempo
- Campo
- Campaña
- Cooperativa
- RAIF
- Sistema

Prioridad:
- informativo;
- importante;
- urgente.

El usuario puede silenciar tipos de aviso.

## 12. Meteorología

Vista simple, no una app meteorológica completa.

- hoy;
- próximos días;
- lluvia;
- temperatura mínima/máxima;
- viento;
- alertas configuradas.

Ubicación:
- por finca/parcela cuando haya coordenadas;
- localidad como fallback.

## 13. RAIF

### Objetivo

Mostrar información oficial de situación fitosanitaria relevante para el olivar del área del usuario.

No emitir diagnósticos automáticos personalizados como si fueran asesoramiento técnico.

Vista:
- avisos recientes;
- organismo/plaga/enfermedad;
- zona;
- fecha;
- fuente oficial;
- enlace a detalle.

## 14. Perfil y ajustes

- datos personales básicos;
- explotación activa;
- cooperativas favoritas;
- campaña activa;
- preferencias de avisos;
- unidades;
- exportar mis datos;
- privacidad;
- cerrar sesión;
- eliminar cuenta/proceso de baja.

## 15. Mágina IA — no bloquear V1

Cuando se incorpore, puede aparecer como:

- botón de micrófono/texto en `+ Labor`;
- `Leer ticket` en importación;
- caja `Preguntar sobre mi campaña`.

No necesita ocupar una pestaña principal.

## 16. Flujo de oro para el piloto

El piloto debe validar este recorrido completo:

1. crear cuenta;
2. crear explotación;
3. crear finca/parcela;
4. registrar una labor;
5. registrar entrega de aceituna;
6. fotografiar ticket;
7. añadir rendimiento días después;
8. consultar media de campaña;
9. abrir ficha de cooperativa;
10. recibir aviso meteorológico;
11. consultar aviso RAIF;
12. exportar resumen de campaña.

Si este flujo funciona de forma clara en móvil, la base del producto está validada.

## 17. Métricas UX para piloto

Medir:
- tiempo para registrar una entrega;
- tiempo para registrar una labor;
- porcentaje de entregas con origen de parcela/finca;
- porcentaje de rendimientos añadidos después;
- errores/duplicados;
- número de accesos al dashboard durante campaña;
- avisos abiertos/silenciados;
- importaciones corregidas por el usuario;
- abandono del onboarding.

Objetivo inicial sugerido:
- entrega manual normal < 30 s;
- labor simple < 45 s;
- dashboard útil sin más de 1 desplazamiento largo en móvil.
