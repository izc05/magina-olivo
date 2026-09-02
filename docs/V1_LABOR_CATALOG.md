# Catálogo de labores V1 — Mágina Olivo

Fecha: 2026-09-02
Estado: propuesta para piloto

## Objetivo

Registrar el trabajo real del olivar con la mínima fricción posible.

La V1 no pretende sustituir de inicio un Cuaderno Digital de Explotación oficial completo. El modelo debe poder evolucionar, pero el agricultor debe poder guardar una labor simple en menos de 45 segundos.

## Regla UX

Campos siempre visibles:
- tipo de labor;
- finca/parcela;
- fecha;
- descripción corta.

Campos adicionales aparecen según el tipo de labor o al desplegar `Más detalles`.

## Tipos principales

### 1. Tratamiento fitosanitario

Icono conceptual: pulverizador/gota

Campos V1:
- finca/parcela;
- fecha/hora;
- producto/comercial o nota libre;
- cantidad opcional;
- unidad opcional;
- volumen de caldo opcional;
- coste opcional;
- observaciones;
- foto/documento;
- recordatorio.

Preparado para futuro CUE:
- nº registro producto;
- materia activa;
- dosis;
- superficie tratada;
- plaga/enfermedad objetivo;
- aplicador;
- equipo;
- justificación/asesoramiento;
- condiciones meteorológicas;
- plazo de seguridad;
- campos exigibles según normativa vigente.

La V1 no debe inferir automáticamente que un producto está autorizado para una parcela/cultivo sin consultar una fuente normativa adecuada.

### 2. Abonado / fertilización

Campos:
- producto/material;
- cantidad;
- unidad;
- superficie opcional;
- método opcional;
- coste;
- notas;
- documento/foto.

Subtipos opcionales:
- mineral;
- orgánico;
- foliar;
- fertirrigación;
- otro.

### 3. Poda

Campos:
- tipo opcional: formación / producción / renovación / limpieza / otro;
- finca/parcela;
- fecha;
- superficie o nº olivos opcional;
- coste;
- restos: triturados / retirados / otro opcional;
- notas/fotos.

### 4. Desbroce / control de cubierta

Campos:
- método: desbroce mecánico / siega / pastoreo / manual / otro;
- fecha;
- finca/parcela;
- superficie opcional;
- coste;
- notas.

### 5. Laboreo del suelo

Campos:
- tipo/equipo opcional;
- fecha;
- finca/parcela;
- superficie;
- coste;
- notas.

### 6. Riego

Campos:
- fecha;
- finca/parcela;
- duración opcional;
- volumen opcional;
- unidad;
- coste opcional;
- incidencia/nota.

Futuro:
- sector de riego;
- contador;
- lectura inicial/final;
- integración con sensores/telemetría si aporta valor.

### 7. Recolección

Diferenciar `labor de recolección` de `entrega en almazara`.

Campos:
- fecha;
- finca/parcela;
- método: vibrador / paraguas / manual / otro;
- nº personas opcional;
- horas/jornales opcional;
- coste;
- kilos estimados opcional;
- notas.

Los kilos oficiales de campaña proceden de `deliveries`; el kilo estimado de una labor no debe sumarse automáticamente como entrega.

### 8. Mantenimiento / infraestructura

Para:
- riego;
- vallado;
- caminos;
- maquinaria ligera asociada;
- caseta/instalaciones;
- reparaciones de parcela.

Campos:
- categoría;
- descripción;
- fecha;
- finca/parcela;
- coste;
- fotos;
- documento.

### 9. Plantación / reposición

Campos:
- fecha;
- finca/parcela;
- nº olivos;
- variedad;
- marco opcional;
- coste;
- notas.

Puede actualizar opcionalmente el nº estimado de olivos de parcela mediante confirmación, nunca de forma silenciosa.

### 10. Análisis / muestreo

Para:
- suelo;
- hoja;
- agua;
- aceituna;
- otro.

Campos:
- fecha de muestra;
- tipo;
- finca/parcela;
- laboratorio opcional;
- documento;
- observaciones.

Los resultados analíticos estructurados pueden añadirse en una fase posterior si el piloto lo demanda.

### 11. Visita / observación de campo

Muy útil para diario sin forzar una labor productiva.

Campos:
- fecha;
- finca/parcela;
- observación;
- fotos;
- etiquetas opcionales.

Ejemplos:
- floración;
- estado de fruto;
- daño por viento;
- presencia observada de plaga;
- humedad/estado del suelo.

No convertir una observación visual del usuario en diagnóstico automático.

### 12. Otra

Fallback necesario para no bloquear al usuario.

Campos:
- título;
- descripción;
- fecha;
- finca/parcela;
- coste opcional;
- documentos/fotos.

## Campos comunes de coste

En V1:
- `cost_amount` total opcional;
- nota opcional.

No construir todavía contabilidad avanzada por:
- mano de obra;
- combustible;
- amortización;
- maquinaria;
- producto;

salvo que las entrevistas indiquen que es imprescindible.

Futuro:
- `activity_cost_items` desglosados.

## Repetición / aplicación múltiple

Una labor puede afectar a:
- una parcela;
- varias parcelas;
- finca completa.

Para V1 evitar duplicar manualmente 8 labores idénticas.

Propuesta:
- el usuario selecciona múltiples parcelas;
- backend crea una operación agrupada con relaciones a parcelas o registros hijos según el esquema final.

Debe ser posible saber qué parcelas fueron realmente tratadas.

## Plantillas rápidas

Después de usar una labor varias veces, permitir `Repetir`:

Ejemplo:
`Repetir abonado de Parcela Norte`

Se copian:
- tipo;
- producto/material;
- unidad;

No se copian automáticamente:
- fecha;
- cantidad si puede variar;
- coste;
- condiciones;
- observaciones.

## Recordatorios derivados

Ejemplos sin IA:
- revisar riego en X días;
- recordar próxima tarea indicada por usuario;
- seguimiento de una observación;
- documento/análisis pendiente.

No crear automáticamente recomendaciones fitosanitarias de alto impacto a partir de reglas simples.

## Entrada por voz/IA futura

Frase:

`Hoy he abonado Las Viñas con 250 kilos de 15-15-15.`

Resultado:
- borrador `Abonado`;
- parcela sugerida `Las Viñas`;
- cantidad 250 kg;
- producto 15-15-15;
- fecha actual.

El usuario confirma antes de guardar.

## Timeline de parcela

Todas las labores deben alimentar una cronología unificada:

```text
12 mar · Poda
04 abr · Abonado
18 may · Tratamiento
02 jun · Observación + 3 fotos
10 jul · Riego
07 nov · Recolección
08 nov · Entrega 1.842 kg
```

La entrega no es una `activity`, pero puede aparecer en la misma timeline visual mediante un feed agregado.

## Métricas del piloto

- tiempo medio de registro;
- tipos más usados;
- porcentaje que usa `Otra`;
- campos opcionales realmente rellenados;
- frecuencia de fotos;
- frecuencia de coste;
- uso de múltiples parcelas;
- correcciones posteriores.

Si un campo opcional casi nunca se usa, no debe ocupar espacio principal.

## Decisión V1

El catálogo inicial recomendado es:

1. Tratamiento
2. Abonado
3. Poda
4. Desbroce
5. Laboreo
6. Riego
7. Recolección
8. Mantenimiento
9. Plantación/reposición
10. Análisis/muestreo
11. Observación
12. Otra

Es suficientemente específico para olivar y suficientemente flexible para un piloto real.
