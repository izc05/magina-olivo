# Mágina Olivo — Search Intent Map V1

Fecha: 2026-09-04
Estado: preparado; activar después de staging/piloto técnico

## Objetivo

Posicionar Mágina Olivo como referencia digital útil para el olivar de Sierra Mágina y Jaén, priorizando consultas reales del agricultor y evitando páginas creadas solo para captar tráfico.

La expansión geográfica será progresiva:

1. Sierra Mágina;
2. provincia de Jaén;
3. Andalucía;
4. resto de España únicamente cuando existan datos y utilidad suficientes.

## 1. Clústeres prioritarios

### A. Mercado del aceite

Intenciones principales:

- precio aceite de oliva hoy;
- precio aceite hoy Jaén;
- precio AOVE Jaén;
- precio aceite virgen Jaén;
- precio lampante Jaén;
- evolución precio aceite de oliva;
- mercado aceite de oliva Jaén.

Página principal:

`/magina/mercado`

Entradas de intención permitidas:

- `/precio-aceite-oliva-hoy`;
- `/precio-aove-jaen`.

Regla: no crear una URL nueva por cada sinónimo mientras todas respondan a la misma información. Los alias deben consolidar autoridad en la página canónica.

### B. Tiempo y lluvia

Intenciones principales:

- tiempo Sierra Mágina;
- lluvia Sierra Mágina;
- lluvia Jaén olivar;
- previsión olivar Jaén;
- tiempo para recoger aceituna;
- previsión AEMET Sierra Mágina.

Página principal:

`/magina/tiempo`

Entrada de intención:

`/tiempo-sierra-magina`

Regla: la previsión siempre debe mostrar municipio o ámbito, fuente y frescura. No convertir una previsión en una recomendación agronómica automática.

### C. Campo y alertas

Intenciones principales:

- alertas olivar Jaén;
- RAIF olivar Jaén;
- avisos fitosanitarios olivo Jaén;
- plagas olivo Jaén;
- estado fitosanitario olivar Sierra Mágina.

Página principal:

`/magina/campo`

Entrada de intención:

`/alertas-olivar-jaen`

Regla: RAIF y otras fuentes oficiales se usan como contexto regional. Nunca presentar una alerta regional como diagnóstico de una parcela concreta.

### D. Noticias

Intenciones principales:

- noticias olivar Jaén;
- noticias aceite de oliva Jaén;
- actualidad olivar Sierra Mágina;
- campaña aceituna Jaén;
- noticias cooperativas aceite Jaén.

Página principal:

`/magina/noticias`

Entrada de intención:

`/noticias-olivar-jaen`

Regla: resumen propio, fecha y enlace a la fuente original. No replicar artículos completos.

### E. Cooperativas y almazaras

Intenciones principales:

- cooperativas Sierra Mágina;
- cooperativas aceite Jaén;
- almazaras Sierra Mágina;
- cooperativa aceite Mancha Real;
- cooperativa aceite Bedmar;
- cooperativa aceite Jódar;
- cooperativa aceite Huelma.

Página principal:

`/magina/directorio`

Entrada de intención:

`/cooperativas-sierra-magina`

Regla: priorizar fichas verificables con enlace al canal oficial de la entidad.

## 2. Consultas de segunda fase

Solo desarrollar cuando la app ya tenga señales reales de uso y contenido suficiente:

- rendimiento aceituna Jaén;
- campaña aceituna 2026/2027 Jaén;
- cuándo tratar el olivo;
- poda del olivo Jaén;
- abonado del olivo;
- cuaderno de campo olivar;
- gestión de parcelas olivar;
- app para olivareros;
- aplicación para controlar cosecha de aceituna.

Estas consultas deben resolverse mediante guías útiles o funciones reales de la app, no mediante textos generados en masa.

## 3. Gate para páginas por municipio

No crear `/municipios/<pueblo>` hasta que el municipio tenga al menos **dos fuentes de utilidad local real** y una razón para que la página sea diferente de las demás.

Se consideran señales válidas:

- previsión meteorológica municipal operativa;
- una o más cooperativas/almazaras verificadas;
- alertas o información pública con ámbito local identificable;
- contenido de campaña específico y verificable;
- información institucional relevante para el olivar;
- demanda medida en Search Console o uso interno.

Una página municipal válida debe incluir como mínimo:

1. nombre y contexto geográfico;
2. información pública local vigente;
3. fuente y fecha de revisión;
4. enlaces a cooperativas/almazaras si existen;
5. acceso a tiempo/mercado/alertas relacionados;
6. texto propio y útil, no una plantilla con el nombre del pueblo sustituido.

Municipios candidatos iniciales, solo cuando cumplan el gate:

- Mancha Real;
- Bedmar y Garcíez;
- Jódar;
- Huelma;
- Torres;
- Cambil;
- Bélmez de la Moraleda;
- Albanchez de Mágina;
- Campillo de Arenas;
- Cabra del Santo Cristo;
- La Guardia de Jaén.

## 4. Entidades que debemos reforzar semánticamente

En títulos, contenido útil y datos estructurados, cuando sea relevante y verdadero:

- Mágina Olivo;
- Sierra Mágina;
- Jaén;
- Andalucía;
- olivar;
- aceite de oliva;
- aceite de oliva virgen extra (AOVE);
- aceite de oliva virgen;
- lampante;
- AEMET;
- RAIF;
- cooperativas;
- almazaras;
- campaña de aceituna.

No repetir términos de forma artificial. Deben aparecer porque ayudan a describir el contenido.

## 5. Qué debe responder cada página pública

### `/magina/mercado`

En menos de diez segundos un visitante debería entender:

- qué mercado está viendo;
- qué categorías aparecen;
- cuándo se actualizó;
- de dónde procede la información;
- que no es su liquidación privada de cooperativa.

### `/magina/tiempo`

Debe quedar claro:

- municipio o zona;
- horizonte temporal;
- lluvia/temperatura/viento cuando exista;
- fuente;
- frescura;
- si el dato es live, cache o degradado.

### `/magina/campo`

Debe quedar claro:

- organismo/fuente;
- ámbito territorial;
- fecha;
- tipo de aviso;
- que no es diagnóstico automático de parcela.

### `/magina/noticias`

Debe quedar claro:

- qué ocurrió;
- cuándo;
- por qué interesa al olivarero;
- qué medio u organismo lo publicó;
- enlace original.

### `/magina/directorio`

Debe quedar claro:

- nombre de la entidad;
- municipio;
- tipo de entidad;
- procedencia/revisión;
- canal oficial disponible.

## 6. Señales de autoridad local

Prioridad alta:

- ficha revisada por la propia cooperativa;
- enlace legítimo desde cooperativa/asociación/ayuntamiento/medio;
- fuente oficial claramente citada;
- contenido actualizado de forma consistente;
- usuarios locales que comparten páginas públicas;
- búsquedas de marca `Mágina Olivo` crecientes.

Prioridad baja o nula:

- directorios genéricos de enlaces;
- intercambio masivo de backlinks;
- comentarios automatizados;
- páginas clonadas por pueblo;
- artículos largos sin dato ni utilidad local.

## 7. Medición de descubrimiento por IA

Separar al menos:

- tráfico Google orgánico;
- Bing orgánico;
- referencias `chatgpt.com`;
- tráfico de WhatsApp y redes mediante UTM propias;
- visitas directas a páginas públicas;
- registro/instalación posterior.

ChatGPT Search añade automáticamente `utm_source=chatgpt.com` a sus referencias; no duplicar este parámetro manualmente en nuestras URLs públicas.

Métricas a revisar semanalmente:

- consultas que generan impresiones;
- páginas que reciben clics;
- CTR por clúster;
- visitas procedentes de ChatGPT;
- compartidos;
- conversión a registro;
- activación y retorno D7/D30.

## 8. Criterio de expansión

No ampliar geografía porque aumenten las visitas. Ampliar cuando coincidan:

- información fiable para la nueva zona;
- demanda observable;
- capacidad de mantener frescura;
- al menos un canal local de distribución o colaboración;
- retención razonable en la zona anterior.

El objetivo no es tener miles de URLs: es que cuando alguien pregunte por el olivar de Sierra Mágina o Jaén encuentre una respuesta realmente útil en Mágina Olivo.
