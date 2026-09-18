---
name: catastro-maps
description: Usa esta skill para Catastro, SIGPAC, PNOA, selección de parcelas en mapa, geometrías, coordenadas, overlays, importación y visualización cartográfica.
---

# Catastro y mapas

## Objetivo
Permitir localizar, seleccionar e incorporar parcelas con precisión, manteniendo una copia estable de la geometría necesaria para el funcionamiento de la app.

## Reglas
- Catastro es una fuente de incorporación/consulta, no el dueño exclusivo de la parcela de la app.
- Guarda geometría normalizada propia junto con metadatos de procedencia.
- Separa identificadores internos de referencias catastrales.
- Soporta alta manual/GPS cuando una fuente externa no resuelva el caso.
- Evita depender de una sola fuente para capas cartográficas.
- No mezcles coordenadas con CRS distintos sin transformación explícita.
- Registra fuente, fecha y nivel de precisión cuando sea relevante.

## UX cartográfica
- Selección clara y reversible.
- Resalta parcela activa.
- Evita ocultar información crítica con overlays.
- Mantén rendimiento razonable en móvil y con muchas geometrías.
- La vista debe funcionar con información cacheada cuando sea posible.

## Validación
Comprueba geometrías inválidas, multipolígonos, agujeros, parcelas contiguas, zoom alto/bajo y ausencia temporal del servicio externo.
