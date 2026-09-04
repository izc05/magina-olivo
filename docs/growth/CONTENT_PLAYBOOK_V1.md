# Mágina Olivo — Content & Outreach Playbook V1

Fecha: 2026-09-04
Estado: preparado; activar después de staging/piloto técnico

## 1. Regla editorial

Mágina Olivo publica utilidad local, no contenido por volumen.

Cada pieza debe responder al menos una de estas preguntas:

- ¿Qué está pasando con el precio del aceite?
- ¿Qué tiempo relevante viene para mi olivar?
- ¿Hay una alerta oficial que deba conocer?
- ¿Qué noticia local/sectorial merece atención?
- ¿Dónde encuentro una cooperativa o almazara verificada?
- ¿Qué dato de campaña puedo entender mejor?

Toda cifra variable debe llevar fuente y fecha/frescura cuando aplique.

## 2. Flujo de IA seguro

1. El sistema obtiene o selecciona un dato/fuente verificada.
2. Se construye un bloque factual inmutable: cifra, unidad, zona, fecha y fuente.
3. La IA recibe únicamente ese bloque y una instrucción editorial.
4. La IA devuelve un borrador, nunca una nueva cifra.
5. Se valida que el borrador no cambie números, ámbito ni fuente.
6. Publicación manual al principio.

### Prompt base — mercado

> Redacta una pieza breve para agricultores de Sierra Mágina a partir exclusivamente de los datos verificados que aparecen debajo. No inventes cifras, tendencias, causas ni recomendaciones. Explica el dato con lenguaje sencillo. Incluye fecha de actualización y termina invitando a consultar la evolución en Mágina Olivo. Si falta contexto para afirmar algo, dilo expresamente.

### Prompt base — tiempo

> Convierte esta previsión meteorológica verificada en un aviso breve y claro para un olivarero de Sierra Mágina. No hagas recomendaciones fitosanitarias ni agronómicas no respaldadas. Conserva exactamente cantidades, fechas y municipio/zona. Señala que es una previsión y cita la fuente.

### Prompt base — alerta oficial

> Resume esta alerta oficial sin añadir diagnóstico ni tratamiento. Conserva organismo emisor, fecha, zona afectada, nivel/estado y enlace original. Diferencia claramente el resumen de Mágina Olivo de la fuente oficial.

### Prompt base — noticia

> Resume en 60–100 palabras esta noticia utilizando solo los metadatos y hechos facilitados. No copies párrafos del medio, no inventes declaraciones y enlaza a la fuente original. Prioriza por qué puede interesar a un olivarero de Jaén.

## 3. Formatos reutilizables

### Tarjeta Mercado

- encabezado: `Mercado del aceite`;
- fecha de actualización;
- AOVE / Virgen / Lampante cuando la fuente lo soporte;
- tendencia solo si se calcula con datos comparables;
- fuente;
- marca discreta `Mágina Olivo`;
- enlace a `/magina/mercado`.

Texto social ejemplo:

> 🫒 Mercado del aceite · actualización {fecha}\n{dato verificado}\nConsulta la evolución y la fuente en Mágina Olivo.

### Tarjeta Lluvia/Tiempo

- municipio o ámbito;
- horizonte temporal;
- precipitación/temperatura/viento relevante;
- fuente AEMET;
- no convertir previsión en certeza;
- enlace a `/magina/tiempo`.

Texto social ejemplo:

> 🌧️ Previsión para {zona}\n{resumen verificado}\nDatos de AEMET. Consulta el detalle actualizado en Mágina Olivo.

### Tarjeta Campo/Alerta

- organismo;
- tipo de aviso;
- ámbito;
- fecha;
- resumen no prescriptivo;
- enlace a fuente y `/magina/campo`.

### Resumen semanal

Título base:

`El olivar de Sierra Mágina esta semana: mercado, tiempo y avisos`

Estructura:

1. mercado;
2. tiempo;
3. campo/alertas;
4. tres noticias relevantes como máximo;
5. enlace al directorio/servicios cuando sea útil;
6. fuentes al final.

## 4. Calendario editorial inicial de 30 días

No llenar todos los días. Prioridad a señales reales.

### Semana 1

- lunes: presentación de Mágina Olivo y utilidad pública;
- miércoles: tarjeta de mercado;
- viernes: previsión/alerta relevante o, si no existe, explicación de una función real;
- domingo: resumen semanal.

### Semana 2

- martes: cooperativa/municipio del directorio con datos verificados;
- jueves: mercado o tiempo;
- sábado: vídeo corto mostrando una función de la app;
- domingo: resumen semanal.

### Semana 3

- lunes: pregunta frecuente surgida del piloto;
- miércoles: mercado;
- viernes: noticia/alerta relevante;
- domingo: resumen semanal.

### Semana 4

- martes: historia/testimonio solo con autorización;
- jueves: mercado/tiempo;
- sábado: vídeo corto;
- domingo: resumen y análisis de métricas del mes.

## 5. Canales y adaptación

### WhatsApp

Objetivo: utilidad inmediata y recomendación.

- una tarjeta + una frase;
- enlace profundo;
- evitar cadenas, reenvíos masivos y grupos sin permiso;
- CTA: `Consultar actualizado`.

### Facebook

Objetivo: grupos/páginas locales y agricultores.

- 60–140 palabras;
- contexto local;
- una imagen o gráfica;
- responder comentarios con enlaces a fuentes/página concreta.

### Instagram

Objetivo: notoriedad visual.

- tarjeta limpia o vídeo de 15–30 s;
- texto corto;
- evitar convertir cada actualización en Reel si no aporta valor.

### YouTube Shorts / vídeo corto

Tipos:

- “Así ves la lluvia de tu zona en Mágina Olivo”;
- “Dónde consultar el mercado del aceite”;
- “Cómo guardar una finca/parcela”;
- “Qué significa que una fuente aparezca como desactualizada”.

## 6. Contacto con cooperativas

### Primer mensaje

> Hola. Estamos preparando Mágina Olivo, una aplicación centrada inicialmente en el olivar de Sierra Mágina. Hemos creado un directorio público de cooperativas y almazaras a partir de fuentes verificadas y nos gustaría comprobar que vuestra ficha es correcta. No necesitamos datos de socios ni acceso a sistemas internos. Si nos indicáis cualquier corrección, la revisamos. Cuando el piloto esté listo también podemos facilitaros un acceso para que la probéis con un pequeño grupo.

### Segundo contacto si responden bien

> Gracias por revisar la ficha. La idea es que Mágina Olivo reúna información pública útil —tiempo, alertas, noticias, mercado y directorio— y que cada agricultor mantenga sus datos privados de explotación separados. Si os parece útil, cuando terminemos el piloto os enviamos un enlace para que 5–10 socios la prueben y nos digan qué falta.

### Petición de difusión posterior

Solo cuando exista señal de utilidad:

> El grupo de prueba ya ha utilizado Mágina Olivo durante {periodo}. Si consideráis que puede ser útil para otros socios, podéis compartir este enlace público: {url}. No es necesario registrarse para consultar la parte pública.

## 7. Contacto con medios locales/agro

No enviar “hemos lanzado una app” como única noticia.

Ofrecer un dato o recurso:

- evolución visual del mercado;
- resumen de lluvia de Sierra Mágina;
- directorio verificado;
- análisis de qué consultas preocupan al agricultor durante campaña;
- una historia del piloto con usuarios que hayan dado permiso.

Mensaje base:

> Estamos desarrollando Mágina Olivo como herramienta local para el olivar de Sierra Mágina. Además de la gestión privada, hemos preparado páginas públicas con {recurso concreto}. Si os resulta útil para una información, podemos facilitar la metodología, las fuentes y una visualización reutilizable con atribución.

## 8. Backlinks legítimos

Pedir enlaces solo cuando exista una razón clara:

- cooperativa -> su ficha verificada;
- asociación -> directorio/recurso útil;
- ayuntamiento -> recurso local si aporta servicio ciudadano;
- medio -> visualización/dato citado;
- técnico -> guía específica con fuente.

Nunca comprar enlaces ni intercambiar enlaces en masa.

## 9. Testimonios

Solicitar después de uso real.

Preguntas:

1. ¿Qué consultabas antes en varios sitios y ahora encuentras aquí?
2. ¿Qué función te ha resultado más útil?
3. ¿Qué cambiarías?
4. ¿Autorizarías publicar tu frase con nombre/pueblo, solo nombre o de forma anónima?

Guardar el consentimiento junto a la versión exacta del texto autorizado.

## 10. Métricas semanales

Tabla mínima:

| Métrica | Semana actual | Semana anterior | Cambio | Acción |
|---|---:|---:|---:|---|
| Impresiones orgánicas | | | | |
| Clics orgánicos | | | | |
| CTR | | | | |
| Visitas páginas públicas | | | | |
| Registros iniciados | | | | |
| Registros completados | | | | |
| Activaciones | | | | |
| Retención D7 | | | | |
| Compartidos | | | | |
| Contactos cooperativas | | | | |
| Cooperativas colaborando | | | | |
| Menciones/backlinks | | | | |

Regla: no escalar un canal porque genere visitas si no genera activación o retorno.

## 11. Experimentos de crecimiento permitidos

Un experimento cada vez, 1–2 semanas:

- CTA `Abrir Mágina Olivo` vs `Consultar actualizado`;
- tarjeta mercado vs tarjeta lluvia;
- WhatsApp directo vs Facebook local;
- landing general vs landing específica de mercado;
- vídeo corto vs imagen estática.

Registrar hipótesis, fechas, tráfico y resultado.

## 12. Acciones que evitamos

- comprar seguidores;
- bots de comentarios;
- publicar en grupos sin permiso;
- páginas SEO por cada pueblo sin contenido propio suficiente;
- títulos alarmistas de tiempo/plagas;
- presentar contenido generado por IA como información oficial;
- copiar artículos completos;
- inventar testimonios;
- atribuir colaboración a cooperativas que solo aparecen en un directorio público;
- automatizar publicaciones externas sin revisión durante la primera fase.

## 13. Condición para automatizar más

Solo automatizar publicación después de demostrar durante varias semanas que:

- las fuentes son estables;
- la validación de frescura funciona;
- los borradores no alteran hechos;
- existe un mecanismo de revisión/freno;
- el canal acepta automatización y no genera spam.

La automatización ideal primero genera **borradores**, no publicaciones definitivas.
