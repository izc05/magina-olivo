# Mágina Olivo — Auditoría Visual V2

## Estado final de la fase

**V2 VISUAL: cerrada para revisión / preparada para PR.**

La rama de trabajo `feat/visual-v2-foundation` consolida la referencia visual oficial de Mágina Olivo sin modificar `main`.

Comparación final contra `main` antes del cierre documental:

- `ahead_by`: 109 commits.
- `behind_by`: 0 commits.
- base y merge-base: `e7cceaac8a994205f8956bb8a1a1f07d175a941a`.
- no existe divergencia acumulada desde `main`.

Última validación visual/técnica previa al cierre documental:

- workflow: `Visual V2 build`.
- run: **38**.
- commit: `7d1e7828dff4e63e1bea7dac8d592c8262c53ae4`.
- conclusión: **success**.
- build TypeScript + Vite: OK.
- responsive smoke: OK.
- navigation layout smoke: OK.
- generación de fotografía aprobada: OK.
- artifact de capturas: OK.

## Objetivo de V2

Conservar una dirección inequívoca de **campo + fotografía + información útil + identidad de Sierra Mágina**, evitando un aspecto de ERP, aplicación administrativa o dashboard financiero genérico.

## Principios fijados

- Logo oficial único.
- Fondo marfil cálido.
- Verde oliva profundo para navegación y acciones principales.
- Verde hoja para estados e información agronómica.
- Dorado aceite solo como acento.
- Iconografía lineal consistente, sin emojis.
- Tarjetas compactas, bordes finos y sombras discretas.
- Fotografía territorial real en los bloques protagonistas.
- Mobile-first; tablet y escritorio son adaptaciones del mismo producto.
- Mapas grandes cuando aportan valor.
- Densidad moderada: información útil de un vistazo, sin convertir la interfaz en un panel técnico.

## Navegación oficial

### Principal

1. Inicio.
2. Mi Campo.
3. Mágina.
4. Descubre.
5. Perfil / Mi Mágina.

La acción contextual `+` queda separada de los destinos de navegación y solo aparece donde aporta valor operativo.

### Mi Campo

- Campo.
- Cuaderno.
- Campaña.
- Gestión.

Dentro de Gestión:

- Costes y rentabilidad.
- Maquinaria.

### Mágina

- Noticias.
- Cooperativas.
- Mercado.
- Descubre.
- Más.

Dentro de Más:

- Mágina Local.
- Comunidad.
- Agenda.
- Alertas.

## Estado por bloque

### Inicio

**Cerrado.**

- hero territorial y meteorología.
- hoy en tu campo.
- accesos rápidos.
- alertas agronómicas.
- mercado simplificado.
- actualidad.
- navegación contextual coherente.

### Mi Campo

**Cerrado visualmente.**

- resumen de finca.
- parcelas.
- vista de mapa/parcela.
- Cuaderno V2.6.
- Campaña.
- Costes y rentabilidad.
- Maquinaria.

El mapa sigue identificado como **vista conceptual** hasta disponer de cartografía/SIG real.

### Cuaderno V2.6

**Aprobado.**

- estado visible también en móvil.
- jerarquía: fecha → labor → parcela/detalle → estado.
- mejor escaneabilidad de anotaciones.
- composición 2 × 2 en escritorio sin perder claridad.

### Mágina / Noticias V2.7

**Aprobado.**

- hero con fotografía territorial aprobada.
- miniaturas con fotografía del mismo sistema de assets.
- jerarquía editorial reforzada.
- cinco pestañas visibles y legibles también en 360 px.
- última corrección conserva la etiqueta completa `Cooperativas` sin reducir el mínimo táctil.

### Cooperativas

**Cerrado visualmente.**

- listado compacto.
- ficha completa.
- información pública/demo separada de una futura integración real.

### Mercado

**Cerrado visualmente.**

- lectura simple.
- gráficos contenidos.
- sin estética financiera dominante.

### Descubre

**Cerrado visualmente.**

- fotografía protagonista.
- rutas y lugares.
- detalle de ruta.
- mantiene la misma identidad que la parte agronómica, con mayor presencia visual.

### Perfil / Mi Mágina V2.8

**Aprobado.**

- hero personal más limpio.
- resumen, guardados, documentos y ajustes.
- iconografía de ajustes consistente.
- filas más legibles.
- estados técnicos accesibles desde ajustes sin convertir Perfil en un panel administrativo.

### Estados técnicos

**Cerrados como referencia visual.**

Incluye:

- login.
- registro.
- recuperación.
- onboarding.
- permisos.
- loading.
- offline.
- vacío.
- error.
- confirmación.

## Fotografía territorial P0

Slots actuales:

- `public/photos/home-sierra-magina.webp`.
- `public/photos/field-olivares-magina.webp`.
- `public/photos/discover-sierra-magina.webp`.
- `public/photos/discover-jimena.webp`.

Los WebP se generan mediante `npm run photos:sync` a partir de fuentes aprobadas de Wikimedia Commons. Los créditos y licencias se conservan en `public/photos/README.md`.

La UI no depende de hotlinking.

## Responsive

La referencia se valida en:

- 360 × 800.
- 390 × 844.
- 430 × 932.
- 768 × 1024.
- 1366 × 768.

Cada ejecución produce **49 capturas reales**: 25 estados principales y 24 estados internos profundos en 360 × 800 y 1366 × 768.

La auditoría manual conjunta de las últimas capturas no ha detectado problemas estructurales nuevos en:

- Inicio.
- Mi Campo.
- Cuaderno.
- Campaña.
- Costes.
- Maquinaria.
- Mágina / Noticias.
- Cooperativas.
- Mercado.
- Descubre.
- Perfil / Ajustes.

## Contratos protegidos por CI

El pipeline comprueba, entre otros puntos:

- 5 destinos principales.
- objetivos táctiles mínimos.
- FAB solo donde corresponde.
- ausencia de overflow horizontal global.
- 4 pestañas de Mi Campo visibles.
- 5 pestañas de Mágina visibles.
- 4 pestañas de Perfil visibles.
- escala controlada del minigráfico de mercado de Inicio.
- navegación móvil fija.
- navegación de escritorio en flujo normal y sin superposición.
- generación del artifact `responsive-captures`.

## Qué queda fuera del cierre visual

Estos puntos no bloquean V2 VISUAL y pertenecen a las siguientes fases de producto/datos:

1. Sustituir mapas conceptuales por cartografía real.
2. Conectar meteorología, alertas, mercado, noticias y cooperativas a fuentes reales.
3. Implementar persistencia real de fincas, parcelas, campaña, cuaderno, documentos y usuario.
4. Diseñar autenticación/backend y modelo de datos definitivo.
5. Separar de forma técnica y permanente datos demo de datos productivos.
6. Añadir nuevos slots fotográficos P1 solo cuando exista una necesidad concreta.

## Regla de autoridad

Desde este cierre, **V2 VISUAL es la referencia oficial de interfaz de Mágina Olivo**.

Cualquier futura pantalla debe reutilizar sus tokens, navegación, densidad, componentes, fotografía, jerarquía y reglas responsive. Una propuesta posterior no debe reabrir la identidad visual salvo decisión explícita del proyecto.

## Decisión de merge

La rama está preparada para revisión mediante Pull Request. **No se debe fusionar a `main` de forma automática.** El merge queda como decisión explícita posterior al cierre/revisión del PR.
