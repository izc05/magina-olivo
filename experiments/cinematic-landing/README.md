# Mágina Olivo — landing cinematográfica (DEMOSTRACIÓN)

Demo HTML/CSS/JS vanilla independiente de la app Android. **No modifica** el proyecto principal, su base de datos, la sesión de usuario ni `maginaolivo.com`.

## Qué incluye

- Hero fotográfico con un **loop de movimiento simulado a partir de una imagen fija** (no es un vídeo de Google Flow).
- Puente atmosférico y scrollytelling de **84 fotogramas WebP** de ejemplo, con Canvas a resolución HiDPI, recorte `cover` y precarga gradual según la posición de scroll.
- Tres textos editoriales sincronizados con el desplazamiento, diseño responsive, alternativa de movimiento reducido y degradados de continuidad.
- Favicon SVG, vista previa Open Graph (1200×630), metadatos de sitio y poster del vídeo.
- Script para **reemplazar los archivos demostrativos por medios reales de Flow/Veo** sin rehacer el frontend.
- Botón de acceso **no operativo** a modo de demo: no se solicita ningún dato personal ni se distribuye una APK todavía.

## Cómo verla

1. Descomprime todo el ZIP, manteniendo los directorios y ficheros.
2. Desde esa carpeta, ejecuta `python -m http.server 8000`.
3. Abre `http://localhost:8000/` en el navegador, desplázate y prueba la sección interactiva.

No publiques el ZIP directamente en `maginaolivo.com` sin configurar los enlaces, revisar derechos de imagen y realizar pruebas de rendimiento en dispositivos reales.

## Sustituir imágenes de demo por vídeo real

Genera en Flow dos vídeos: un **loop para el hero** con cámara fija y un **orbital lento** para el canvas. Luego ejecuta:

```bash
bash tools/process_flow_video.sh hero_raw.mp4 video_scroll.mp4
```

El script actualiza el número de fotogramas en `index.html`. **Importante:** la cifra de 30–50 KB por fotograma y el objetivo de vídeo <2 MB no están garantizados; el peso depende de la imagen de origen, resolución y nivel de compresión. Usa `du -sh assets/frames` para medir.

El repositorio puede incluir una **versión de previsualización sin archivos binarios**; si faltan `assets/frames/*.webp`, la página utiliza la imagen estática con movimiento de parallax suave. El ZIP local sí incluye los 84 fotogramas de demostración.

## Publicación definitiva

- Reemplaza `robots noindex,nofollow` por `index,follow` cuando el sitio esté listo.
- Comprueba que `https://maginaolivo.com/assets/og-magina-olivo.jpg` exista públicamente o cambia `og:image` a una URL real de imagen JPEG absoluta.
- Configura el botón final con un enlace **verificado** de descarga (Play Store o release firmado) o un formulario RGPD de acceso anticipado, con privacidad y backend real. No se publican versiones, requisitos Android ni datos de contacto no confirmados.
- Para GitHub Pages en `/magina-olivo/`, adapta `canonical` y rutas de OG a tu dominio final. Un dominio personalizado requiere DNS y configuración de Pages.
- Prueba Chrome Android, Safari iOS, escritorio, `prefers-reduced-motion`, conexión lenta, contraste, carga de datos y uso de memoria.
- Revisa normativa y claims comerciales con fuentes verificadas antes de afirmar conformidad legal automática.

## Organización

```
index.html
styles.css
app.js
assets/
  hero-static.webp
  hero-loop.mp4       # loop ilustrativo, no IA de vídeo
  scroll-static.webp
  og-magina-olivo.jpg
  favicon.svg
  hero-fallback.svg
  scroll-fallback.svg
  frames/frame_0001.webp ... frame_0084.webp
 tools/
  process_flow_video.sh
  create_demo_frames.py
```

**Advertencia:** Los originales de esta demo proceden de imágenes generadas para ilustración, no de grabaciones reales de Sierra Mágina. El objetivo es evaluar arte y arquitectura, no presentar la escena como fotografía documental.