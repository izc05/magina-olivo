# Mágina Olivo — Auditoría Visual V2

## Objetivo

Esta auditoría compara la implementación V2 con las primeras referencias visuales que fijaron la identidad de Mágina Olivo. La aplicación debe sentirse como un producto agrícola premium, cercano y territorial, no como un panel administrativo genérico.

La prioridad visual sigue siendo:

**campo + fotografía + información útil + identidad de Sierra Mágina**.

## Principios fijados

- Mantener siempre el logo oficial de Mágina Olivo.
- Fondo marfil cálido como base dominante.
- Verde oliva profundo para navegación y acciones principales.
- Verde hoja para estados positivos e información agronómica.
- Dorado aceite solo como acento.
- Iconografía lineal consistente.
- Tarjetas compactas, radios suaves y sombras discretas.
- Fotografía real como protagonista en Inicio, Mi Campo, Noticias y Descubre.
- Mapas grandes cuando aporten valor.
- Mobile-first; tablet y escritorio son adaptaciones del mismo producto.
- Reducir elementos simultáneos cuando una pantalla empiece a sentirse como software empresarial.

## Estado global V2.1

### Cerrado

- Paleta oliva / marfil / dorado consolidada.
- Logo reutilizado desde un único recurso de marca.
- Barra inferior y botón central `+` coherentes en todo el producto.
- Iconografía sin emojis.
- Inicio con accesos directos tipados a Cuaderno, Alertas, Mercado y Meteorología.
- Meteorología detallada con recomendación agrícola y ventanas de trabajo.
- Mi Campo con parcelas, mapa, Cuaderno, Campaña, Costes y Maquinaria.
- Mi Campo simplificado a cuatro ramas principales: `Campo / Cuaderno / Campaña / Gestión`.
- Costes y Maquinaria agrupados dentro de Gestión sin perder accesos directos.
- Noticias con detalle editorial.
- Cooperativas con ficha completa.
- Mercado compacto.
- Descubre con detalle de ruta.
- Agenda con detalle de evento.
- Comunidad con detalle de publicación, respuestas, reportar y distinción entre opinión y avisos oficiales.
- Mi Mágina con preview de documentos, metadatos y acciones básicas.
- Mágina simplificada a `Noticias / Cooperativas / Mercado / Descubre / Más`.
- `Más` agrupa Mágina Local, Comunidad, Agenda y Alertas, manteniendo navegación directa desde otros puntos de la app.
- Estados técnicos completos: login, registro, recuperación, onboarding, permisos, loading, offline, vacío, error y confirmación.

### Pendiente real

1. **Fotografía final:** incorporar los WebP licenciados en Inicio, Mi Campo, Noticias y Descubre.
2. **Auditoría móvil final:** revisar alturas, scroll horizontal, tap targets, textos largos y pantallas de detalle.
3. **Tablet/escritorio:** comprobar que la adaptación no convierta la app en un dashboard ancho.
4. **Build:** verificar `tsc -b && vite build` antes de considerar merge.
5. **Mapa real:** la cartografía de finca sigue siendo esquemática y deberá conectarse a datos geográficos en una fase posterior.
6. **Datos demo:** mercado, campaña, meteorología, rutas, agenda y costes deberán indicar siempre fuente/fecha cuando pasen a datos reales.

## Auditoría por pantalla

### Inicio

**Estado:** P0 cerrado salvo fotografía.

Incluye hero, meteorología, estado de parcela, accesos rápidos, AOVE compacto, alertas, noticia destacada, barra inferior y `+`.

Pendiente:
- fotografía oficial de olivar / Sierra Mágina;
- valorar 1–2 próximas tareas solo si no aumenta la densidad.

### Meteorología

**Estado:** estructura cerrada.

Incluye recomendación agrícola, ventana de trabajo, previsión horaria y varios días, lluvia, viento, humedad y suelo.

Pendiente opcional:
- decidir si mantiene atmósfera gráfica o usa una fotografía muy sutil.

### Mi Campo

**Estado:** estructura y densidad V2.1 cerradas.

Navegación principal:
- Campo
- Cuaderno
- Campaña
- Gestión

Dentro de Gestión:
- Costes y rentabilidad
- Maquinaria

Pendiente:
- fotografía final del hero;
- detalle profundo de máquina/gasto solo si aporta valor;
- mapa real cuando existan datos geográficos.

### Mágina

**Estado:** cobertura alta y densidad V2.1 cerrada.

Navegación principal:
- Noticias
- Cooperativas
- Mercado
- Descubre
- Más

Dentro de Más:
- Mágina Local
- Comunidad
- Agenda
- Alertas

Los destinos internos `local`, `community`, `agenda` y `alertas` siguen siendo válidos, por lo que accesos externos abren directamente el contenido correcto.

Pendiente:
- fuente / fecha / trazabilidad real de mercado;
- fotografía final de noticia destacada.

### Cooperativas

**Estado:** P0 cerrado.

Incluye directorio, ficha, municipio, estado/horario, recepción, servicios, referencias demo, avisos, documentos, entregas futuras, guardar y volver.

Pendiente para datos reales:
- fuentes autorizadas;
- fecha de actualización;
- entregas personales solo con integración real.

### Descubre

**Estado:** flujo de rutas cerrado; prioridad fotográfica máxima.

Incluye portada territorial, accesos, rutas destacadas, detalle, distancia, dificultad, duración, destacados y guardado.

Pendiente:
- hero real de Sierra Mágina;
- fotografías de rutas;
- pueblos;
- gastronomía;
- almazara / oleoturismo;
- detalle de pueblo o experiencia en una fase posterior.

### Agenda

**Estado:** P1 cerrado.

Incluye listado, fecha, horario, municipio, categoría, detalle, descripción, contexto de ubicación y guardado.

### Comunidad

**Estado:** P1 cerrado.

Incluye feed, filtros, publicación, reacciones, apertura de detalle, respuestas, reportar y bloque de seguridad que diferencia experiencia personal de información oficial.

### Mi Mágina / Documentos

**Estado:** P1 cerrado.

Incluye perfil, guardados, documentos, preferencias, seguridad y estados técnicos. Los documentos ya abren preview con fecha, tamaño, origen, descarga y compartir como acciones de interfaz.

Pendiente:
- detalle enriquecido de guardados si se considera necesario para V2.2.

## Fotografía oficial

### Slots P0 preparados

- `public/photos/home-sierra-magina.webp`
- `public/photos/field-olivares-magina.webp`
- `public/photos/discover-sierra-magina.webp`
- `public/photos/discover-jimena.webp`

Los estilos ya contemplan fallback gráfico para que la preview no se rompa mientras los binarios definitivos no estén dentro del repositorio.

### Regla

No usar imágenes genéricas de olivar si no transmiten Sierra Mágina / Jaén. No incorporar una imagen web al repositorio sin comprobar licencia, autoría y condiciones de reutilización.

La selección inicial documentada prioriza material real de Sierra Mágina con licencias Creative Commons reutilizables y atribución registrada en `PHOTO_DIRECTION_V1.md` / `public/photos/README.md`.

## Validación técnica

- `npm run build` está definido como `tsc -b && vite build`.
- La navegación interna usa `AppNavigate`, `FieldTarget` y `MaginaTarget`.
- La reorganización visual de Mi Campo y Mágina conserva esos destinos tipados.
- En la última consulta disponible no había checks de CI asociados al commit consultado.
- No considerar la rama lista para merge hasta verificar build real.

## Orden de cierre V2.1

1. ✅ Ficha completa de cooperativa.
2. ✅ Navegación directa entre Inicio y subsecciones.
3. ✅ Detalle de ruta y evento.
4. ✅ Detalle de Comunidad y preview de documentos.
5. ✅ Simplificación de densidad en Mi Campo y Mágina.
6. Incorporar fotografía oficial/licenciada.
7. Auditoría móvil completa.
8. Adaptación tablet/escritorio.
9. Validación de build/CI.
10. Solo entonces valorar merge a `main`.
