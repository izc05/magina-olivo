# Mágina Olivo — Accessibility Gate V1

Estado: **gate de código aplicado; validación asistiva real pendiente de staging**.

Rama: `feat/mvp-core-v1`

## Objetivo

Asegurar que el recorrido V1 pueda utilizarse sin depender exclusivamente de precisión táctil, color, animación o memoria visual, y dejar una checklist reproducible para la prueba con navegador y lector de pantalla.

Objetivo de referencia: **WCAG 2.2 AA** en los recorridos críticos del piloto.

## Recorrido cubierto

- login y recuperación;
- Inicio;
- navegación inferior;
- Mi Campo;
- selección de finca;
- parcelas;
- cuaderno de labores;
- campaña;
- nueva entrega;
- rendimiento;
- adjunto de ticket;
- sincronización/offline;
- Mi Mágina / logout.

## Cambios aplicados en código

### Navegación

- la sección activa usa `aria-current="page"`;
- el botón central de campaña también expone estado actual;
- el avatar/perfil anuncia estado actual cuando `Mi Mágina` está activa;
- al cambiar de sección se mueve el foco programáticamente al contenido principal;
- el contenido principal puede recibir foco con `tabIndex=-1` sin entrar en el orden normal de tabulación;
- la finca seleccionada usa `aria-pressed` además del cambio visual.

### Foco y teclado

- anillo `:focus-visible` explícito y de alto contraste;
- controles de formularios mantienen además su señal visual de borde/sombra;
- botones rápidos y controles críticos conservan objetivos táctiles amplios;
- rendimiento sube a un objetivo mínimo aproximado de 44 px;
- los botones de texto importantes tienen altura mínima de 44 px;
- el botón para adjuntar ticket posterior es un `<button>` real accionable con teclado;
- el `input file` asociado no queda como único control navegable invisible.

### Estados y anuncios

- loading inicial usa `role=status` y `aria-live=polite`;
- guardado/advertencias de nueva entrega usan regiones vivas;
- subida de ticket expone `aria-busy` y una región de estado;
- errores de upload usan `role=alert`;
- carga de parcelas dependientes expone `aria-busy`.

### Movimiento y contraste del sistema

- `prefers-reduced-motion: reduce` reduce transiciones/animaciones a prácticamente cero;
- existe tratamiento para `forced-colors: active`;
- el estado activo no depende solo de color: navegación usa `aria-current` y finca `aria-pressed`.

## Gate manual obligatorio en staging

No marcar accesibilidad V1 como completamente cerrada hasta ejecutar al menos:

### Teclado

1. Login completo sin ratón.
2. Recorrer la barra inferior con `Tab` y activar cada sección con `Enter`/`Space`.
3. Confirmar que el foco llega al contenido principal después del cambio de sección.
4. Crear finca y parcela solo con teclado.
5. Crear labor y entrega solo con teclado.
6. Seleccionar y subir ticket desde el botón `Adjuntar ticket`.
7. Añadir rendimiento.
8. Alcanzar y usar `Cerrar sesión`.
9. Comprobar que no hay trampas de foco.
10. Comprobar que el foco siempre es visible.

### Lector de pantalla

Probar, como mínimo, una combinación real disponible en piloto:

- Android: TalkBack + Chrome; y/o
- Windows: NVDA + Chrome/Firefox.

Validar:

- encabezados y landmarks en orden comprensible;
- nombre accesible de inputs y botones;
- sección actual de navegación;
- finca activa;
- mensajes de error y éxito;
- estado `Sin conexión` / sincronización;
- `Modo protegido` de cold-start;
- cambios de pantalla sin pérdida de contexto;
- selección de archivo y resultado del upload.

### Zoom / reflow

Comprobar:

- zoom del navegador a 200 %;
- viewport estrecho equivalente a móvil pequeño;
- ausencia de scroll horizontal en el recorrido principal;
- contenido importante no oculto tras navegación fija;
- botones y textos siguen siendo utilizables.

### Preferencias del sistema

Comprobar:

- `prefers-reduced-motion`;
- contraste alto / forced colors donde esté disponible;
- tamaño de fuente aumentado del sistema en Android.

## Criterio de salida

El gate queda **PASS** únicamente si:

- el smoke CI está verde;
- los recorridos P0 se pueden completar por teclado;
- TalkBack o NVDA no encuentran bloqueos críticos;
- no existen controles sin nombre accesible;
- no existe información crítica dependiente únicamente del color;
- no hay pérdida de datos causada por una interacción accesible alternativa;
- los fallos encontrados se registran y corrigen antes del piloto real.

## Fuera de este gate

- certificación formal externa de accesibilidad;
- auditoría exhaustiva de todo contenido futuro de Mágina/Noticias;
- accesibilidad de proveedores externos embebidos;
- validación de mapas complejos, todavía no incorporados al MVP.
