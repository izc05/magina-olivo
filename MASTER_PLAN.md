# Mágina Olivo — Master Plan V1

Fecha de consolidación: 2026-09-02
Estado: definición funcional avanzada

## 1. Visión

Mágina Olivo será una plataforma web/PWA orientada al olivarero, inicialmente especializada en Sierra Mágina y extensible posteriormente a otras zonas olivareras.

Su objetivo es reunir en una sola herramienta:
- campo y parcelas;
- labores y diario;
- campaña;
- entregas y rendimientos;
- documentos;
- cooperativas/almazaras;
- meteorología;
- información oficial de interés;
- automatizaciones útiles.

La propuesta no es crear otro ERP agrícola generalista ni otro software para gestionar una almazara.

> **Mágina Olivo es el histórico personal y operativo del olivarero, independientemente de dónde entregue su aceituna o qué software utilice cada almazara.**

## 2. Problema que resuelve

Hoy la información puede quedar dispersa entre:
- libreta/papel;
- fotografías de tickets;
- WhatsApp;
- correo;
- portal de la cooperativa;
- app del proveedor de almazara;
- webs institucionales;
- SIGPAC;
- documentos y facturas;
- memoria del propio agricultor.

Además, cada cooperativa/almazara presenta un nivel de digitalización diferente.

Mágina Olivo debe dar continuidad al dato del agricultor incluso si:
- cambia de cooperativa;
- entrega en dos almazaras;
- una tiene portal y otra no;
- cambia el proveedor tecnológico de la cooperativa;
- una integración externa deja de funcionar.

## 3. Principios del producto

1. **Útil sin integraciones externas.** La V1 funciona aunque ninguna cooperativa tenga API.
2. **Móvil primero.** La experiencia principal es teléfono/PWA.
3. **Olivar primero.** No diseñar una interfaz genérica para cualquier cultivo.
4. **Datos del agricultor como fuente central.** Fincas, campañas y documentos son privados por defecto.
5. **Automatización antes que IA.** Sumas, rendimientos, fechas y alertas se resuelven con código determinista.
6. **IA opcional.** Puede ahorrar escritura, pero nunca es dependencia del núcleo.
7. **Neutralidad de proveedor.** AM System, Aicor, Toolagro u otros se conectan mediante adapters futuros.
8. **Simplicidad.** Una entrega normal debe registrarse en menos de 30 segundos durante el piloto.
9. **Trazabilidad.** Todo dato importado relevante conserva origen y verificación.
10. **Privacidad desde el diseño.** Permisos, documentos privados y minimización se deciden antes del backend.
11. **No representar a las cooperativas.** Información pública con fuente; trámites oficiales por sus canales.
12. **No scraping de zonas privadas.** No almacenar contraseñas para simular logins de socio.

## 4. Usuario principal V1

Agricultor/olivarero pequeño o mediano que necesita:
- saber qué fincas/parcelas tiene;
- registrar lo que hace;
- controlar campaña y entregas;
- añadir rendimientos cuando lleguen;
- comparar campañas;
- guardar tickets/documentos;
- recibir avisos útiles;
- consultar información local sin manejar varias webs.

## 5. Navegación móvil V1

Barra inferior:

1. **Inicio**
2. **Campo**
3. **Campaña**
4. **Cooperativas / Almazaras**
5. **Más**

`Más` contiene:
- Labores
- Documentos
- Avisos
- Meteorología
- RAIF
- Importar
- Perfil/Ajustes

Acciones rápidas accesibles desde Inicio/contexto:
- + Entrega
- + Labor
- + Documento/foto
- + Tarea

Durante recolección, `+ Entrega` es la acción primaria.

Documento detallado: `docs/V1_SCREEN_MAP.md` y `docs/V1_WIREFRAMES.md`.

## 6. Jerarquía del campo

```text
Explotación
└── Finca
    └── Parcela
```

### Parcela

Puede incluir:
- nombre;
- superficie;
- referencia SIGPAC;
- geometría/mapa futuro;
- variedad/es;
- nº aproximado de olivos;
- secano/regadío;
- fotografías;
- notas;
- timeline de actividad.

No todos los datos son obligatorios en onboarding.

## 7. Campañas

Una campaña agrupa resultados productivos por temporada.

Ejemplo:
`2026/27`

Estados:
- planned;
- active;
- closed;
- archived.

La campaña muestra:
- kilos totales;
- nº entregas;
- rendimiento ponderado;
- entregas pendientes de rendimiento;
- destinos;
- origen por finca/parcela;
- documentos;
- histórico/comparación.

## 8. Entregas

La entrega es una entidad canónica independiente del proveedor.

Campos de uso V1:
- fecha/hora;
- cooperativa/almazara;
- kilos;
- finca/parcela opcional;
- ticket opcional;
- variedad opcional;
- suelo/vuelo/mixto opcional;
- documento/foto;
- notas.

### Regla UX

No obligar a indicar parcela si una carga mezcla varias.

Una entrega sin parcela sigue siendo válida y aparece como `Sin asignar` en los desgloses.

### Origen del dato

Puede ser:
- manual;
- documento;
- CSV/XLSX;
- futura integración oficial.

El origen no cambia cómo se muestra la campaña, pero siempre puede auditarse.

## 9. Rendimientos y resultados

El rendimiento no es un campo rígido dentro de la entrega.

Se modela como resultado separado porque:
- suele llegar después;
- puede venir de otra fuente;
- puede corregirse;
- puede haber otros resultados analíticos futuros.

En V1 el principal es:
- `yield_percentage`.

La métrica destacada de campaña será la media ponderada por kilos cuando los datos sean semánticamente comparables.

## 10. Labores / diario de campo

Catálogo V1:
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

La pantalla simple pide solo:
- tipo;
- lugar;
- fecha;
- descripción/datos principales.

Los detalles avanzados se despliegan por necesidad.

Documento: `docs/V1_LABOR_CATALOG.md`.

## 11. Cooperativas y almazaras

La DOP Sierra Mágina publica un universo inicial de 23 almazaras/envasadoras, con naturalezas jurídicas y niveles de digitalización heterogéneos.

Mágina Olivo mantendrá un directorio curado con:
- nombre oficial;
- municipio;
- contacto;
- web;
- servicios/atributos públicos;
- fuente;
- fecha de revisión;
- accesos públicos oficiales detectados.

### En la ficha de una almazara

Separar visualmente:

**Información pública**
- contacto;
- web;
- acceso oficial de socio/cosechero;
- fuentes.

**Mis datos aquí**
- kilos del usuario;
- entregas;
- rendimiento;
- documentos.

La almazara no tiene acceso automático a esos datos.

## 12. Ecosistemas tecnológicos detectados

Investigación actual confirma:
- AM System / ALO Suite / Almazaras.com / MolturALO;
- Proyalma APP / Aicor;
- Toolagro;
- y la posibilidad de otros proveedores.

Se han verificado públicamente al menos dos accesos en `almazaras.com` dentro del universo estudiado:
- S.C.A. San Sebastián;
- Oleozumo (`Acceso Cosecheros`).

Esto refuerza la estrategia de adapters, no el acoplamiento.

## 13. Integración por niveles

### I0 — Manual

Siempre disponible.

### I1 — Documento

Foto/PDF/ticket/albarán.

Guardar original y asociar a registro.

### I2 — Fichero del usuario

CSV/XLSX.

Staging + preview + deduplicación + confirmación.

### I3 — Integración oficial

API/export/webhook autorizado.

### I4 — Adapter de proveedor

```text
Proveedor -> Adapter -> modelo canónico Mágina Olivo
```

Nunca diseñar:

```text
Proveedor -> tablas propietarias en el núcleo
```

Contrato: `docs/IMPORT_DATA_CONTRACT.md`.

## 14. Documentos

Tipos iniciales:
- ticket;
- albarán;
- liquidación;
- factura;
- resultado/análisis;
- documento de labor;
- fotografía;
- otro.

Reglas:
- almacenamiento privado;
- original conservado;
- enlaces a múltiples entidades sin duplicar archivo;
- hash opcional para deduplicación;
- no publicar nombres/rutas internas.

## 15. Automatizaciones V1

Sin IA:
- recalcular kilos;
- recalcular media ponderada;
- detectar entrega sin rendimiento;
- detectar posibles duplicados;
- recordatorios;
- alertas meteorológicas configurables;
- resumen de campaña;
- timeline de actividad;
- sincronización/caché de fuentes públicas según condiciones;
- backups/controles operativos.

Documento detallado: `V1_AUTOMATION_CATALOG.md` o su ubicación vigente en el repositorio.

## 16. Meteorología

Fuente candidata principal confirmada:
- AEMET OpenData.

Asociar previsión a:
- coordenadas de finca/parcela cuando sea viable;
- municipio/localización fallback.

Mágina Olivo no pretende ser una app meteorológica completa.

Debe destacar solo información accionable:
- lluvia;
- mínima/máxima;
- viento;
- helada/riesgos configurados.

## 17. RAIF

Integrar información oficial de situación fitosanitaria del olivar como fuente contextual local.

Reglas:
- mostrar fuente y fecha;
- no presentar un aviso regional como diagnóstico de una parcela;
- no recomendar automáticamente un tratamiento de alto impacto sin base técnica/normativa adecuada.

## 18. SIGPAC

Objetivo:
- asociar/importar parcelas;
- visualizar geometría;
- reducir escritura manual.

La V1 puede empezar con referencia manual y ubicación básica si la integración completa retrasa el piloto.

El modelo ya prepara referencia SIGPAC estructurada.

## 19. CUE / SIEX / REAFA

Es estratégico preparar el modelo, pero no convertir la V1 en un proyecto administrativo gigante antes de validar el producto.

El catálogo de labores deja extensión futura para campos normativos.

La interoperabilidad oficial completa se evaluará como fase posterior según:
- obligación normativa;
- demanda de agricultores;
- requisitos de certificación/conexión;
- coste técnico.

## 20. IA — Mágina IA

No bloquea V1.

Casos prioritarios futuros:
- frase -> borrador de labor;
- ticket -> borrador de entrega;
- preguntas sobre datos propios;
- resumen inteligente.

Reglas:
- confirmación humana;
- minimizar datos enviados;
- proveedor revisado desde privacidad;
- cálculos deterministas fuera de IA;
- alternativa manual.

No necesita una pestaña principal permanente.

## 21. Privacidad y permisos

Aislamiento por explotación (`holding`).

Roles preparados:
- owner;
- admin;
- collaborator;
- viewer.

La UI V1 puede comenzar con owner único, pero el backend no se diseña con supuestos que impidan multiusuario futuro.

Principios:
- datos privados por defecto;
- mínimo privilegio;
- documentos privados;
- datos sintéticos en desarrollo;
- soporte sin acceso global indiscriminado;
- procesos de exportación/baja/incidentes preparados antes de piloto.

Documentos:
- `docs/V1_PERMISSIONS.md`
- `docs/PRIVACY_COMPLIANCE_PLAN.md`

## 22. Accesibilidad

Objetivo de producto: WCAG 2.2 AA.

Además, por contexto de uso en campo:
- botones principales amplios;
- formularios legibles a pleno sol en la medida de lo posible;
- buen contraste;
- no depender de gestos;
- teclado correcto por tipo de campo;
- evitar tablas densas en móvil;
- estados también con texto/icono, no solo color.

## 23. Offline

La PWA debe plantear conectividad irregular.

Prioridad offline:
- nueva labor;
- observación;
- nueva entrega;
- consulta de datos recientes cacheados.

No prometer offline para fuentes externas en tiempo real.

La sincronización debe ser idempotente y evitar duplicados.

## 24. Objetivos UX del piloto

- entrega normal < 30 s;
- labor simple < 45 s;
- añadir rendimiento pendiente < 15 s;
- dashboard responde a situación de campaña en pocos segundos;
- onboarding sin exigir datos administrativos innecesarios.

## 25. Flujo de oro

1. crear cuenta;
2. crear explotación;
3. añadir finca/parcela;
4. registrar labor;
5. registrar entrega;
6. adjuntar ticket;
7. añadir rendimiento después;
8. consultar campaña;
9. consultar almazara;
10. recibir aviso meteorológico;
11. consultar RAIF;
12. exportar datos/resumen.

## 26. Qué NO hacer en V1

- ERP de almazara;
- contabilidad empresarial completa;
- nóminas/cuadrillas avanzadas;
- stock/almacén complejo;
- sensores propios;
- diagnóstico agronómico automático;
- CUE completo antes de validar necesidad;
- scraping de portales privados;
- dependencia obligatoria de IA;
- dependencia obligatoria de una cooperativa.

## 27. Investigación pendiente antes de piloto

La búsqueda web pública ya clasifica 23/23 entidades, pero falta certeza operativa.

Lo siguiente requiere mundo real:
- 2–5 agricultores;
- tickets/albaranes anonimizados;
- confirmar cómo reciben rendimientos;
- comprobar exportaciones CSV/XLSX/PDF;
- contacto con cooperativas/proveedores prioritarios;
- revisión jurídica específica.

## 28. Criterio de éxito V1

La V1 estará lista cuando un agricultor pueda usarla durante una campaña real para:

1. gestionar sus parcelas;
2. registrar labores;
3. registrar entregas rápidamente;
4. añadir rendimientos después;
5. consultar evolución e histórico;
6. guardar/importar documentos;
7. recibir avisos útiles;
8. consultar información local verificada;
9. exportar sus datos;
10. trabajar con privacidad y recuperación verificadas;

sin requerir una API de cooperativa ni una API de IA.
