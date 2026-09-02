# Fuentes de datos externas — investigación V1

Fecha de revisión: 2026-09-02

## Objetivo

Identificar fuentes oficiales o técnicamente fiables que permitan enriquecer Mágina Olivo sin depender de IA ni de acuerdos iniciales con cooperativas.

## 1. SIGPAC Andalucía

### Estado

Fuente oficial de la Junta de Andalucía. El SIGPAC tiene carácter de registro público administrativo para identificación de parcelas agrícolas y recintos.

La Junta ofrece:

- Visor SIGPAC Andalucía.
- información gráfica y alfanumérica;
- descarga de información geográfica SIGPAC 2026;
- descargas por provincia;
- descargas por municipio;
- histórico de campañas anteriores.

### Utilidad para Mágina Olivo

Prioridad ALTA.

Posibles usos:

- ayudar al usuario a localizar su explotación;
- asociar provincia/municipio/polígono/parcela/recinto;
- mostrar superficie y geometría cuando técnicamente/licencialmente proceda;
- reducir la entrada manual de datos;
- validar referencias SIGPAC introducidas por el usuario;
- preparar una futura importación de parcelas.

### Regla de arquitectura

No hacer que el identificador interno de una parcela dependa únicamente de SIGPAC. Una parcela de Mágina Olivo tendrá ID propio y las referencias externas serán atributos/versiones enlazadas.

### Fuentes

- https://www.juntadeandalucia.es/organismos/agriculturapescaaguaydesarrollorural/servicios/sigpac/visor.html
- https://www.juntadeandalucia.es/organismos/agriculturapescaaguaydesarrollorural/servicios/sigpac/visor/paginas/sigpac-descarga-informacion-geografica-shapes-provincias.html

## 2. AEMET OpenData

### Estado

AEMET OpenData es una API REST oficial y gratuita para reutilización de datos meteorológicos y climatológicos. Requiere API Key.

### Utilidad para Mágina Olivo

Prioridad ALTA.

Casos de uso:

- predicción meteorológica contextual;
- temperatura máxima/mínima;
- precipitación;
- viento;
- avisos meteorológicos cuando el producto disponible lo permita;
- históricos/climatología en futuras fases.

### Diseño recomendado

Crear `WeatherProvider` interno. La PWA nunca debe llamar directamente a AEMET con la API Key.

Flujo:

PWA -> backend Mágina -> WeatherProvider -> AEMET

El backend normalizará las respuestas a un esquema estable propio.

### Fuente

- https://www.aemet.es/es/datos_abiertos/AEMET_OpenData
- https://opendata.aemet.es/

## 3. RAIF — Red de Alerta e Información Fitosanitaria

### Estado

La Junta de Andalucía publica datos de seguimiento de plagas y enfermedades. El dataset de olivar contiene información histórica 2006-2026 y se actualiza semanalmente. A fecha de revisión, la actualización del olivar publicada es 24/08/2026.

La RAIF dispone además de información geográfica y datos procedentes de estaciones climáticas de campo.

### Utilidad para Mágina Olivo

Prioridad MUY ALTA por diferenciación local.

Casos de uso:

- panel fitosanitario de Jaén/Sierra Mágina;
- evolución de plagas/enfermedades del olivar;
- avisos informativos por municipio/zona;
- histórico de presión fitosanitaria;
- apoyo a decisiones, siempre evitando presentar una predicción automática como prescripción agronómica.

### Regla de producto

Los datos RAIF se mostrarán con fuente, fecha y ámbito. Mágina Olivo no debe afirmar que una parcela concreta está afectada únicamente por inferencia regional.

### Fuente

- https://www.juntadeandalucia.es/datosabiertos/portal/dataset/raif

## 4. Observatorio de Precios y Mercados de Andalucía

### Estado

La Junta publica informes periódicos del mercado de aceite de oliva, incluyendo informes semanales y mensuales.

### Utilidad

Prioridad MEDIA/ALTA.

- sección de mercado del aceite;
- tendencias semanales;
- enlaces a informes oficiales;
- resúmenes propios de magnitudes cuando su reutilización lo permita.

No confundir precios de mercado con el precio/liquidación individual que una cooperativa pagará al socio.

### Fuente

- https://www.juntadeandalucia.es/agriculturaypesca/observatorio/

## 5. DOP Sierra Mágina

### Estado

Fuente institucional de referencia para entidades inscritas, AOVEs protegidos, marcas y características de la DOP.

La ADR Sierra Mágina describe un ámbito aproximado de 70.000 hectáreas de olivar en quince términos municipales. El directorio actual de la web de la DOP lista 23 almazaras/envasadoras inscritas.

### Utilidad

Prioridad MUY ALTA.

- catálogo inicial de entidades;
- identidad territorial;
- enlace a marcas y webs oficiales;
- certificación DOP como atributo verificable;
- noticias públicas seleccionadas.

### Fuentes

- https://sierramagina.org/almazaras-envasadoras/
- https://sierramagina.org/nuestros-aoves/
- https://magina.org/nuestra-comarca/

## 6. REAFA / CUE / SIEX

Esta fuente se trata separadamente en `CUE_SIEX_RESEARCH.md` porque puede convertirse en una línea estratégica propia del producto.

## Priorización técnica

### MVP

1. SIGPAC: referencia/importación asistida, según viabilidad técnica.
2. Meteorología: adapter desacoplado.
3. RAIF: información fitosanitaria oficial.
4. Directorio DOP/cooperativas.

### Después del MVP

5. Observatorio de precios.
6. CUE/REAFA comercial, solo cuando el modelo de explotación esté maduro.
7. Integraciones privadas con cooperativas.

## Principio de fuentes

Toda fuente externa debe registrar:

- proveedor;
- URL/catálogo;
- licencia/condiciones conocidas;
- fecha de última sincronización;
- fecha efectiva del dato;
- ámbito territorial;
- versión/esquema del adapter;
- error de última sincronización si existe.

Nunca mezclar datos externos sin trazabilidad con datos introducidos por el agricultor.
