# Mágina Olivo — Auditoría Visual V2

## Objetivo

Esta auditoría compara la implementación V2 con las primeras referencias visuales que fijaron la identidad de Mágina Olivo. La regla principal es que la aplicación debe sentirse como un producto agrícola premium y cercano, no como un panel administrativo genérico.

La prioridad visual sigue siendo:

**campo + fotografía + información útil + identidad de Sierra Mágina**.

## Principios que quedan fijados

- Mantener siempre el logo oficial de Mágina Olivo.
- Fondo marfil cálido, nunca una interfaz blanca y fría como base dominante.
- Verde oliva profundo para navegación y acciones principales.
- Verde hoja para estados positivos e información agronómica.
- Dorado aceite únicamente como acento.
- Iconografía lineal consistente.
- Tarjetas compactas con radios suaves y sombras discretas.
- Fotografía real como protagonista en Inicio, Mi Campo, Noticias y Descubre.
- Mapas grandes cuando sean relevantes.
- Mobile-first; tablet y escritorio son adaptaciones de la app, no otro producto.
- Reducir el número de elementos simultáneos cuando una pantalla se perciba como dashboard.

## Auditoría global

### Coincidencias fuertes con las referencias iniciales

- La paleta oliva / marfil / dorado está consolidada.
- El logo se reutiliza desde un único recurso de marca.
- La barra inferior con botón central `+` mantiene la identidad inicial.
- Se ha eliminado el uso de emojis como iconografía final.
- Las tarjetas y los estados se han compactado respecto a los primeros prototipos funcionales.
- Mi Campo conserva la lógica visual foto/mapa → datos esenciales → acciones.
- Noticias usa una jerarquía editorial en vez de una tabla/listado administrativo.
- Descubre dispone de una estructura mucho más fotográfica que el resto de módulos.
- Meteorología traduce datos en recomendaciones de trabajo de campo.
- Mercado evita parecer una aplicación financiera.
- Inicio ya abre directamente Cuaderno, Alertas, Mercado y Meteorología sin obligar al usuario a buscar la pestaña manualmente.

### Desviaciones todavía pendientes

1. **Fotografía:** Inicio, Mi Campo, Noticias y Descubre aún usan fondos/gradientes temporales en lugar de las fotografías finales.
2. **Densidad de pestañas:** Mágina y Mi Campo concentran muchas ramas; el scroll horizontal funciona, pero hay que validar visualmente que no se perciba como un panel de software.
3. **Flujos secundarios:** Comunidad, documentos y algunos contenidos editoriales todavía pueden ganar detalle.
4. **Mapa de finca:** sigue siendo una representación esquemática; en la implementación de datos real deberá evolucionar a cartografía útil.
5. **Datos demo:** mercado, campaña, meteorología, rutas, agenda y costes deben distinguir siempre contenido demostrativo de datos reales.

## Auditoría por pantalla

### Inicio

**Estado:** flujo P0 cerrado salvo fotografía.

Ya incluye:
- hero visual + meteorología;
- estado de parcela;
- accesos rápidos;
- precio AOVE compacto;
- alertas;
- noticia destacada;
- barra inferior y `+`;
- acceso directo a Cuaderno;
- acceso directo a Alertas;
- acceso directo a Mercado;
- acceso directo a Meteorología.

Pendiente:
- fotografía oficial del olivar / Sierra Mágina;
- valorar un bloque muy compacto de 1–2 próximas tareas si no aumenta demasiado la densidad.

### Meteorología

**Estado:** estructura cerrada.

Fortalezas:
- recomendación agrícola;
- ventana de trabajo;
- previsión horaria y a cinco días;
- lluvia, viento, humedad y suelo.

Pendiente:
- decidir si el hero mantiene atmósfera gráfica o incorpora una fotografía muy sutil de la finca.

### Mi Campo

**Estado:** funcionalmente amplio, visualmente todavía a revisar.

Ya incluye:
- finca activa;
- parcelas;
- mapa;
- cuaderno;
- campaña;
- costes y rentabilidad;
- maquinaria;
- apertura directa de Cuaderno desde Inicio.

Pendiente:
- fotografía oficial en el hero;
- revisar si cinco pestañas son demasiadas;
- posible agrupación futura `Campo / Cuaderno / Campaña / Gestión`, dejando Costes y Maquinaria dentro de Gestión;
- detalle profundo de maquinaria y gasto solo cuando sea necesario;
- mapa real cuando conectemos datos geográficos.

### Mágina

**Estado:** cobertura alta con los flujos principales cerrados.

Ya incluye:
- noticias;
- detalle editorial;
- cooperativas y ficha detallada;
- mercado;
- Mágina Local;
- Descubre;
- Comunidad;
- Agenda con detalle de evento;
- Alertas;
- apertura directa de Mercado y Alertas desde Inicio.

Pendiente:
- fuente / fecha / trazabilidad de mercado;
- evaluar si ocho pestañas son demasiadas y si conviene un bloque `Más` o accesos secundarios.

### Cooperativas

**Estado:** flujo P0 cerrado en V2.

Ya incluye:
- directorio;
- apertura de ficha completa;
- nombre y municipio;
- estado / horario;
- recepción y servicios;
- referencia de precios de demostración;
- avisos;
- documentos;
- estructura preparada para entregas/pesajes;
- guardar cooperativa;
- volver al directorio.

Pendiente para datos reales:
- integrar fuentes autorizadas;
- mostrar fecha de actualización;
- incorporar entregas personales solo si existe integración futura con cada cooperativa.

### Descubre

**Estado:** flujo de rutas cerrado; prioridad fotográfica máxima.

Ya incluye:
- portada territorial;
- accesos a rutas, miradores, gastronomía y oleoturismo;
- rutas destacadas;
- detalle de ruta;
- distancia, dificultad y duración;
- destacados de la ruta;
- guardado en Mi Mágina;
- aviso explícito cuando los datos son de demostración.

Pendiente:
- hero oficial de Sierra Mágina;
- imágenes de rutas;
- pueblos;
- gastronomía;
- almazara / oleoturismo;
- detalle de pueblo/lugar;
- detalle de experiencia.

### Agenda

**Estado:** flujo P1 esencial cerrado.

Ya incluye:
- listado de eventos;
- fecha y horario;
- municipio;
- categoría;
- detalle del evento;
- descripción;
- contexto de ubicación;
- guardado en Mi Mágina;
- diferenciación de información de demostración.

Pendiente para datos reales:
- fuente oficial;
- enlace del organizador;
- dirección exacta o mapa cuando exista información verificable.

### Comunidad

**Estado:** base V2 correcta.

Ya dispone de:
- publicación;
- filtros;
- respuestas y reacciones;
- moderación visible.

Pendiente:
- flujo de detalle de publicación;
- reportar / moderar;
- diferenciar opinión personal de información agronómica oficial cuando haya datos reales.

### Mi Mágina

**Estado:** sólido.

Ya incluye perfil, guardados, documentos, preferencias, seguridad y acceso a los estados técnicos.

Pendiente:
- detalle de documento;
- detalle de guardado;
- simplificar cualquier opción que no aporte valor en la primera versión pública.

### Estados técnicos

**Estado:** cubiertos en React.

Incluye:
- login;
- registro;
- recuperación;
- onboarding;
- permisos;
- loading;
- offline;
- vacío;
- error;
- confirmación.

No requiere fotografía prioritaria.

## Flujos que deben cerrarse antes de considerar V2 lista para implementación de datos

Prioridad P0:
- ✅ ficha completa de cooperativa;
- ✅ acceso directo desde Inicio a Cuaderno / Alertas / Mercado / Meteorología;
- fotografía oficial en Inicio, Mi Campo, Noticias y Descubre.

Prioridad P1:
- ✅ detalle de ruta;
- ✅ detalle de evento;
- detalle de publicación de Comunidad;
- detalle/preview de documento.

Prioridad P2:
- detalle de maquinaria;
- detalle de gasto;
- guardados enriquecidos;
- más niveles de personalización.

## Slots fotográficos oficiales

### P0
- Home hero.
- Mi Campo / finca hero.
- Noticia destacada.
- Descubre hero.
- Rutas destacadas.

### P1
- Pueblos.
- Gastronomía.
- Almazara / oleoturismo.
- Cooperativas, si existen imágenes autorizadas y útiles.

### Regla de fotografía

No usar imágenes genéricas de olivar si no transmiten Sierra Mágina / Jaén. Deben sentirse territoriales, naturales y cercanas. Evitar stock excesivamente publicitario o imágenes que parezcan de Toscana, Grecia u otras regiones.

No se incorporará una imagen web al repositorio sin comprobar licencia, autoría y condiciones de reutilización. Las fuentes institucionales pueden servir como referencia visual, pero no implican permiso automático de uso.

## Estado de validación técnica

- El proyecto declara `npm run build` como `tsc -b && vite build`.
- La navegación interna está tipada mediante `AppNavigate`, `FieldTarget` y `MaginaTarget`.
- El último commit consultado no tenía checks/estados de CI asociados en GitHub.
- Por tanto, la compilación final debe verificarse antes de considerar la rama lista para merge.

## Orden de cierre V2.1

1. ✅ Cerrar ficha de cooperativa.
2. ✅ Cerrar navegación directa entre Inicio y subsecciones.
3. ✅ Cerrar ruta/evento esenciales.
4. Seleccionar e incorporar fotografía oficial/licenciada.
5. Revisar densidad de pestañas.
6. Auditoría móvil completa.
7. Adaptación tablet/escritorio.
8. Validación de build/CI.
9. Solo entonces valorar merge a `main`.
