# CUE / SIEX / REAFA — investigación estratégica

Fecha de revisión: 2026-09-02

## Conclusión ejecutiva

Mágina Olivo no debe intentar certificarse ni presentarse como CUE comercial en la V1. Sin embargo, el modelo de datos debe diseñarse desde ahora para no bloquear una integración futura.

## Situación en Andalucía

El Cuaderno Digital de Explotación Agrícola (CUE) forma parte de la arquitectura SIEX y necesita que la explotación esté previamente inscrita en REAFA.

La Junta de Andalucía ofrece:

- CUE digital público mediante Sga Cex;
- posibilidad de utilizar CUE comerciales;
- mecanismos de descarga de datos de explotaciones para CUE comerciales;
- comunicación de CUE comerciales con REAFA mediante el Interfaz Único Común (IUWS);
- habilitación para entidades que actúan por cuenta de titulares.

La página oficial de Andalucía, revisada el 02/09/2026, indica que:

- desde 1/01/2026 existen obligaciones de anotación de fertilización para explotaciones afectadas, con excepciones;
- a partir del 1/09/2026 entra en vigor con carácter general la obligación de elaborar y aplicar plan de abonado en las unidades sujetas a ella, con excepciones;
- la llevanza del CUE digital será obligatoria desde 1/01/2027 para consignar tratamientos fitosanitarios;
- para el resto del cuaderno digital, la obligatoriedad general se vincula al inicio del próximo marco PAC salvo normativa sectorial específica.

La normativa puede volver a cambiar, por lo que estas fechas no deben codificarse sin versionado normativo.

## Qué significa para Mágina Olivo

### V1

Mágina Olivo será un cuaderno personal/operativo del agricultor, no un CUE oficial certificado.

Debe permitir registrar de forma cómoda:

- parcelas;
- labores;
- tratamientos;
- productos;
- dosis;
- fertilización;
- riego;
- cosecha;
- entregas;
- costes;
- documentos;
- notas y fotografías.

Cuando una operación tenga relevancia normativa, la interfaz puede pedir campos estructurados adicionales sin afirmar que el registro sustituye el CUE oficial.

### V2

Añadir exportaciones estructuradas y validaciones que acerquen el dato al esquema exigido por CUE, después de estudiar especificaciones vigentes.

### V3 potencial

Evaluar el alta de Mágina Olivo como CUE comercial en Andalucía.

Esto implicaría, entre otros trabajos:

- alta del software comercial;
- certificados digitales;
- cumplimiento de la interfaz IUWS vigente;
- gestión segura de autorizaciones/habilitaciones;
- sincronización con datos de REAFA;
- trazabilidad y auditoría fuertes;
- actualización continua ante cambios normativos.

## Ventaja estratégica

No convertir la V1 en CUE evita que el proyecto nazca condicionado por burocracia e integraciones administrativas.

Pero preparar bien el modelo desde el principio puede permitir que Mágina Olivo evolucione de:

`diario inteligente del olivarero`

hacia:

`herramienta operativa + cuaderno digital interoperable`

sin migraciones traumáticas.

## Campos que conviene prever desde la V1

En operaciones de tratamiento/fertilización:

- fecha/hora;
- explotación/parcela/recinto;
- superficie afectada;
- tipo de operación;
- producto;
- identificación oficial del producto cuando proceda;
- cantidad/dosis;
- unidad;
- motivo/observación;
- aplicador/responsable cuando proceda;
- maquinaria/equipo cuando proceda;
- fuente del dato;
- estado de validación;
- adjuntos.

No todos estos campos deben ser obligatorios en la UX básica.

## Regla UX

La aplicación debe ser más sencilla que un formulario administrativo.

El usuario registra una labor una sola vez. Internamente, Mágina Olivo estructura los datos para reutilizarlos en estadísticas, costes, historial y, en el futuro, exportaciones administrativas.

## Fuente principal

Junta de Andalucía — Cuaderno de explotación:
https://www.juntadeandalucia.es/organismos/agriculturapescaaguaydesarrollorural/areas/agricultura/cuaderno-explotacion.html

Junta de Andalucía — REAFA:
https://www.juntadeandalucia.es/organismos/agriculturapescaaguaydesarrollorural/areas/agricultura/produccion-agricola/paginas/reafa.html

## Riesgo

Normativa, formatos, plazos e interfaces son variables externas. Toda funcionalidad relacionada con CUE/SIEX debe estar versionada y cubierta por un adapter específico; nunca incrustada directamente en el dominio principal.
