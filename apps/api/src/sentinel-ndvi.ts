export type NdviStatus = 'low' | 'moderate' | 'good' | 'high';

export type NdviAssessment = {
  ndviValue: number;
  status: NdviStatus;
  label: string;
  description: string;
  wmsTileUrl: string;
};

export function classifyNdvi(value: number): { status: NdviStatus; label: string; description: string } {
  const safe = Math.max(-1, Math.min(1, value));

  if (safe < 0.2) {
    return {
      status: 'low',
      label: 'Vigor bajo',
      description: 'Cubierta vegetal escasa o posible estrés hídrico/nutricional grave en la parcela.',
    };
  }
  if (safe < 0.4) {
    return {
      status: 'moderate',
      label: 'Vigor moderado',
      description: 'Vegetación activa moderada. Recomendable revisar disponibilidad de agua y suelo.',
    };
  }
  if (safe < 0.6) {
    return {
      status: 'good',
      label: 'Vigor bueno',
      description: 'Desarrollo foliar saludable característico de olivar en buen estado vegetativo.',
    };
  }
  return {
    status: 'high',
    label: 'Vigor muy alto',
    description: 'Elevada actividad fotosintética y densidad de fronda.',
  };
}

export function buildCopernicusWmsUrl(bbox: [number, number, number, number]): string {
  const [minLng, minLat, maxLng, maxLat] = bbox;
  return `https://shservices.sentinel-hub.com/ogc/wms/v1?SERVICE=WMS&REQUEST=GetMap&LAYERS=NDVI&STYLES=default&FORMAT=image/png&TRANSPARENT=true&HEIGHT=512&WIDTH=512&BBOX=${minLng},${minLat},${maxLng},${maxLat}`;
}

export function evaluatePlotNdvi(ndviValue: number, bbox: [number, number, number, number]): NdviAssessment {
  const classification = classifyNdvi(ndviValue);
  return {
    ndviValue,
    ...classification,
    wmsTileUrl: buildCopernicusWmsUrl(bbox),
  };
}
