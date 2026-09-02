# Reglas de cálculo V1 — Mágina Olivo

Estado: contrato funcional previo a implementación.

## Principio

Los cálculos de campaña son deterministas, reconstruibles y no dependen de IA.

Una misma campaña debe mostrar el mismo resultado en:
- dashboard;
- API;
- exportación;
- informes;
- comparativas.

## Precisión

Persistencia:
- kilos: `numeric`, hasta milésimas si la fuente las aporta;
- porcentajes: `numeric`, conservar precisión original razonable;
- dinero: decimal exacto / centavos.

Presentación:
- kilos: normalmente 0–2 decimales según contexto;
- rendimiento: normalmente 2 decimales;
- no redondear registros base para calcular agregados.

Regla: calcular con precisión almacenada y redondear solo al presentar/exportar según formato.

## Kilos oficiales de campaña

`campaign_delivered_kg = SUM(kilograms)`

Incluye:
- entregas activas;
- pertenecientes a la campaña/holding;
- no archivadas/anuladas.

No incluye:
- estimaciones de recolección;
- labores de tipo recolección;
- entregas en staging no confirmadas;
- posibles duplicados no confirmados.

## Kilos por finca/parcela

Una entrega puede no tener parcela.

Por tanto:

`kilos_parcelas_conocidas <= kilos_totales_campaña`

La UI no debe forzar que el total por parcelas coincida con campaña si existen entregas de origen no desglosado.

Debe poder mostrar:
- kilos con parcela conocida;
- kilos sin parcela asignada.

## Rendimiento por entrega

El rendimiento activo de una entrega es el resultado vigente de tipo `yield_percentage` que no esté archivado/sustituido.

Si hay varias mediciones no comparables, no elegir arbitrariamente la última sin reglas de tipo/fuente.

Para piloto se espera un único rendimiento graso operativo por entrega, con historial de corrección cuando se sustituye.

## Rendimiento medio principal

La métrica principal de campaña será **media ponderada por kilos** cuando los rendimientos sean comparables.

Fórmula:

`weighted_yield = SUM(delivery_kg * yield_percentage) / SUM(delivery_kg)`

solo para entregas que tengan rendimiento válido/comparable.

Ejemplo:
- 1.000 kg al 20 %;
- 3.000 kg al 22 %.

Resultado:

`(1000*20 + 3000*22) / 4000 = 21,50 %`

No usar media simple `(20+22)/2=21` como KPI principal porque daría el mismo peso a entregas de tamaños distintos.

## Cobertura de rendimiento

El dashboard debe acompañar la media con cobertura:

- `kg_with_yield`;
- `kg_total`;
- `% kilos con rendimiento`;
- `deliveries_pending_yield`.

Ejemplo:

`Rendimiento medio 21,50 % · cubre 72 % de los kilos`

Así se evita presentar una media parcial como si resumiera toda la campaña.

## Comparabilidad

No mezclar automáticamente resultados si:
- `result_type` distinto;
- unidad distinta;
- metodología/fuente marcada como no comparable;
- dato provisional vs definitivo si el modelo lo distingue.

El piloto debe validar cómo llaman las cooperativas al rendimiento y qué diferencias reales existen.

## Rendimiento por parcela

Solo se calcula con entregas asignadas a esa parcela y con rendimiento válido.

No repartir una entrega de finca completa entre parcelas por estimación salvo función futura explícita; nunca hacerlo silenciosamente.

## Rendimiento por cooperativa/almazara

Ponderado por kilos de las entregas del usuario a ese destino.

No presentar un ranking de cooperativas como conclusión agronómica sin contexto, porque influyen parcela, fecha, madurez, manejo y otros factores.

La UI debe tratarlo como comparación del histórico del usuario, no como calidad objetiva de la entidad.

## Campañas cerradas

Cerrar campaña no congela necesariamente todos los datos para siempre.

Correcciones posteriores:
- requieren permisos;
- generan audit event;
- recalculan agregados;
- pueden marcar la campaña como modificada después de cierre.

No duplicar campañas para corregir un ticket.

## Entregas anuladas/archivadas

Una entrega archivada deja de contar en agregados activos.

Conservar:
- quién archivó;
- cuándo;
- motivo si la UI lo solicita;
- audit event.

## Duplicados

Un registro marcado solo como `duplicate_candidate` no se elimina automáticamente.

Si se confirma duplicado:
- mantener evidencia de import batch/origen;
- excluir el duplicado confirmado del agregado;
- no perder el registro canónico correcto.

## Costes

Si V1 muestra costes:

`activity_cost_total = SUM(cost_amount de labores activas incluidas)`

No mezclar automáticamente:
- costes de labor;
- compras de stock;
- liquidaciones;
- ingresos;

hasta definir contabilidad funcional.

La V1 no es contabilidad fiscal.

## Superficie

Superficie de explotación/finca no debe calcularse siempre sumando parcelas si:
- hay solapes;
- parcelas parciales;
- dato declarado distinto.

Conservar superficie declarada y derivada como conceptos separados si surge la necesidad.

## Fechas de campaña

Una campaña se identifica por sus años/estado, pero `delivered_at` manda para ordenar entregas.

No inferir campaña exclusivamente por mes/fecha si el usuario ha seleccionado una campaña explícita.

## Zona horaria

- eventos almacenados en `timestamptz`;
- UI usa timezone del usuario/explotación;
- fecha de entrega histórica enviada por usuario se conserva como evento;
- `created_at` lo genera servidor.

## Redondeo

Propuesta de presentación:
- kilos dashboard: entero si no aporta valor decimal;
- kilos detalle: hasta 3 decimales según fuente;
- rendimiento UI: 2 decimales;
- exportación: precisión canónica documentada.

No usar redondeo bancario/half-up sin decidirlo en implementación; escoger una regla única y testearla.

## Null vs cero

Crítico:
- `rendimiento = null` significa desconocido/no recibido;
- `rendimiento = 0` es un valor explícito y normalmente sospechoso, pero no equivalente a null.

Lo mismo para costes/cantidades.

## Tests de oro

El repositorio debe incluir casos de prueba fijos:

### Caso A
- 1000 kg @ 20
- 3000 kg @ 22
- esperado: 4000 kg, 21.50 %.

### Caso B
- 1000 kg @ 20
- 3000 kg sin rendimiento
- esperado: 4000 kg totales, 1000 kg con rendimiento, media 20 %, cobertura 25 %.

### Caso C
- entrega 1000 kg archivada + entrega 2000 kg activa
- esperado: 2000 kg.

### Caso D
- 1842 kg, rendimiento inicial 21.5 sustituido por 21.7
- esperado: solo 21.7 en KPI; historial conserva 21.5.

### Caso E
- retry idempotente de 1842 kg
- esperado: una única entrega y 1842 kg totales.

## Contrato público

Cualquier cambio futuro en estas reglas que pueda cambiar estadísticas históricas debe:
1. versionarse;
2. documentarse;
3. añadir tests;
4. evaluar recalculado de campañas existentes;
5. no cambiar silenciosamente resultados históricos mostrados al usuario.
