# Mágina Olivo — Mi Campo UX V4

Fecha: 2026-09-08  
Estado: **dirección de producto y UX para implementación post-staging**  
Base documental: `docs/ux-v3-information-architecture-2026-09-08`  
Referencia funcional que no debe modificarse: `staging/candidate-v11-2026-09-05` @ `063767560fe824c3415f200e0314dc5b2e8f4122`

> Este documento no autoriza cambios sobre el candidato V11. Define cómo debe reorganizarse `Mi Campo` en una rama funcional posterior, reutilizando el GIS, Catastro, SIGPAC, labores, tareas, documentos y offline que Mágina Olivo ya posee.

---

## 1. Problema que resolvemos

Mágina Olivo ya tiene muchas capacidades, pero actualmente `Mi Campo` se comporta demasiado como una página técnica larga:

- selección/listado de fincas;
- alta de finca;
- listado/alta de parcelas;
- mapa;
- comparación de fuentes;
- SIGPAC;
- Catastro;
- formulario de labores;
- KPIs;
- timeline.

El problema no es falta de funciones. Es **jerarquía visual y navegación**.

El agricultor no debe pensar:

```text
Finca -> formulario -> parcela -> SIGPAC -> Catastro -> mapa -> cuaderno -> historial
```

Debe pensar:

```text
Veo mi campo -> entro donde quiero -> entiendo qué pasa -> registro lo que hago
```

Regla central:

```text
VER -> ENTENDER -> DECIDIR -> ACTUAR -> REGISTRAR -> APRENDER
```

---

## 2. Modelo mental definitivo

La jerarquía de datos se conserva porque es útil:

```text
MI MÁGINA PRIVADA
│
└── EXPLOTACIÓN / HOLDING
    │
    ├── FINCA
    │   │
    │   ├── PARCELA
    │   │   ├── Geometría / ubicación
    │   │   │   ├── Catastro
    │   │   │   └── 0..N recintos SIGPAC
    │   │   ├── Foto principal
    │   │   ├── Galería / documentos
    │   │   ├── Datos agronómicos
    │   │   ├── Actividad / labores
    │   │   ├── Observaciones / incidencias
    │   │   ├── Tareas
    │   │   └── Cosecha / entregas / rendimientos
    │   │
    │   └── PARCELA ...
    │
    └── FINCA ...
```

### Regla UX

La jerarquía **organiza los datos**, pero no debe imponer una navegación profunda.

Se permiten accesos directos:

```text
Mi Campo -> mapa -> Parcela
Mi Campo -> lista -> Parcela
Mi Campo -> Finca -> Parcela
Inicio -> aviso -> Parcela
Tarea -> Parcela
```

`Finca` sigue siendo importante para:

- agrupar parcelas;
- tener una identidad/foto propia;
- aplicar trabajos a varias parcelas;
- resumir superficie, actividad y cosecha;
- organizar explotaciones medianas/grandes.

`Parcela` es el **centro operativo diario**.

---

## 3. Navegación privada de Mágina Olivo

Barra inferior recomendada:

```text
[ Inicio ] [ Mi Campo ] [  +  ] [ Campaña ] [ Más ]
```

### Inicio

Responde: `¿Qué necesito mirar o hacer hoy?`

### Mi Campo

Responde: `¿Dónde están mis fincas y parcelas y qué pasa en ellas?`

### +

Responde: `¿Qué quieres registrar?`

Opciones contextuales:

```text
Trabajo / labor
Entrega
Observación / incidencia
Tarea
Foto / documento
```

### Campaña

Entregas, kilos, rendimientos, origen, documentos e informes.

### Más

Calendario, documentos globales, cooperativas, avisos, informes, importaciones, IA, perfil y ajustes.

El antiguo destino privado `Mágina` no debe competir con el trabajo personal. La información pública de Mágina sigue disponible en la zona pública y como contexto cuando sea útil.

---

## 4. Mi Campo — pantalla principal

`Mi Campo` debe ser una pantalla espacial, no un formulario.

### Cabecera

```text
Mi Campo
2 fincas · 5 parcelas · 8,72 ha
```

Si existen varias explotaciones, selector compacto de explotación.

### Control principal

```text
[ MAPA ] [ LISTA ]
```

Es la misma información en dos representaciones sincronizadas.

### Vista mapa

Debe mostrar todas las parcelas privadas ya registradas.

Al tocar un polígono:

```text
Parcela Norte
Cortijo del Río · 3,42 ha
Estado: revisar mosca
Última actividad: Desbroce · 2 sep

[Abrir parcela]
```

No abrir Catastro/SIGPAC como panel técnico al tocar una parcela.

Capas disponibles mediante control secundario:

- mapa base;
- ortofoto PNOA/IGN;
- mis parcelas;
- Catastro, cuando proceda;
- SIGPAC, cuando proceda.

### Vista lista

Agrupar por finca, sin obligar a abrir la finca primero:

```text
FINCA · Cortijo del Río
5,58 ha · 2 parcelas

Parcela Norte                3,42 ha
Revisar mosca
Última labor · Desbroce · 2 sep

Las Erillas                  2,16 ha
Sin avisos

FINCA · El Cerro
3,14 ha · 3 parcelas
...
```

Pulsar cabecera de finca -> `Resumen de finca`.

Pulsar parcela -> `Parcela`.

### Acción de alta

Acción visible:

```text
[ + Añadir parcelas ]
```

`Añadir finca` se ofrece:

- durante la primera alta;
- dentro de resumen de finca;
- como opción secundaria de organización.

No obligar al usuario a crear primero una finca vacía para poder encontrar sus parcelas en Catastro.

---

## 5. Resumen de Finca

La finca debe sentirse como una carpeta visual de territorio, no como una entidad administrativa.

### Cabecera visual

Foto principal de la finca si existe.

Sobre/tras la imagen, con contraste accesible:

```text
Cortijo del Río
5,58 ha · 2 parcelas
Bedmar · Jaén
```

Si no hay foto:

```text
[Añadir foto de la finca]
```

La foto es **muy recomendada**, pero no debe bloquear el alta inicial si:

- no hay conexión;
- el usuario deniega cámara/galería;
- quiere terminar rápidamente.

La ficha quedará marcada de forma suave como `Completar foto`.

### Contenido

1. mini mapa con todas las parcelas de la finca;
2. estado general / alertas relevantes;
3. parcelas;
4. actividad reciente;
5. resumen de campaña;
6. documentos/fotos de finca.

### Acción principal

```text
[ Registrar trabajo ]
```

Si se ejecuta desde una finca:

```text
¿Dónde se ha realizado?

○ Toda la finca
● Elegir parcelas
   ☑ Parcela Norte
   ☑ Las Erillas
```

Esto implementa el requisito ya definido de aplicar una labor a una o varias parcelas sin duplicar manualmente registros.

---

## 6. Parcela — centro operativo

La pantalla de parcela debe resolver en pocos segundos:

1. ¿Dónde estoy / qué parcela es?
2. ¿Qué pasa hoy?
3. ¿Qué tengo que hacer?
4. ¿Cómo registro lo que acabo de hacer?
5. ¿Dónde veo el histórico?

### Cabecera

```text
< Mi Campo
Parcela Norte
Cortijo del Río · 3,42 ha
```

### Identidad visual

Mostrar:

- foto principal de parcela si existe;
- acceso a mapa/ortofoto con perímetro;
- acción `Cambiar foto`;
- acción `Ver mapa`.

La foto y el mapa cumplen funciones diferentes:

- **foto**: reconocer visualmente la finca/parcela;
- **mapa**: delimitar territorio y consultar fuentes oficiales.

No sustituir una por la otra.

### Resumen de hoy

Tres bloques compactos:

```text
Tiempo          RAIF            Campaña
18 °C           Riesgo medio    4.280 kg
```

Añadir fecha/fuente cuando sea relevante.

### Atención / recomendación

Ejemplo:

```text
Mágina recomienda
Revisar mosca del olivo antes del viernes.

[Ver por qué]
```

La explicación debe distinguir fuente oficial, datos meteorológicos y registros del usuario. Nunca presentar un aviso RAIF como diagnóstico de esa parcela.

### Acción primaria

```text
[ + Registrar ]
```

### Navegación secundaria de parcela

La pantalla de entrada ya es el `Resumen`. Debajo, máximo cuatro destinos persistentes:

```text
[ Actividad ] [ Cosecha ] [ Datos ] [ Documentos ]
```

#### Actividad

- labores;
- observaciones;
- incidencias;
- tareas;
- timeline cronológico;
- filtro por tipo.

#### Cosecha

- kilos asociados;
- entregas;
- rendimiento;
- histórico por campaña;
- comparativas cuando exista dato suficiente.

#### Datos

- referencia catastral;
- procedencia del perímetro;
- recintos SIGPAC asociados;
- superficie;
- variedad;
- riego;
- olivos aproximados;
- municipio/localización;
- editar datos declarados por usuario.

Catastro y SIGPAC viven principalmente aquí como **fuentes**, no como módulos de trabajo diarios.

#### Documentos

- fotos;
- análisis;
- tickets asociados;
- informes;
- documentos de tratamientos/labores;
- otros archivos.

---

## 7. Alta de parcela — Map First

Este flujo reemplaza visualmente el patrón actual de `crear parcela vacía -> localizar -> consultar Catastro/SIGPAC`.

### Entrada

```text
Mi Campo
  -> + Añadir parcelas
```

### Paso 1 — Localizar

Una única pantalla ofrece varias maneras de llegar al mismo mapa:

```text
[ Mapa ] [ Mi ubicación ] [ Ref. catastral ] [ Polígono/parcela ]
```

No son cuatro módulos.

### Paso 2 — Ver terreno

Mapa con:

- ortofoto PNOA/IGN opcional;
- límites Catastro;
- SIGPAC opcional;
- parcelas ya registradas;
- ubicación actual opcional.

### Paso 3 — Seleccionar

El usuario toca una o varias parcelas oficiales.

Bottom sheet:

```text
3 parcelas seleccionadas

RC ...0034 · 1,34 ha
RC ...0035 · 0,87 ha
RC ...0040 · 2,11 ha

Total mostrado · 4,32 ha

[Continuar con 3 parcelas]
```

Debe existir lista accesible equivalente al mapa.

### Paso 4 — Verificación servidor

Mágina vuelve a consultar la fuente oficial.

Estados por parcela:

- lista para crear;
- ya añadida;
- no encontrada;
- geometría no soportada;
- fuente no disponible.

No enviar geometría del navegador como autoridad.

### Paso 5 — Organizar en finca

Después de seleccionar el territorio:

```text
¿A qué finca pertenecen?

○ Cortijo del Río
○ El Cerro
● Crear finca nueva
```

Si crea finca nueva:

```text
Nombre de finca *
Foto de finca      [Hacer foto] [Galería]
```

La foto puede omitirse y completarse después.

### Paso 6 — Datos agrícolas mínimos

Por parcela:

```text
Nombre de trabajo *
Variedad             opcional
Riego                opcional
Número de olivos     opcional
Foto de parcela      recomendada
Notas                opcional
```

Permitir batch para valores compartidos cuando sea seguro:

- misma finca;
- mismo riego;
- misma variedad, tras acción explícita.

Nunca inferir Picual automáticamente.

### Paso 7 — Confirmar

Resumen:

```text
Finca: Cortijo del Río
3 parcelas · 4,32 ha
2 fotos añadidas
Catastro verificado
SIGPAC: 4 recintos asociados

[Guardar en Mi Campo]
```

Resultado:

```text
Campo guardado
[Abrir Mi Campo]
[Registrar primer trabajo]
```

---

## 8. Alta inicial de un usuario sin datos

El onboarding privado debe poder ser corto:

```text
Crear cuenta / entrar
       ↓
Crear explotación mínima
Nombre + municipio
       ↓
Mi Campo vacío
       ↓
[Localizar mis parcelas]
       ↓
Map First
       ↓
Agrupar en finca
       ↓
Foto recomendada
       ↓
Datos mínimos
       ↓
Mi Campo listo
```

Cooperativa, campaña y datos administrativos pueden completarse después si no son necesarios para este objetivo.

La primera experiencia debe producir una recompensa visible: **ver su campo dibujado en el mapa**.

---

## 9. Registro rápido

`+ Registrar` no debe abrir un megaformulario.

Bottom sheet:

```text
¿Qué quieres registrar?

Trabajo
Entrega
Observación
Tarea
Foto / documento
```

Contexto preseleccionado:

```text
En Parcela Norte
```

El usuario puede cambiarlo cuando sea válido.

### Trabajo

Primer nivel:

```text
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
Otra
```

Campos siempre visibles:

- tipo;
- dónde;
- fecha/hora;
- descripción corta cuando proceda.

Después:

```text
Más detalles v
```

Producto, cantidad, coste, maquinaria, foto/documento, notas, etc. según tipo.

Objetivo: labor simple en <= 30-45 s.

### Observación

Debe ser todavía más rápida:

```text
Parcela
Foto opcional
¿Qué has visto?
Gravedad opcional
[Crear tarea después] opcional
```

### Foto / documento

Desde una parcela/finca:

```text
[Hacer foto]
[Elegir de galería]
[Adjuntar archivo]
```

Contexto ya preseleccionado.

---

## 10. Fotografía — contrato de producto

### Tipos de foto

1. foto principal de finca;
2. foto principal de parcela;
3. galería de finca/parcela;
4. evidencia de trabajo;
5. observación/incidencia;
6. documento/ticket fotografiado.

### Reutilizar almacenamiento privado existente

Mágina ya dispone de infraestructura de documentos privados y el tipo `photo`.

No crear un segundo sistema de almacenamiento de imágenes.

La evolución recomendada es ampliar `document_links` para relacionar documentos con:

```text
farm
plot
activity
observation
campaign
delivery
```

Y distinguir semántica, por ejemplo:

```text
cover
attachment
evidence
```

El detalle de esquema debe revisarse antes de migrar DB; no introducir una columna únicamente para resolver decoración visual.

### Privacidad

Las fotos de finca/parcela son privadas por defecto.

No reutilizarlas en directorio público, publicidad, IA externa o noticias sin consentimiento explícito y finalidad separada.

### Offline

La implementación actual de documentos no debe fingir una subida offline.

Primera iteración segura:

- si hay conexión: subir;
- si no hay conexión: permitir seguir sin foto y mostrar `Añadir foto cuando tengas conexión`.

Una cola offline de archivos puede diseñarse más adelante con garantías de privacidad, espacio y reintentos.

---

## 11. GIS / Catastro / SIGPAC — contrato UX

Mágina ya posee adaptadores y pantallas técnicas útiles. La evolución V4 debe **reutilizar la lógica** y cambiar dónde se presenta.

### En uso diario

No mostrar seguidos:

```text
Editor mapa
Comparación fuentes
SIGPAC
Catastro
```

En `Mi Campo` solo se ve el mapa del usuario.

En `Parcela > Datos` se ve el resumen de fuentes.

En `Añadir parcelas` se usa la potencia GIS completa.

### Fuente principal y fuentes asociadas

Mantener la independencia:

- Catastro ≠ SIGPAC;
- una parcela de trabajo puede relacionarse con varios recintos SIGPAC;
- mostrar procedencia y fecha de verificación;
- no acreditar propiedad;
- no editar una geometría oficial y seguir llamándola oficial.

### Capas

El control de capas debe ser consistente en todos los mapas:

```text
Base
Ortofoto
Catastro
SIGPAC
Mis parcelas
```

No repetir controles distintos por cada proveedor.

---

## 12. Estados visuales de parcela

La tarjeta de parcela debe comunicar estado, no solo metadatos.

Estados iniciales:

```text
Sin atención inmediata
Revisar
Atención prioritaria
Datos insuficientes / sin actualizar
```

No depender solo de verde/ámbar/rojo. Siempre icono + texto.

La puntuación/estado debe ser determinista al principio; no introducir IA opaca para decidir si una parcela está "bien".

---

## 13. Qué NO debe estar en la pantalla principal de Mi Campo

- formulario completo de labor;
- formulario completo de finca;
- formulario completo de parcela;
- panel técnico Catastro;
- panel técnico SIGPAC;
- comparación de geometrías siempre visible;
- listado extenso de documentos;
- KPIs de campaña detallados;
- configuración GIS avanzada.

Todo eso sigue existiendo, pero aparece cuando el usuario lo necesita.

---

## 14. Componentes objetivo

Dirección orientativa, no reescritura obligatoria:

```text
features/field/
  FieldHubPage.tsx
  FieldMap.tsx
  FieldList.tsx
  FarmCard.tsx
  ParcelCard.tsx

features/farm/
  FarmPage.tsx
  FarmCoverPhoto.tsx
  FarmParcelList.tsx

features/parcel/
  ParcelPage.tsx
  ParcelSummary.tsx
  ParcelActivity.tsx
  ParcelHarvest.tsx
  ParcelData.tsx
  ParcelDocuments.tsx

features/parcel-import/
  ParcelMapPicker.tsx
  ParcelSearchControls.tsx
  ParcelSelectionSheet.tsx
  ParcelImportReview.tsx

features/quick-action/
  QuickActionSheet.tsx
  WorkForm.tsx
  ObservationForm.tsx
  TaskForm.tsx
  DocumentForm.tsx
```

Reutilizar/adaptar:

- `PlotMapEditor`;
- adapters/routes Catastro;
- adapters/routes SIGPAC;
- timeline de parcela;
- activity routes;
- tasks/calendar;
- documents/private storage;
- offline outbox donde ya esté soportado.

No crear APIs paralelas si una actual puede evolucionar de forma compatible.

---

## 15. Flujo diario definitivo

```text
INICIO
  │
  ├─ aviso / tarea / recomendación
  │             │
  │             v
  └────────> PARCELA <──────── MI CAMPO / MAPA
                │
                ├─ veo estado
                ├─ veo mapa/foto
                ├─ veo actividad
                │
                v
          + REGISTRAR
                │
        ┌───────┼─────────┬─────────┬──────────┐
        v       v         v         v          v
     Trabajo  Entrega  Observación  Tarea  Foto/Doc
        │
        v
      GUARDAR
        │
        v
     TIMELINE
        │
        v
  HISTÓRICO / CAMPAÑA
```

El usuario no necesita conocer qué endpoint, tabla o proveedor produjo cada pieza.

---

## 16. Flujo de territorio definitivo

```text
MI CAMPO
   │
   └─ + AÑADIR PARCELAS
             │
             v
        BUSCAR / LOCALIZAR
   ┌─────────┼──────────┬───────────┐
   v         v          v           v
  Mapa      GPS       Ref. RC    Polígono/
                                 parcela
   └─────────┴──────────┴───────────┘
             │
             v
        MAPA + ORTOFOTO
             │
             v
     SELECCIONAR POLÍGONOS
             │
             v
       VERIFICAR SERVIDOR
             │
             v
      AGRUPAR EN FINCA
             │
        ┌────┴────┐
        v         v
    Existente   Nueva
                  │
                  └─ nombre + foto recomendada
             │
             v
      DATOS AGRÍCOLAS MÍNIMOS
             │
             v
           GUARDAR
             │
             v
       MI CAMPO EN MAPA
```

---

## 17. Inspiración externa que sí encaja

### farmOS

Patrón útil:

- jerarquía de ubicaciones separada del registro rápido;
- `Quick forms` para entradas frecuentes;
- mapa/localización como parte del modelo territorial.

Aplicación a Mágina:

- Finca/Parcela organizan;
- `+ Registrar` ejecuta.

### farmOS Field Kit

Patrón útil:

- cliente ligero móvil;
- PWA;
- persistencia entre sesiones;
- uso offline.

Aplicación a Mágina:

- interfaz de campo grande y simple;
- estados de conectividad claros;
- no bloquear una labor por mala cobertura cuando el outbox existente la soporte.

### LiteFarm

Patrón útil:

- diseño centrado en agricultores;
- mapa como lugar natural para crear/localizar terreno;
- enfoque móvil y accesible.

Aplicación a Mágina:

- Map First para alta;
- menos formularios previos;
- territorio visible como recompensa inmediata.

---

## 18. Orden de implementación recomendado

### PR 1 — Shell de Mi Campo

- separar la página larga actual;
- crear `FieldHubPage` mapa/lista;
- conservar APIs y datos existentes;
- no tocar aún alta GIS.

### PR 2 — Parcela como centro

- crear ficha de parcela;
- mover timeline/labores al contexto de parcela;
- secciones Actividad/Cosecha/Datos/Documentos.

### PR 3 — Resumen de Finca

- ficha de finca;
- mapa de sus parcelas;
- trabajo multiparcela.

### PR 4 — Quick Action Sheet

- Trabajo;
- Entrega;
- Observación;
- Tarea;
- Foto/documento;
- contexto preseleccionado.

### PR 5 — Map First

- reutilizar adapters Catastro/SIGPAC;
- selector por mapa;
- multiselección;
- verificación server-side;
- asignación/creación de finca después de seleccionar.

### PR 6 — Fotos de finca/parcela

- extender vínculo de documentos;
- foto principal;
- galería;
- estados de error/conexión.

### PR 7 — Convergencia y limpieza

- retirar paneles técnicos duplicados de la ruta diaria;
- mantener utilidades internas donde proceda;
- eliminar componentes solo cuando se demuestre que quedaron sin uso.

No hacer una PR gigante.

---

## 19. Criterios de aceptación UX

Un usuario nuevo debe poder:

1. entrar/crear cuenta;
2. crear su explotación mínima;
3. localizar su zona sin conocer coordenadas;
4. seleccionar una parcela Catastro en mapa;
5. asignarla a una finca;
6. añadir foto si quiere;
7. guardar;
8. verla inmediatamente en `Mi Campo`;
9. abrirla;
10. registrar una labor simple;
11. ver esa labor en el timeline.

Sin explicación oral del funcionamiento.

Objetivos orientativos:

- llegar a `Mi Campo` en 1 toque desde navegación privada;
- abrir una parcela desde mapa/lista en 1 toque adicional;
- labor simple <= 30-45 s;
- `+ Registrar` disponible desde parcela sin desplazarse al final de una página;
- ninguna fuente externa obliga a navegar por una pantalla técnica en el uso diario.

---

## 20. Estados obligatorios

Cada pantalla nueva debe contemplar:

### Vacío

```text
Todavía no has añadido parcelas.
[Localizar mis parcelas]
```

### Sin conexión

```text
Estás sin conexión.
Mostramos los datos guardados en este dispositivo.
```

### Catastro/SIGPAC no disponible

```text
La fuente oficial no responde ahora.
Tus parcelas guardadas siguen disponibles.
[Reintentar]
```

### Foto no subida

No fingir éxito.

### Dato antiguo

Mostrar fecha real de actualización.

### Duplicado

```text
Esta parcela ya está en Mi Campo.
[Abrir parcela]
```

---

## 21. Accesibilidad y uso real en campo

Objetivo: WCAG 2.2 AA.

Diseñar para:

- sol directo;
- una mano;
- dedos/manos sucias;
- móvil Android estrecho;
- mala cobertura;
- usuarios poco digitales.

Reglas:

- targets táctiles amplios;
- texto mínimo legible;
- alto contraste;
- icono + texto;
- alternativa lista a cualquier selección en mapa;
- foco y teclado;
- no depender de arrastrar;
- formularios progresivos;
- mensajes offline explícitos.

---

## 22. Señal de éxito

El agricultor debe poder explicar Mágina así:

> `Entro en Mi Campo, veo mis fincas y parcelas en el mapa, pulso la parcela, apunto lo que he hecho y ya está.`

Si necesita explicar `Catastro`, `SIGPAC`, `comparador de fuentes`, `holding`, `boundary` o la estructura del backend para completar una tarea diaria, la UX todavía no está terminada.
