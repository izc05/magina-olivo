# Design QA — municipio, hero y contexto de finca

## Referencia

- Pantallas móviles facilitadas por el usuario para Inicio y Mi Campo.
- Implementación comprobada en `http://127.0.0.1:5177/` en vista móvil.

## Comprobaciones

- P0: ninguno.
- P1: resuelto — la elección inicial de municipio tiene un diálogo dedicado y una acción principal clara.
- P1: resuelto — temperatura, estado y enlace a previsión están integrados sobre la fotografía, sin tarjeta blanca independiente.
- P1: resuelto — la finca activa persiste entre rutas y reinicios mediante almacenamiento local por usuario y explotación.
- P2: resuelto — el municipio puede modificarse después desde un control compacto sobre el hero.
- P2: resuelto — foco, etiquetas y diálogo modal conservan semántica accesible.
- P3: pendiente — incorporar fotografías reales, autorizadas y acreditadas de cada municipio. Hasta disponer de esos archivos se mantiene la fotografía territorial licenciada; el componente ya admite una imagen distinta por municipio.

final result: passed
