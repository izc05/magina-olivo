# Mágina Olivo — Mapa Maestro de Producto

Fecha de consolidación: 2026-09-06  
Estado: guía funcional y de priorización para desarrollo  
Ámbito: producto completo, no solo MVP

> **Lectura obligatoria para Codex antes de proponer o implementar nuevas áreas funcionales.**
>
> Este documento explica hacia dónde debe crecer Mágina Olivo, cómo se agrupan sus bloques y qué prioridad tiene cada uno. No autoriza por sí solo a ampliar alcance durante un gate de staging o una congelación de candidato.

## 0. Regla operativa vigente

Mientras el issue **#7 — P0: Ejecutar staging real antes del piloto** permanezca abierto:

- el candidato oficial de aceptación es `staging/candidate-v11-2026-09-05`;
- SHA congelado: `063767560fe824c3415f200e0314dc5b2e8f4122`;
- V11 no se modifica;
- no se amplían áreas grandes;
- no se inicia piloto con datos reales;
- cualquier fallo bloqueante se corrige fuera del candidato y genera un candidato posterior;
- este mapa sirve para orientar arquitectura, UX y backlog, no para saltarse el gate P0.

Cuando exista contradicción entre una idea futura de este mapa y una regla aprobada del MVP, prevalece la regla vigente del MVP hasta que la documentación se actualice explícitamente.

## 1. Visión de producto

Mágina Olivo debe evolucionar hacia una plataforma móvil/PWA que combine cuatro capas:

1. **Gestión privada del olivar**: campo, parcelas, labores, campaña, entregas, rendimientos y documentos.
2. **Información pública útil**: tiempo, alertas, noticias, mercado, cooperativas y Sierra Mágina.
3. **Ecosistema y recurrencia**: favoritos, eventos, servicios locales, recompensas y participación.
4. **Automatización**: procesos deterministas primero e IA como capa auxiliar, nunca como dependencia del núcleo.

La aplicación debe seguir siendo útil aunque una cooperativa no tenga API, aunque una fuente externa falle temporalmente y aunque el usuario no quiera utilizar IA.

## 2. Navegación móvil objetivo

No mostrar 20 bloques en la barra principal.

Navegación de alto nivel recomendada:

1. **Inicio**
2. **Campo**
3. **Campaña**
4. **Mágina**
5. **Más**

Distribución conceptual:

- `Inicio`: cuadro de mando, alertas, acciones rápidas y resumen.
- `Campo`: explotación, fincas, parcelas, mapa y cuaderno.
- `Campaña`: recolección, entregas, rendimientos, gastos e informes.
- `Mágina`: tiempo, noticias, mercado, cooperativas, eventos y territorio.
- `Más`: documentos, recompensas, favoritos, perfil, contacto, legal y ajustes.

La navegación puede evolucionar, pero debe mantenerse simple, móvil primero y sin convertir cada módulo interno en una pestaña principal.

## 3. Leyenda de prioridad

- **P0 — Gate actual**: estabilidad, staging, seguridad, aceptación y trazabilidad.
- **P1 — Núcleo agrícola**: recorrido principal que debe funcionar impecablemente.
- **P2 — Información útil**: contenido público y alertas que aumentan recurrencia.
- **P3 — Ecosistema local**: territorio, servicios, comunidad y favoritos.
- **P4 — Crecimiento/monetización**: publicidad, recompensas y gamificación.
- **P5 — Automatización avanzada**: IA y publicación/síntesis automatizada con controles.

## 4. Mapa de bloques

### Bloque 1 — Inicio
**Prioridad:** P1  
**Función:** cuadro de mando del usuario.

Debe concentrar:
- estado de campaña;
- kilos recogidos/entregados;
- rendimiento medio;
- alertas importantes;
- tiempo actual y próximo;
- últimas labores;
- precio/mercado destacado;
- noticias/eventos destacados;
- acciones rápidas: entrega, labor, documento, incidencia/tarea.

**Mejoras objetivo:**
- personalización según campaña y parcelas;
- mostrar solo información accionable;
- responder en pocos segundos a “qué ha cambiado y qué tengo que hacer”.

### Bloque 2 — Mi Campo
**Prioridad:** P1  
**Función:** núcleo privado del olivar.

Jerarquía:
`Explotación -> Finca -> Parcela`

Cada parcela puede incluir:
- nombre y superficie;
- referencia SIGPAC;
- ubicación/geometría;
- variedad;
- secano/regadío;
- nº aproximado de olivos;
- fotografías;
- notas;
- documentos;
- histórico/timeline.

**Mejoras objetivo:** ficha agronómica progresiva y línea temporal anual sin hacer pesado el onboarding.

### Bloque 3 — Mapas y localización
**Prioridad:** P1/P2  
**Función:** representar las parcelas y contexto geográfico.

Debe contemplar:
- mapa/satélite;
- límites de parcelas;
- colores por finca;
- posición actual;
- acceso a ficha tocando una parcela;
- meteorología contextual;
- alertas geolocalizadas.

**Futuro:** capas de pendiente, lluvia acumulada, tratamientos, producción histórica y otros datos útiles.

### Bloque 4 — Cuaderno de campo
**Prioridad:** P1  
**Función:** registrar actividad de forma rápida.

Tipos principales:
- tratamiento;
- abonado;
- poda;
- desbroce;
- laboreo;
- riego;
- recolección;
- mantenimiento;
- plantación/reposición;
- análisis/muestreo;
- observación;
- otra.

Puede asociar:
- fecha;
- parcela/finca;
- descripción;
- productos/dosis cuando proceda;
- fotografías;
- gastos;
- documentos.

**Objetivo UX:** una labor simple debe registrarse en menos de 45 s; idealmente una actuación habitual en 20–30 s.

**Futuro IA:** voz/foto -> borrador de anotación, siempre revisable.

### Bloque 5 — Campaña / cosecha
**Prioridad:** P1  
**Función:** seguimiento completo por temporada.

Debe incluir:
- campaña 2026/27, 2027/28, etc.;
- recolecciones;
- entregas;
- kilos;
- parcela/finca de origen cuando se conozca;
- cooperativa/almazara;
- ticket/documento;
- rendimiento y otros resultados;
- producción por hectárea;
- comparación entre parcelas y campañas;
- gastos e indicadores de rentabilidad básica.

**Mejora prioritaria:** informe PDF por campaña/parcela con trazabilidad de entregas y resultados.

**Futuro:** OCR de tickets para crear borradores sin teclear datos repetitivos.

### Bloque 6 — Tiempo
**Prioridad:** P2  
**Función:** meteorología orientada al trabajo agrícola, no una app meteorológica genérica.

Mostrar:
- temperatura;
- previsión horaria y varios días;
- lluvia y acumulados;
- humedad;
- viento;
- helada;
- máxima/mínima;
- localización por parcela o municipio fallback.

**Mejora clave:** traducir previsión en avisos accionables: lluvia próxima, helada, viento excesivo, ventana de trabajo, etc., sin presentar la app como autoridad agronómica.

### Bloque 7 — Campo y alertas
**Prioridad:** P2  
**Función:** centro de avisos.

Tipos:
- lluvia;
- helada;
- viento;
- calor;
- riesgos/contexto fitosanitario;
- RAIF;
- tareas y recordatorios;
- incidencias propias;
- campaña.

Niveles recomendados:
- información;
- atención;
- urgente.

**Mejora:** alertas específicas por parcela y preferencias del usuario, evitando ruido.

### Bloque 8 — Noticias
**Prioridad:** P2/P5  
**Función:** actualidad útil y verificable.

Categorías:
- olivar;
- agricultura;
- aceite;
- Sierra Mágina;
- cooperativas;
- ayudas/subvenciones;
- normativa;
- actualidad local relevante.

Cada noticia debe conservar:
- titular;
- resumen propio;
- categoría;
- fecha;
- imagen cuando haya derechos/uso permitido;
- fuente;
- enlace original.

**Automatización futura:** buscar -> filtrar -> deduplicar -> resumir -> clasificar -> revisión/regla de publicación -> publicar.

Nunca copiar artículos completos ni publicar afirmaciones sin fuente.

### Bloque 9 — Aceite y mercado
**Prioridad:** P2  
**Función:** contexto de precios y evolución, separado de la liquidación privada de cada agricultor.

Debe diferenciar cuando la fuente lo permita:
- AOVE;
- virgen;
- lampante;
- otros indicadores relevantes.

Mostrar:
- precio/indicador actual;
- variación;
- evolución diaria/semanal/mensual;
- histórico;
- gráfica clara y móvil;
- fuente y fecha de actualización;
- explicación sencilla del movimiento cuando sea verificable.

### Bloque 10 — Cooperativas y almazaras
**Prioridad:** P1/P2  
**Función:** conectar información pública con los datos privados del usuario sin mezclarlos.

Ficha pública:
- nombre;
- municipio;
- ubicación;
- contacto;
- web;
- horarios/servicios públicos;
- accesos oficiales;
- fuente y revisión.

Área privada “Mis datos aquí”:
- entregas;
- kilos;
- rendimientos;
- documentos asociados.

**Futuro:** reclamación/verificación de ficha por la entidad y publicación controlada de información propia.

### Bloque 11 — Mágina local / servicios
**Prioridad:** P3/P4  
**Función:** directorio útil de servicios del territorio.

Puede incluir:
- talleres;
- maquinaria agrícola;
- servicios agrícolas;
- comercios;
- profesionales;
- gasolineras;
- empleo/anuncios útiles.

**Mejora:** búsqueda por distancia/categoría y fichas verificables.

La promoción de pago debe estar identificada como publicidad y no falsear datos objetivos.

### Bloque 12 — Descubre Sierra Mágina
**Prioridad:** P3  
**Función:** ampliar la utilidad pública y territorial de la plataforma.

Contenido:
- municipios;
- rutas;
- naturaleza;
- monumentos;
- gastronomía;
- oleoturismo;
- artesanía;
- eventos;
- lugares de interés;
- cooperativas visitables.

**Mejora:** fichas visuales, geolocalización y contenido actualizado.

### Bloque 13 — Mi Mágina
**Prioridad:** P3  
**Función:** centro personal de contenido seguido.

Puede reunir:
- municipio favorito;
- cooperativas favoritas;
- noticias guardadas;
- eventos;
- rutas;
- alertas;
- preferencias.

No debe competir con “Mi Campo”: una es capa de contenido/territorio; la otra contiene datos agrícolas privados.

### Bloque 14 — Aceitunas, olivo virtual y recompensas
**Prioridad:** P4  
**Función:** recurrencia y colaboración con entidades locales.

Ideas aprobadas para explorar:
- moneda virtual “aceitunas”;
- entrada diaria;
- misiones;
- rachas;
- logros/niveles;
- olivo virtual;
- minijuego de varear/recoger aceitunas;
- sorteos/canje;
- botellas de aceite u otros premios aportados por cooperativas/colaboradores.

**Antes de implementar:** definir economía, límites, antifraude, términos de promociones, disponibilidad de premios y separación clara entre puntos lúdicos y dinero real.

### Bloque 15 — Publicidad y promoción
**Prioridad:** P4  
**Función:** monetización local no invasiva.

Formatos candidatos:
- ficha patrocinada;
- comercio/cooperativa destacada;
- evento promocionado;
- anuncio local;
- prioridad patrocinada en listados cuando esté claramente indicada.

Debe incluir en administración:
- altas/bajas;
- fechas de campaña;
- ubicación/categoría;
- impresiones/clics cuando proceda;
- estado y facturación futura.

Preferir pocos planes claros antes que múltiples modalidades difíciles de mantener.

### Bloque 16 — Cuenta, perfil y acceso
**Prioridad:** P1  
**Función:** identidad y preferencias.

Principio de acceso:
- información pública navegable sin cuenta cuando no exista motivo de privacidad;
- cuenta obligatoria para datos propios del campo/campaña y funciones personales.

Contemplar:
- email/contraseña;
- recuperación;
- posible acceso Google en fase posterior;
- datos de perfil;
- notificaciones;
- seguridad/sesiones;
- exportación y baja;
- preferencias.

### Bloque 17 — Contacto y legal
**Prioridad:** P1 antes de producción  
**Función:** soporte, confianza y cumplimiento.

Debe incluir:
- contacto/soporte;
- sugerencias y reporte de errores;
- aviso legal;
- privacidad;
- cookies cuando proceda;
- condiciones de uso;
- consentimientos;
- ejercicio de derechos;
- condiciones específicas de promociones/recompensas cuando existan.

Separar consentimiento necesario de comunicaciones comerciales opcionales.

### Bloque 18 — Administración
**Prioridad:** transversal  
**Función:** operar la plataforma sin editar base de datos manualmente.

Áreas:
- usuarios;
- contenido/noticias;
- eventos;
- cooperativas;
- negocios/servicios;
- publicidad;
- alertas;
- precios/mercado;
- contenido territorial;
- recompensas;
- moderación;
- estadísticas;
- configuración;
- auditoría/logs.

La administración debe crecer junto con cada módulo que necesite operación manual.

### Bloque 19 — Mágina IA / automatización
**Prioridad:** P5  
**Función:** ahorrar tiempo y escalar operaciones sin convertir la IA en fuente de verdad.

Casos previstos:
- noticia -> resumen y clasificación;
- detectar/deduplicar eventos;
- generar borrador de avisos;
- explicar datos meteorológicos/mercado con fuente;
- ticket -> borrador de entrega;
- frase/voz -> borrador de labor;
- preguntas sobre datos propios;
- generación de informes/resúmenes.

Reglas:
- cálculos críticos deterministas fuera de IA;
- datos persistidos validados;
- fuentes visibles en contenido público;
- mínima exposición de datos privados;
- automatizaciones sensibles con reglas y permisos explícitos;
- no instalar “ChatGPT” como requisito del servidor: integrar APIs/servicios mediante adapters cuando proceda.

### Bloque 20 — Visibilidad y crecimiento
**Prioridad:** P3/P4  
**Función:** conseguir descubrimiento orgánico de la parte pública.

Preparar:
- SEO técnico;
- sitemap;
- URLs públicas estables;
- metadatos sociales;
- páginas indexables de noticias, pueblos, cooperativas y contenido público;
- compartir por WhatsApp/redes;
- analítica respetuosa con privacidad;
- estructura legible por buscadores y asistentes de IA.

Objetivo: búsquedas como “precio aceite Jaén”, “tiempo Sierra Mágina” o una cooperativa concreta pueden llevar a contenido público útil de Mágina Olivo.

## 5. Orden de trabajo recomendado

### P0 — Ahora
Cerrar el staging real y la aceptación de V11 según #7. Nada de este mapa debe romper ese gate.

### P1 — Núcleo agrícola
`Inicio -> Mi Campo -> Parcela -> Cuaderno -> Campaña -> Entrega -> Rendimiento -> Informe`

Además:
- identidad/recuperación;
- privacidad y permisos;
- documentos;
- administración mínima necesaria;
- offline y accesibilidad del recorrido crítico.

### P2 — Información recurrente
`Tiempo -> Alertas -> Noticias -> Aceite/Mercado -> Cooperativas`

### P3 — Ecosistema
`Mágina Local -> Descubre -> Eventos -> Mi Mágina -> crecimiento orgánico`

### P4 — Monetización y recurrencia
`Publicidad -> aceitunas/recompensas -> olivo/minijuego -> promociones`

### P5 — Automatización avanzada
`Mágina IA -> publicación asistida -> extracción de documentos -> consultas -> resúmenes`

## 6. Recorrido de oro que no debe romperse

1. Usuario crea/accede a su cuenta.
2. Crea explotación.
3. Añade finca/parcela.
4. Registra una labor.
5. Registra una entrega.
6. Adjunta ticket/documento.
7. Añade rendimiento cuando llegue.
8. Consulta resumen de campaña.
9. Consulta sus datos asociados a una almazara.
10. Recibe/consulta información pública útil sin mezclarla con datos privados.
11. Exporta o genera un resumen/informe.

Cualquier gran evolución visual o funcional debe preservar este recorrido y sus reglas de autorización.

## 7. Criterios de diseño comunes

Para todos los bloques:

- móvil primero;
- accesibilidad objetivo WCAG 2.2 AA;
- acciones principales grandes y claras;
- no depender solo del color;
- estados de carga, vacío, error y offline explícitos;
- evitar formularios largos por defecto;
- progresive disclosure para detalles avanzados;
- no mezclar datos públicos con privados;
- fuentes y fechas visibles en información externa;
- modo manual siempre que una integración externa sea opcional;
- rendimiento aceptable en conexiones rurales/irregulares.

## 8. Reglas para Codex

Antes de implementar una tarea:

1. leer `AGENTS.md`;
2. leer este `docs/APP_MASTER_MAP.md`;
3. revisar `MASTER_PLAN.md` para reglas V1;
4. revisar `ARCHITECTURE.md` y documentación específica del módulo;
5. comprobar issues/PRs abiertos que puedan congelar alcance o candidato;
6. determinar la prioridad P0–P5 de la tarea;
7. no implementar un bloque P3/P4/P5 si el trabajo solicitado es P0/P1 salvo instrucción explícita;
8. si una petición cambia alcance, actualizar primero o junto con la documentación correspondiente;
9. conservar adapters en integraciones externas;
10. mantener cálculos de negocio críticos deterministas;
11. añadir tests cuando se modifiquen reglas críticas;
12. no introducir secretos ni datos reales.

## 9. Qué significa “completo”

Un bloque no se considera completo solo porque exista una pantalla.

Debe contemplar, cuando aplique:
- modelo de datos;
- API/servicio;
- autorización;
- estados vacíos/carga/error;
- responsive;
- accesibilidad;
- offline/sincronización si forma parte del recorrido crítico;
- administración/operación;
- fuente y frescura de datos externos;
- tests;
- observabilidad/logs sin secretos;
- documentación;
- criterio de aceptación.

## 10. Relación con documentos existentes

- `AGENTS.md`: reglas obligatorias de trabajo para agentes/Codex.
- `MASTER_PLAN.md`: reglas funcionales consolidadas de V1 y modelo mental del producto.
- `ARCHITECTURE.md`: decisiones técnicas y límites de arquitectura.
- `ROADMAP.md`: fases técnicas/entregables.
- `docs/APP_MASTER_MAP.md`: mapa completo de bloques, prioridades, mejoras y dirección de producto.
- documentación `docs/mvp/*`: autoridad para los gates del MVP/staging cuando corresponda.

Este documento debe actualizarse cuando se apruebe una nueva gran área, cambie la navegación principal o cambie sustancialmente el orden P0–P5.
