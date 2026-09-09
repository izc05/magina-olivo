export type PlotShareData = {
  plotName: string;
  farmName?: string;
  municipality?: string;
  latitude?: number;
  longitude?: number;
  taskNotes?: string;
};

export function buildWhatsAppShareUrl(data: PlotShareData): string {
  const parts: string[] = [
    `🌳 *Ficha de Olivar: ${data.plotName}*`,
  ];

  if (data.farmName) parts.push(`🏡 Finca: ${data.farmName}`);
  if (data.municipality) parts.push(`📍 Municipio: ${data.municipality}`);

  if (data.latitude != null && data.longitude != null) {
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${data.latitude},${data.longitude}`;
    parts.push(`🚗 *Cómo llegar (Google Maps):* ${mapsUrl}`);
  }

  if (data.taskNotes) {
    parts.push(`📋 *Indicaciones para la cuadrilla:* ${data.taskNotes}`);
  }

  parts.push('\nEnviado desde Mágina Olivo App');

  const text = parts.join('\n');
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
