# Mágina Olivo — Discovery & Growth V1

Estado: propuesta preparada para integración posterior a staging
Fecha: 2026-09-04

## 1. Objetivo

Conseguir que Mágina Olivo pueda ser descubierto sin depender de publicidad pagada, empezando por Sierra Mágina y Jaén.

La estrategia combina:

- páginas públicas útiles y rastreables;
- SEO técnico;
- AEO/GEO para buscadores y asistentes con IA;
- contenido basado en datos reales y fuentes verificadas;
- distribución local por WhatsApp, cooperativas, asociaciones y medios;
- mecanismos de compartir dentro del producto;
- medición de adquisición y activación;
- IA como herramienta de apoyo editorial, nunca como fuente de verdad.

El área privada del agricultor no forma parte de la superficie de descubrimiento.

## 2. Principios

1. **Útil antes que promocional.** Las páginas públicas deben resolver preguntas reales del olivarero.
2. **Local primero.** Sierra Mágina -> Jaén -> Andalucía -> España.
3. **Datos verificables.** Precio, tiempo, alertas, noticias y directorio deben conservar fuente y frescura.
4. **No contenido masivo vacío.** No generar cientos de páginas con IA sin valor local real.
5. **Privacidad por defecto.** Fincas, campañas, documentos, cuenta y calendario nunca se indexan.
6. **IA con revisión.** La IA puede redactar borradores, resúmenes y guiones; no inventa datos ni publica automáticamente decisiones agronómicas.
7. **Medir antes de escalar.** Optimizar activación/retención antes de perseguir descargas.
8. **Cero dependencia de una plataforma.** Google, Bing, asistentes de IA, cooperativas, WhatsApp y contenido propio son canales complementarios.

## 3. Superficie pública indexable V1

Rutas canónicas de producto:

- `/magina`
- `/magina/mercado`
- `/magina/tiempo`
- `/magina/campo`
- `/magina/noticias`
- `/magina/directorio`

Aliases de intención de búsqueda iniciales:

- `/precio-aceite-oliva-hoy` -> mercado
- `/precio-aove-jaen` -> mercado
- `/tiempo-sierra-magina` -> tiempo
- `/alertas-olivar-jaen` -> campo/alertas
- `/noticias-olivar-jaen` -> noticias
- `/cooperativas-sierra-magina` -> directorio

Los aliases pueden mantenerse como páginas de entrada diferenciadas o redirigirse más adelante a la ruta canónica cuando exista infraestructura de redirects. En V1 deben renderizar el mismo contenido público y declarar canonical coherente.

## 4. Superficie privada/no indexable

Bloquear del rastreo y excluir de sitemaps:

- `/cuenta`
- `/calendario`
- `/onboarding`
- `/register`
- `/reset-password`
- `/api/`
- cualquier URL futura con datos privados de explotación, campaña, documentos o usuario.

En producción se recomienda complementar `robots.txt` con `X-Robots-Tag: noindex, nofollow` para superficies privadas servidas por fallback SPA.

## 5. SEO/AEO/GEO técnico

La build pública debe producir:

- `robots.txt`;
- `sitemap.xml`;
- HTML pre-renderizado por ruta pública para que el título, descripción, canonical y datos estructurados existan antes de ejecutar React;
- Open Graph y Twitter Card básicos;
- JSON-LD;
- `llms.txt` como ayuda descriptiva adicional, sin asumir que sea un estándar de ranking.

### Crawlers

Permitir rastreo público a buscadores generales y a `OAI-SearchBot`/`ChatGPT-User`, manteniendo las rutas privadas bloqueadas.

No confundir acceso de búsqueda con entrenamiento de modelos: son políticas separadas.

### Datos estructurados

Página principal:

- `SoftwareApplication`;
- `WebSite`.

Páginas temáticas:

- `WebPage`;
- relación `isPartOf` con Mágina Olivo.

No declarar ratings, premios, precios, descargas ni afiliaciones que no estén verificados.

## 6. URL pública y despliegue

Variable recomendada de build:

`PUBLIC_SITE_URL`

Ejemplo temporal para GitHub Pages:

`https://izc05.github.io/magina-olivo`

Cuando exista dominio definitivo, sustituirlo en el pipeline sin cambiar código.

La URL debe incluir el subpath de despliegue si existe y no debe terminar en `/`.

## 7. Consultas objetivo iniciales

Prioridad muy alta:

- precio aceite oliva hoy Jaén;
- precio AOVE Jaén hoy;
- precio aceite Sierra Mágina;
- lluvia Sierra Mágina;
- tiempo olivar Jaén;
- alertas olivar Jaén;
- cooperativas Sierra Mágina;
- almazaras Sierra Mágina;
- noticias olivar Jaén;
- campaña aceituna Jaén.

Prioridad posterior:

- páginas por municipio solo cuando exista contenido suficiente y verificable;
- rendimiento de aceituna;
- histórico de campañas;
- información fitosanitaria explicada con contexto oficial;
- guías operativas basadas en necesidades observadas durante el piloto.

## 8. Contenido útil y reutilizable

Cada dato público relevante puede alimentar varios formatos sin duplicar trabajo:

### Mercado

Fuente verificada -> tarjeta de precio -> página pública -> publicación social -> resumen semanal.

### Tiempo

Previsión verificada -> aviso de lluvia/helada/viento -> tarjeta compartible -> página pública.

### Campo/RAIF

Aviso oficial -> resumen explicativo -> enlace a fuente -> página pública -> distribución local.

### Noticias

Metadatos y resumen propio -> enlace a fuente original -> página pública -> selección semanal.

### Cooperativas

Ficha curada -> directorio -> búsqueda local -> colaboración/contacto.

## 9. IA gratuita/freemium: uso permitido

La IA puede ayudar a:

- proponer títulos y metadescripciones;
- resumir fuentes públicas sin copiar artículos;
- preparar borradores para Facebook/Instagram/WhatsApp;
- convertir un dato verificado en varias piezas editoriales;
- preparar guiones de vídeo corto;
- clasificar feedback del piloto;
- detectar consultas SEO a partir de Search Console;
- crear borradores de outreach.

La IA no debe:

- inventar precios, alertas o predicciones;
- emitir diagnóstico agronómico como autoridad;
- publicar automáticamente información sensible o dudosa;
- copiar contenido protegido de terceros;
- crear páginas masivas de poco valor para manipular ranking.

## 10. Canales de lanzamiento

Orden inicial recomendado:

1. WhatsApp y recomendación directa entre agricultores.
2. Cooperativas y almazaras de Sierra Mágina.
3. Grupos y páginas locales de Facebook.
4. SEO/AEO/GEO de páginas públicas.
5. Instagram y vídeo corto.
6. Asociaciones, DOP, técnicos y medios agro/locales.
7. Directorios y perfiles gratuitos relevantes.
8. Product Hunt/entornos tecnológicos solo como canal secundario de notoriedad, no como canal principal de agricultores.

## 11. Bucle de recomendación dentro de la app

Fase posterior a staging:

- botón `Compartir` en mercado, tiempo y alertas;
- Web Share API en móvil;
- fallback a WhatsApp/enlace copiable;
- tarjetas con marca discreta `Mágina Olivo`;
- enlaces profundos a la página pública correspondiente;
- parámetros UTM para atribución.

Ejemplo conceptual:

`Dato útil -> Compartir por WhatsApp -> receptor abre página pública -> prueba/instala Mágina Olivo -> comparte el siguiente dato útil`.

Evitar incentivos artificiales o spam.

## 12. Primeros 100 usuarios

Objetivo: validar utilidad, no volumen.

Plan:

- piloto inicial ya previsto: 2–5 olivareros;
- ampliar a 20–30 usuarios cercanos tras corregir fricciones P0;
- incorporar 3–5 contactos/cooperativas con grupos pequeños;
- alcanzar 100 usuarios reales mediante invitación y recomendación.

KPIs:

- activación: usuario completa explotación + primera finca/parcela + una acción útil;
- % que vuelve en 7 días;
- entregas/labores registradas por usuario activo;
- % que consulta Mágina pública;
- incidencias críticas por usuario;
- número de usuarios que comparte al menos una tarjeta/enlace.

## 13. De 100 a 1.000

Activar cuando la retención básica sea aceptable:

- páginas públicas indexables maduras;
- Search Console/Bing configurados;
- 2–3 contenidos reutilizables por semana;
- tarjetas compartibles;
- outreach sistemático a cooperativas;
- testimonios con permiso explícito;
- directorio local completo y actualizado;
- enlaces desde entidades/medios locales cuando sean legítimos.

Objetivo: que el crecimiento venga de utilidad local + recomendación + búsqueda, no de anuncios.

## 14. De 1.000 a 10.000

Solo después de demostrar uso en Jaén:

- ampliar cobertura municipal/provincial de forma controlada;
- incorporar nuevas fuentes oficiales por adapters;
- crear landings geográficas con contenido real, no plantillas vacías;
- alianzas con cooperativas/asociaciones;
- relaciones con medios sectoriales;
- programa de embajadores/usuarios avanzados si surge orgánicamente;
- expansión gradual a otras provincias olivareras.

## 15. Plan de 90 días

### Días -30 a 0 — Preparación

- completar staging y piloto técnico;
- publicar infraestructura SEO técnica;
- fijar dominio definitivo si está disponible;
- verificar Search Console;
- verificar Bing Webmaster Tools;
- registrar sitemap;
- comprobar acceso de crawlers;
- revisar títulos/descripciones/canonicals;
- preparar 10–15 piezas evergreen útiles;
- preparar listado de cooperativas/contactos;
- definir analítica mínima y consentimiento cuando aplique.

### Días 1–30 — 100 usuarios

- piloto real controlado;
- corregir onboarding y acciones críticas;
- comenzar 2 publicaciones semanales basadas en datos reales;
- compartir páginas de mercado/tiempo/alertas;
- iniciar contacto con 3–5 cooperativas;
- recoger feedback estructurado;
- conseguir primeros testimonios autorizados.

### Días 31–60 — 300–500 usuarios

- publicar tarjetas compartibles;
- optimizar consultas que ya reciben impresiones;
- ampliar contactos locales;
- generar resumen semanal del olivar de Sierra Mágina;
- probar vídeo corto 1–2 veces por semana;
- conseguir menciones/enlaces locales legítimos.

### Días 61–90 — objetivo 1.000

- duplicar lo que haya mostrado adquisición + retención;
- abandonar canales sin señal;
- mejorar las 10 páginas que más impresiones reciben;
- preparar expansión al resto de Jaén solo si el producto retiene;
- documentar playbook repetible por municipio/provincia.

## 16. KPIs de adquisición

Medir semanalmente:

- impresiones orgánicas;
- clics orgánicos;
- CTR;
- consultas y páginas de entrada;
- usuarios nuevos;
- origen de adquisición;
- conversión página pública -> registro/instalación;
- activación;
- retención D7 y D30;
- compartidos;
- invitaciones/referidos;
- contactos con cooperativas;
- colaboraciones/menciones/backlinks;
- testimonios autorizados.

No usar descargas totales como métrica principal.

## 17. Eventos de analítica propuestos

Sin incluir datos privados de parcelas/documentos:

- `public_page_view`;
- `public_market_view`;
- `public_weather_view`;
- `public_alert_view`;
- `public_news_view`;
- `public_directory_view`;
- `share_started`;
- `share_completed` cuando sea detectable;
- `install_prompt_shown`;
- `install_accepted`;
- `registration_started`;
- `registration_completed`;
- `activation_completed`.

Añadir UTM a campañas manuales de WhatsApp/social cuando sea razonable.

## 18. Outreach a cooperativas

Propuesta de valor inicial, sin venta agresiva:

- ficha pública gratuita y corregible;
- acceso fácil a información oficial;
- canal para que sus socios encuentren datos públicos;
- Mágina Olivo no suplanta a la cooperativa ni accede a datos privados de socios.

Secuencia:

1. verificar ficha;
2. contacto corto;
3. pedir correcciones;
4. ofrecer prueba a pequeño grupo;
5. recoger feedback;
6. pedir difusión solo si aporta valor real.

## 19. Backlinks y menciones sin pagar

Priorizar:

- cooperativas que enlazan a su ficha;
- asociaciones locales;
- ayuntamientos cuando exista utilidad pública clara;
- medios locales y agro mediante datos/visualizaciones útiles;
- recursos técnicos que puedan citar una página específica;
- colaboraciones y entrevistas.

No comprar enlaces ni participar en redes de backlinks artificiales.

## 20. Herramientas gratuitas/freemium

Seleccionar por disponibilidad vigente al ejecutar:

- Google Search Console: rendimiento e indexación;
- Bing Webmaster Tools: rastreo/indexación;
- GitHub Actions: generación y validaciones técnicas;
- herramientas de IA conversacional: borradores/editorial;
- Canva/alternativas: tarjetas visuales;
- CapCut/alternativas: vídeo corto;
- analítica respetuosa con privacidad según decisión de infraestructura.

Los límites/planes gratuitos cambian; verificar antes de convertirlos en dependencia.

## 21. Acciones externas que no puede resolver solo el código

Requieren cuenta/propiedad o decisión de producción:

- elegir dominio definitivo;
- verificar propiedad en Google Search Console;
- verificar Bing Webmaster Tools;
- configurar perfiles sociales;
- contactar cooperativas/medios;
- obtener consentimiento para testimonios;
- decidir herramienta de analítica y consentimiento;
- enviar sitemap cuando el dominio real esté activo.

## 22. Gates antes de activar crecimiento

No lanzar adquisición amplia hasta que:

- staging esté aprobado;
- el piloto confirme que onboarding y flujo de oro son utilizables;
- no existan P0 de privacidad/seguridad;
- páginas públicas indiquen fuentes y frescura;
- el dominio y canonical sean coherentes;
- rutas privadas estén protegidas de indexación;
- exista una forma sencilla de recibir feedback.

## 23. Definición de éxito

Discovery V1 está listo cuando:

1. buscadores pueden rastrear las páginas públicas sin acceder a datos privados;
2. cada página pública tiene metadata y canonical propios;
3. existe sitemap válido;
4. las páginas públicas principales tienen HTML pre-renderizado;
5. las rutas de intención local funcionan;
6. el plan de medición está definido;
7. existe un playbook de primeros 100/1.000 usuarios;
8. existe un backlog explícito para compartir, contenido, cooperativas y analítica;
9. el sistema no depende de IA ni de publicidad para funcionar.
