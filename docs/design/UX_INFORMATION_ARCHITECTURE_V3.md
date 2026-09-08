# Mágina Olivo — UX / Information Architecture V3

Fecha: 2026-09-08
Estado: **decisión de producto post-staging**
Base de referencia: `staging/candidate-v11-2026-09-05` @ `063767560fe824c3415f200e0314dc5b2e8f4122`

> Este documento define la dirección de UX e información para la siguiente evolución visual de Mágina Olivo. **No autoriza modificar el candidato V11 ni sustituye la aceptación de staging vigente.**

---

## 1. Objetivo

Simplificar la experiencia de Mágina Olivo sin perder funcionalidad.

La aplicación ya dispone o tiene diseñadas piezas para:

- explotación, fincas y parcelas;
- Catastro y SIGPAC;
- mapa/ortofoto;
- labores y diario de campo;
- campaña, entregas y rendimientos;
- documentos;
- tareas y calendario;
- meteorología y alertas de lluvia;
- RAIF;
- noticias y eventos;
- mercado/precio del aceite;
- directorio y cooperativas;
- funcionamiento offline/PWA;
- exportación e informes;
- futuras capacidades de IA, costes, familia/cuadrilla, incentivos y automatización.

El problema de V3 no es añadir más menús. El problema es **hacer que todas esas capacidades se perciban como un único flujo natural de trabajo**.

La regla de diseño es:

```text
VER -> ENTENDER -> DECIDIR -> ACTUAR -> REGISTRAR -> APRENDER
```

El usuario no debe conocer la estructura interna de módulos, tablas o proveedores para usar la aplicación.

---

## 2. Principio rector

Mágina Olivo debe comportarse como **el asistente digital del olivar**, no como un ERP agrícola.

Para el agricultor, el modelo mental debe ser:

```text
Mi campo
  -> Mágina me dice qué pasa
  -> decido qué hacer
  -> lo registro con pocos toques
  -> Mágina ordena automáticamente el histórico
```

No diseñar la navegación según la arquitectura técnica.

Ejemplo incorrecto:

```text
Catastro
SIGPAC
RAIF
AEMET
Labores
Documentos
Tareas
Campañas
Entregas
Rendimientos
```

Ejemplo correcto:

```text
Parcela Norte
  -> estado de hoy
  -> recomendación
  -> registrar trabajo
  -> actividad
  -> cosecha
  -> datos
  -> documentos
```

Catastro, SIGPAC, RAIF, AEMET y otras fuentes deben aportar contexto a la parcela, no convertirse necesariamente en destinos principales.

---

## 3. Separación estructural: Mágina pública vs Mi Mágina privada

V3 debe mantener una separación visual y conceptual clara.

### 3.1 Mágina pública — sin cuenta

Objetivo: utilidad inmediata y captación.

Destinos públicos principales:

1. Inicio Mágina
2. Tiempo
3. Precio del aceite / mercado
4. Noticias y eventos
5. RAIF / avisos de campo
6. Cooperativas / directorio
7. Información local adicional cuando proceda

Reglas:

- no exigir registro para consultar información pública;
- mostrar fuente y fecha de actualización;
- diferenciar información oficial, curada y estimada;
- no mezclar datos privados del usuario;
- facilitar una entrada clara a `Mi Campo` / `Entrar`.

### 3.2 Mi Mágina — con cuenta

Objetivo: trabajo diario del agricultor.

Barra inferior recomendada:

```text
[ Inicio ] [ Mi Campo ] [  +  ] [ Campaña ] [ Más ]
```

El antiguo destino privado `Mágina` deja de competir como pestaña principal: el contenido público sigue estando disponible, pero la zona privada prioriza el trabajo personal.

---

## 4. Navegación principal privada V3

### 4.1 Inicio

Pregunta a responder:

> ¿Qué necesito saber o hacer hoy?

Debe priorizar:

- estado de parcelas;
- alertas importantes;
- clima accionable;
- tareas próximas/vencidas;
- resumen de campaña cuando esté activa;
- actividad reciente;
- recomendación principal de Mágina.

No convertir Inicio en un panel de 15 widgets.

Orden recomendado:

1. saludo/contexto;
2. recomendación/atención principal;
3. avisos de hoy;
4. resumen breve de campaña;
5. actividad reciente;
6. accesos secundarios.

Máximo tres alertas prioritarias visibles sin expandir.

### 4.2 Mi Campo

`Mi Campo` es el centro operativo y espacial de la aplicación.

Debe mostrar:

- mapa de parcelas;
- lista/tarjetas de parcelas sincronizada con el mapa;
- estado de cada parcela;
- superficie;
- última actividad;
- avisos contextuales;
- acción `Añadir parcela`.

El usuario debe poder cambiar entre:

```text
[ Mapa ] [ Lista ]
```

sin cambiar de módulo.

### 4.3 Botón central `+`

Debe ser una acción global y contextual.

Al pulsarlo:

```text
¿Qué quieres registrar?

- Trabajo / labor
- Entrega
- Observación o incidencia
- Tarea
- Documento / foto
```

Si el usuario está dentro de una parcela, la parcela debe llegar preseleccionada.

Si está en Campaña, la campaña debe llegar preseleccionada.

Si está en una cooperativa, esa cooperativa puede proponerse como contexto, nunca imponerse.

### 4.4 Campaña

Debe concentrar la fase de recolección y resultados.

Contenido principal:

- kilos totales;
- entregas;
- rendimiento ponderado;
- pendientes de rendimiento;
- evolución;
- origen por finca/parcela;
- cooperativas utilizadas;
- costes cuando estén habilitados;
- documentos;
- exportar/generar informe.

Durante campaña activa, `Entrega` puede ser la primera acción del botón `+`.

### 4.5 Más

Debe contener funciones importantes pero de menor frecuencia diaria:

- calendario y tareas;
- documentos;
- mis cooperativas;
- centro de avisos;
- informes;
- costes;
- importar datos;
- Mágina IA;
- familia/cuadrilla cuando se implemente;
- Mis Aceitunas / incentivos cuando se implemente;
- perfil;
- preferencias;
- privacidad;
- exportar datos;
- cerrar sesión.

Regla: **no mover a Más una función que el agricultor necesite repetidamente durante el trabajo de campo**.

---

## 5. Mi Campo — arquitectura detallada

### 5.1 Vista general

Ejemplo conceptual:

```text
Mi Campo

┌───────────────────────────────┐
│         MAPA / ORTOFOTO       │
│   Norte   Erillas    Cerro    │
└───────────────────────────────┘

3 parcelas · 8,72 ha

Parcela Norte          3,42 ha
🟢 Todo correcto
Última labor: Desbroce · 2 sep

Las Erillas            2,16 ha
🟡 Revisar mosca
Lluvia prevista: 12 mm

El Cerro               3,14 ha
🟢 Sin avisos
```

Estado visual posible:

- verde: sin atención inmediata;
- ámbar: revisar;
- rojo: atención prioritaria;
- gris: datos insuficientes/sin conexión;

Nunca depender solo del color. Añadir icono y texto.

### 5.2 Finca

La entidad finca sigue existiendo en modelo de datos, pero no debe obligar a navegar por una jerarquía profunda si no aporta valor.

Usos:

- agrupar parcelas;
- aplicar una labor a varias parcelas;
- visualizar resumen de superficie/campaña;
- organizar explotaciones con muchas parcelas.

No introducir una pantalla intermedia obligatoria `Explotación -> Finca -> Parcela` en cada consulta.

### 5.3 Parcela — centro de contexto

La pantalla de parcela debe ser el lugar donde converge toda la información relevante.

Cabecera:

- nombre;
- superficie;
- municipio/localización;
- estado;
- mapa/ortofoto con perímetro.

Resumen rápido recomendado:

```text
Tiempo | RAIF | Campaña
```

Ejemplo:

```text
🌦 18 °C       🪰 Medio       🫒 4.280 kg
Tiempo         RAIF           Campaña
```

Después:

### Recomendación / atención

```text
Mágina recomienda
Revisar mosca del olivo antes del viernes.
[Ver por qué]
```

La explicación debe mostrar fuente y razonamiento visible, por ejemplo:

- aviso RAIF de zona;
- fecha;
- condiciones meteorológicas;
- tarea o histórico del usuario.

No presentar correlación como diagnóstico.

### Acción primaria

```text
[ + Registrar ]
```

### Actividad reciente

Timeline breve:

- labor;
- entrega asociada;
- observación;
- tarea completada;
- documento;
- alerta relevante si se decide conservar en histórico.

### Navegación secundaria de parcela

Máximo cuatro destinos visibles:

```text
[ Actividad ] [ Cosecha ] [ Datos ] [ Documentos ]
```

#### Actividad

- labores;
- observaciones;
- tareas;
- incidencias;
- timeline completo.

#### Cosecha

- kilos asociados;
- entregas;
- rendimiento;
- campañas anteriores;
- comparaciones.

#### Datos

- referencia catastral;
- SIGPAC/recintos;
- superficie;
- variedad;
- riego;
- número aproximado de olivos;
- procedencia de geometría;
- editar datos declarados por usuario.

#### Documentos

- fotos;
- tickets;
- tratamientos;
- análisis;
- informes;
- otros archivos relacionados.

---

## 6. Alta de parcelas — Map First

V3 adopta como dirección el enfoque descrito en `docs/design/PARCEL_MAP_FIRST_V1.md`.

Flujo preferente:

```text
Mi Campo
  -> Añadir parcelas
  -> Buscar en mapa
  -> localizar zona
  -> seleccionar una o varias parcelas
  -> confirmar
  -> verificación server-side
  -> completar datos agrícolas mínimos
  -> guardar
```

Entradas equivalentes al mismo flujo:

- mapa;
- mi ubicación;
- referencia catastral;
- municipio + polígono + parcela.

No crear cuatro módulos separados.

### 6.1 Datos mínimos tras selección

Por parcela:

- nombre de trabajo;
- variedad principal opcional;
- riego opcional;
- número de olivos opcional;
- notas opcionales.

La geometría y superficie procedentes de fuente oficial no deben ser reescritas por el navegador como autoridad.

### 6.2 Catastro y SIGPAC

Reglas:

- Catastro y SIGPAC son fuentes independientes;
- no acreditar propiedad;
- mostrar procedencia;
- verificar server-side antes de persistir;
- permitir 1 parcela de trabajo -> N recintos SIGPAC;
- mantener anti-duplicado explícito;
- permitir lista accesible equivalente al mapa.

---

## 7. Registro rápido — patrón común

Todas las acciones frecuentes deben compartir patrón visual.

```text
Contexto conocido
-> tipo de acción
-> campos esenciales
-> detalles opcionales plegados
-> guardar
```

### 7.1 Trabajo / labor

Primer nivel:

```text
¿Qué has hecho?

Poda
Desbroce
Tratamiento
Abonado
Riego
Laboreo
Recolección
Mantenimiento
Plantación/reposición
Análisis/muestreo
Observación
Otra
```

Campos esenciales:

- lugar/parcela;
- fecha/hora;
- tipo;
- descripción mínima cuando sea necesaria.

Detalles opcionales:

- producto;
- dosis/cantidad;
- coste;
- maquinaria;
- fotos;
- notas;
- recordatorio;
- campos normativos futuros.

Objetivo V3:

- labor simple <= 30 s deseable;
- no empeorar el límite de piloto existente;
- funcionar con una mano.

### 7.2 Entrega

Campos esenciales:

- fecha/hora ahora por defecto;
- kilos como campo principal;
- cooperativa recordada;
- origen opcional.

Opcionales:

- ticket;
- rendimiento;
- nota;
- foto/documento.

No obligar a parcela si la carga mezcla varias.

### 7.3 Observación / incidencia

Flujo corto:

- parcela/contexto;
- texto corto o categoría;
- foto opcional;
- gravedad opcional;
- crear tarea asociada opcional.

### 7.4 Tarea

- qué;
- dónde;
- cuándo;
- prioridad;
- recordatorio.

### 7.5 Documento

- foto/archivo;
- tipo;
- contexto actual preseleccionado;
- relación con entrega/labor/parcela/campaña cuando proceda.

---

## 8. Inicio — dashboard accionable

Inicio debe evitar el patrón de dashboard corporativo.

Pregunta principal:

> ¿Qué tengo que mirar hoy?

Ejemplo:

```text
Buenos días
Martes, 8 de septiembre

HOY EN TU OLIVAR
🟡 Revisar Parcela Norte
   Riesgo medio de mosca

🌧 Mañana
   Posibles 12 mm

✅ 2 trabajos programados

CAMPAÑA 2026/27
18.420 kg · 4 entregas · 19,4 %

ACTIVIDAD
Desbroce · Norte · ayer
Entrega · 1.840 kg · hace 3 días
```

### Regla de prioridad

Mostrar primero lo que puede cambiar una decisión del usuario.

Orden sugerido:

1. urgente;
2. tarea vencida/próxima;
3. meteorología relevante;
4. RAIF relevante;
5. campaña;
6. información general.

Noticias, mercado y eventos no deben desplazar un aviso operativo del campo.

---

## 9. Campaña — arquitectura detallada

Pantalla principal:

```text
Campaña 2026/27

18.420 kg
19,4 % rendimiento
4 entregas

[ Entregas ] [ Rendimiento ] [ Origen ]
[ Costes ]   [ Documentos ]  [ Informe ]
```

### 9.1 Entregas

- lista cronológica;
- kilos;
- cooperativa;
- rendimiento si existe;
- estado pendiente si falta;
- filtros sin obligar a una tabla densa en móvil.

### 9.2 Rendimiento

- media ponderada;
- evolución temporal;
- máximo/mínimo;
- por finca/parcela;
- por cooperativa;
- comparación de campañas.

### 9.3 Origen

- finca;
- parcela;
- sin asignar;
- mezcla de orígenes.

### 9.4 Costes

Cuando se implemente:

- coste total;
- coste/ha;
- coste/kg;
- por labor;
- por parcela;
- comparación campaña anterior.

No debe bloquear la V3 inicial.

### 9.5 Informe

Generación de PDF/resumen con:

- datos de campaña;
- entregas;
- rendimientos;
- desglose por parcela;
- trabajos relevantes;
- costes si están disponibles;
- documentos/enlaces cuando proceda.

---

## 10. Centro de avisos

Unificar en un solo centro:

- Tiempo
- Campo
- Campaña
- Cooperativa
- RAIF
- Sistema

Niveles:

- informativo;
- importante;
- urgente.

Toda alerta debe poder responder:

- qué ocurre;
- dónde;
- cuándo;
- fuente;
- acción disponible.

Ejemplo:

```text
Lluvia prevista
Parcela Norte · mañana
Probabilidad alta · 12 mm estimados

[Ver tiempo] [Crear recordatorio]
```

---

## 11. Meteorología y RAIF como contexto

### Meteorología

No crear una app meteorológica dentro de Mágina.

En contexto de parcela mostrar:

- actual;
- lluvia próxima;
- viento si afecta;
- mínima/máxima;
- alerta.

La pantalla pública de Tiempo puede ofrecer más detalle.

### RAIF

En parcela mostrar únicamente el resumen relevante para zona/cultivo.

Detalle debe conservar:

- organismo/plaga/enfermedad;
- zona;
- fecha;
- fuente oficial;
- enlace.

No convertir un dato zonal en diagnóstico individual.

---

## 12. Cooperativas

El directorio principal puede ser público.

Dentro de la cuenta, `Mis cooperativas` debe mostrar relación personal:

- favoritas/habituales;
- kilos entregados;
- entregas;
- rendimiento;
- documentos;
- acceso oficial cuando exista.

Separar siempre:

```text
Información pública de la cooperativa
vs
Mis datos privados relacionados
```

---

## 13. Documentos

No exigir que el usuario piense primero en “Biblioteca de documentos”.

El documento se captura desde su contexto:

- una entrega;
- una parcela;
- una labor;
- una campaña;
- el botón `+`.

Después se indexa automáticamente en la biblioteca global.

Regla:

> Captura contextual, consulta global.

---

## 14. Calendario y tareas

Calendario no necesita barra inferior propia.

Se accede desde:

- Inicio cuando hay tareas próximas;
- parcela;
- `+ Tarea`;
- `Más -> Calendario`.

Estados simples:

- pendiente;
- hoy;
- vencida;
- completada.

Permitir completar una tarea y registrar una labor desde la misma acción cuando proceda.

Ejemplo:

```text
Tarea: Desbrozar Parcela Norte
[Marcar hecha]
[Registrar trabajo realizado]
```

---

## 15. Mágina IA

No ocupar una pestaña principal permanente en V3 inicial.

Entradas contextuales:

- `Preguntar a Mágina` en Inicio;
- ayuda dentro de parcela;
- voz/texto en registro de labor;
- lectura de ticket/documento;
- explicación de campaña.

La IA propone/borrador. El núcleo determinista valida y persiste.

No usar IA como fuente de verdad para:

- kilos;
- rendimientos;
- geometrías;
- fechas críticas;
- permisos;
- estados legales;
- diagnóstico agronómico concluyente.

---

## 16. Offline y conectividad

La reorganización visual no debe romper las garantías PWA existentes.

Acciones prioritarias offline:

- registrar labor;
- registrar observación;
- registrar entrega;
- crear tarea;
- consultar datos privados recientes cacheados.

Acciones que requieren red:

- verificar Catastro/SIGPAC;
- datos meteorológicos nuevos;
- RAIF nuevo;
- mercado/noticias nuevas;
- fuentes externas.

La UI debe explicar claramente:

```text
Guardado en este dispositivo · pendiente de sincronizar
```

No bloquear una actualización PWA si existe outbox privado pendiente según la política ya aprobada.

---

## 17. Estados visuales obligatorios

Toda pantalla con datos remotos debe diseñarse para:

1. loading;
2. vacío;
3. error recuperable;
4. offline/cacheado;
5. éxito;
6. dato desactualizado;
7. permisos insuficientes cuando aplique.

No esconder errores de fuente externa como si fueran “sin datos”.

---

## 18. Accesibilidad y uso en campo

Objetivo mínimo: WCAG 2.2 AA y facilidad real en móvil.

Reglas V3:

- botones táctiles >= ~44 px;
- texto principal legible a pleno sol;
- contraste alto;
- no depender de hover;
- no depender solo de color;
- inputs >= 16 px en móvil;
- navegación completa por teclado;
- mapa con lista accesible equivalente;
- formularios cortos;
- acciones primarias cerca del pulgar;
- evitar modales anidados;
- evitar tablas densas en móvil;
- feedback inmediato tras guardar.

---

## 19. Sistema de diseño funcional

La interfaz debe ser visual, pero la decoración nunca debe competir con la tarea.

### Componentes base recomendados

- `StatusCard`
- `ParcelCard`
- `TodayActionCard`
- `QuickActionSheet`
- `ActivityTimeline`
- `MetricTile`
- `AlertCard`
- `SourceBadge`
- `OfflineBadge`
- `EmptyState`
- `ContextHeader`
- `MapListSwitcher`
- `ProgressiveFormSection`

Codex debe favorecer componentes reutilizables sobre CSS específico de cada pantalla.

---

## 20. Jerarquía visual

### Nivel 1 — Acción / decisión

- recomendación;
- alerta;
- registrar;
- kilos/rendimiento en campaña.

### Nivel 2 — Contexto

- clima;
- estado de parcela;
- últimas actividades.

### Nivel 3 — Consulta detallada

- referencias;
- fuentes;
- documentos;
- histórico completo;
- parámetros avanzados.

Si un dato de nivel 3 domina visualmente el primer viewport, revisar el diseño.

---

## 21. Regla de reducción de complejidad

Antes de crear una pantalla nueva, Codex debe responder:

1. ¿Puede mostrarse dentro de Inicio?
2. ¿Es contexto de una parcela?
3. ¿Es una acción del botón `+`?
4. ¿Pertenece a Campaña?
5. ¿Es una herramienta secundaria de `Más`?
6. ¿Es realmente contenido público de Mágina?

Solo crear un nuevo destino principal si ninguna de las anteriores resuelve el caso.

---

## 22. Flujo de oro V3

El recorrido que debe guiar pruebas y diseño:

```text
1. Abrir Mágina pública sin cuenta
2. Consultar tiempo/noticia/mercado
3. Crear cuenta / entrar
4. Añadir explotación mínima
5. Añadir parcelas desde mapa/Catastro
6. Ver Mi Campo
7. Abrir una parcela
8. Entender su estado actual
9. Registrar una labor desde +
10. Crear/consultar tarea
11. Registrar una entrega
12. Añadir rendimiento posteriormente
13. Consultar resumen de campaña
14. Revisar histórico de parcela
15. Generar informe/exportación
16. Continuar funcionando con conectividad irregular
```

---

## 23. Métricas UX V3

Medir en piloto/evolución:

- tiempo para añadir primera parcela;
- tiempo para registrar labor;
- tiempo para registrar entrega;
- porcentaje de registros hechos desde contexto de parcela;
- número medio de toques para acción frecuente;
- abandono de formularios;
- tareas completadas desde Inicio;
- alertas abiertas/silenciadas;
- errores de navegación;
- uso mapa vs lista;
- registros offline sincronizados correctamente;
- tiempo hasta encontrar un documento;
- tiempo hasta entender estado de campaña.

Objetivos orientativos:

- labor simple <= 30–45 s;
- entrega normal <= 20–30 s;
- abrir parcela desde Mi Campo <= 2 toques;
- registrar desde parcela <= 3 pasos conceptuales;
- dashboard útil en primer viewport + desplazamiento corto.

---

## 24. Funciones que NO se eliminan

V3 reorganiza. No borra por simplificar.

Conservar o evolucionar:

- Catastro;
- SIGPAC;
- ortofoto;
- parcelas/fincas/explotaciones;
- labores;
- campaña;
- entregas;
- rendimientos;
- documentos;
- clima;
- radar y lluvia;
- RAIF;
- noticias;
- eventos;
- mercado;
- cooperativas;
- alertas;
- calendario/tareas;
- offline;
- exportaciones;
- privacidad;
- accesibilidad;
- futuras IA/costes/familia/incentivos.

La simplificación se consigue con **convergencia visual y contexto**, no eliminando capacidades.

---

## 25. No objetivos de esta fase

Esta decisión no autoriza todavía:

- rehacer backend;
- cambiar modelo de datos sin necesidad;
- fusionar V11;
- alterar el candidato de staging;
- construir todas las futuras capacidades de IA;
- desplegar gamificación;
- completar CUE/SIEX;
- introducir satélite/sensores solo por tener hueco visual;
- rediseñar toda la marca sin un brief separado.

---

## 26. Dependencias documentales

Leer junto con:

1. `MASTER_PLAN.md`
2. `docs/design/UX_INFORMATION_ARCHITECTURE_V3.md` — este documento
3. `docs/design/UX_V3_MIGRATION_MAP.md`
4. `docs/CODEX_UX_V3_BRIEF.md`
5. `docs/design/PARCEL_MAP_FIRST_V1.md`
6. `docs/V1_SCREEN_MAP.md` — histórico/base funcional, no navegación final V3
7. `docs/DESIGN_SYSTEM_V1.md`
8. `docs/OFFLINE_SYNC_SPEC.md`
9. `docs/mvp/ACCESSIBILITY_GATE_V1.md`

En caso de conflicto sobre **UX post-staging**, prevalece este documento y el brief Codex V3 cuando `MASTER_PLAN.md` lo haya reconocido explícitamente.

---

## 27. Definición de terminado para arquitectura V3

La arquitectura se considerará correctamente implementada cuando:

- la barra privada tenga cinco destinos claros;
- `Mi Campo` sea el centro de parcela/mapa;
- el botón `+` sea contextual;
- una parcela concentre estado, actividad, cosecha, datos y documentos;
- Catastro/SIGPAC no obliguen a navegar por módulos separados;
- Inicio priorice acciones y alertas;
- Campaña concentre resultados de recolección;
- funciones secundarias estén en `Más` sin desaparecer;
- contenido público siga accesible sin cuenta;
- offline, accesibilidad y privacidad no retrocedan;
- tests existentes sigan verdes;
- se añadan tests de navegación y flujos V3;
- el usuario pueda completar el flujo de oro sin comprender la arquitectura interna.
