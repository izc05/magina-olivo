# Revisión visual — Mi Campo / ficha de parcela

**Fecha:** 9 de septiembre de 2026  
**Fuente visual:** `/tmp/codex-clipboard-aff53844-09b7-42e2-a215-fd72d6971904.png`  
**Implementación comprobada:** `https://staging-magina.isivoltpro.com/mi-campo/parcelas/fa8086fe-4ef5-4c02-954d-ef576eb0ab9e?finca=78f1fd4f-9be2-4790-8c82-0100e8235406`

## Estado y evidencia

- Fuente: ficha móvil de parcela en estado informativo.
- Fuente: 941 × 1672 px (captura de teléfono, con barra de estado y navegación del sistema incluidas).
- Implementación: captura real desde el navegador de staging autenticado, a 1186 × 4360 px, ruta de ficha de la parcela **Estacas**.
- El navegador disponible para la comprobación era de escritorio; no permitió fijar un viewport móvil equivalente. Por ello no se ha normalizado una comparación 1:1 de densidad, marco y puntos de ruptura.
- Interacciones comprobadas en staging:
  1. Finca → parcela abre una URL estable de ficha individual.
  2. Volver devuelve a la finca seleccionada.
  3. El centro `+` hereda `Finca salinillas · Parcela Estacas`.
  4. `Registrar labor` abre el cuaderno con `finca` y `parcela` en la URL y con **Estacas** seleccionada.

## Comparación de vista completa

La composición verificada conserva la jerarquía buscada: volver a la finca, imagen agrícola real, nombre y ubicación de parcela, tres métricas esenciales, ficha de datos y accesos a mapa/cuaderno. La versión de escritorio usa una hero de dos columnas deliberadamente para aprovechar anchura adicional; el contenido móvil se mantiene en una columna mediante los puntos de ruptura del componente.

No se puede afirmar fidelidad visual móvil píxel a píxel hasta capturar esa misma ruta en un viewport de teléfono, sin el marco ni las barras del navegador de escritorio.

## Revisión de superficies de fidelidad

- **Tipografía:** jerarquía serif para nombre de parcela y títulos, y sans legible para los datos. El contraste y los pesos se ven correctos en la captura de staging.
- **Ritmo y disposición:** tarjetas, radios y separaciones son consistentes; la navegación fija no tapa los controles de la ficha en la vista revisada.
- **Color:** se conserva la paleta oliva, marfil y verde de la referencia; mapa/cuaderno tienen affordances claros.
- **Imagen:** se usa una fotografía real de olivares del repositorio, sin iconos dibujados a mano ni recursos de sustitución.
- **Contenido:** los datos proceden de la finca y parcela reales seleccionadas, en lugar de copiar números de ejemplo de la referencia.

## Findings

- [P2] Falta una captura comparable de móvil.
  - Ubicación: ficha de parcela en el punto de ruptura móvil.
  - Evidencia: la fuente es 941 × 1672 px; la evidencia de implementación disponible es un navegador de escritorio de 1186 × 4360 px.
  - Impacto: no permite validar con precisión el recorte de hero, saltos de línea, navegación inferior ni la densidad vertical que verá el agricultor en el teléfono.
  - Fix: abrir esta misma URL desde un móvil o un viewport móvil equivalente y repetir la comparación sin el cromo del navegador.

## Historial de iteración

- Se detectó que una entrada directa a una parcela podía resolver temporalmente los datos de otra finca durante una carga concurrente.
- Corrección aplicada en `77791c52297e`: la URL `finca` tiene prioridad inicial y las respuestas de parcelas que ya no pertenecen a la finca activa se descartan.
- Evidencia posterior: la ruta directa de **Estacas** abrió su ficha; volver recuperó **salinillas** y el registro de labor conservó ambos identificadores de contexto.

## Checklist de continuación

1. Revisar esta ficha desde el móvil físico, con una recarga completa de la PWA.
2. Capturar la misma ruta a tamaño móvil y compararla con el referente.
3. Ajustar solo los desajustes visuales móviles que se observen entonces.

## Follow-up polish

- [P3] Cuando se valide en móvil, valorar una hero con mayor protagonismo fotográfico si el recorte vertical deja poco paisaje visible.

final result: blocked
