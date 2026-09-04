import { useEffect, useState } from 'react';
import {
  listCampaignDocuments,
  privateDocumentContentUrl,
  type UploadedDocument,
} from './document-api.ts';

function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`;
  const kb = value / 1024;
  if (kb < 1024) return `${kb.toFixed(kb >= 100 ? 0 : 1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function documentLabel(type: string): string {
  if (type === 'ticket') return 'Ticket';
  if (type === 'delivery_note') return 'Albarán';
  if (type === 'yield_report') return 'Rendimiento';
  if (type === 'invoice') return 'Factura';
  if (type === 'settlement') return 'Liquidación';
  if (type === 'photo') return 'Foto';
  return 'Documento';
}

function deliveryLine(document: UploadedDocument): string {
  const delivery = document.delivery;
  if (!delivery) return 'Documento privado de la campaña';
  const date = delivery.deliveredAt
    ? new Date(delivery.deliveredAt).toLocaleDateString('es-ES')
    : 'Entrega';
  const kilograms = delivery.kilograms ? `${delivery.kilograms} kg` : null;
  const destination = delivery.destination || 'Cooperativa';
  return [date, kilograms, destination].filter(Boolean).join(' · ');
}

function campaignExportUrl(campaignId: string, format: 'csv' | 'json'): string {
  if (import.meta.env.VITE_DEMO_MODE !== 'true') return `/api/v1/campaigns/${campaignId}/export.${format}`;

  if (format === 'csv') {
    const csv = 'fecha,kilos,destino,rendimiento\n24/11/2026,3280,Cooperativa de Huelma,21.8%\n02/12/2026,4120,Cooperativa de Huelma,22.35%\n';
    return `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
  }

  const payload = JSON.stringify({
    demo: true,
    campaignId,
    campaign: 'Campaña 2026/27',
    deliveries: [
      { date: '2026-11-24', kilograms: 3280, destination: 'Cooperativa de Huelma', yieldPercent: 21.8 },
      { date: '2026-12-02', kilograms: 4120, destination: 'Cooperativa de Huelma', yieldPercent: 22.35 },
    ],
  }, null, 2);
  return `data:application/json;charset=utf-8,${encodeURIComponent(payload)}`;
}

export function CampaignDocuments({
  holdingId,
  campaignId,
}: {
  holdingId: string;
  campaignId: string;
  deliveries?: readonly unknown[];
}) {
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setDocuments(await listCampaignDocuments(holdingId, campaignId));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se han podido cargar los documentos privados.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [holdingId, campaignId]);

  useEffect(() => {
    const refresh = () => void load();
    window.addEventListener('magina:document-uploaded', refresh);
    return () => window.removeEventListener('magina:document-uploaded', refresh);
  }, [holdingId, campaignId]);

  return (
    <section className="section campaign-documents" aria-labelledby="campaign-documents-title">
      <div className="section-heading campaign-documents-heading">
        <div>
          <p className="eyebrow page-eyebrow">Archivo privado</p>
          <h2 id="campaign-documents-title" className="section-title">Tickets y documentos</h2>
          <p className="section-copy">Archivos vinculados a las entregas de esta campaña.</p>
        </div>
        <span className="badge gold">{documents.length}</span>
      </div>

      <div className="card card-body" aria-labelledby="campaign-export-title">
        <p className="eyebrow page-eyebrow">Tus datos</p>
        <h3 id="campaign-export-title" className="section-title form-card-title">Exportar campaña</h3>
        <p className="section-copy">Descarga tus entregas, destinos, fincas, parcelas y rendimientos. CSV sirve para hoja de cálculo; JSON conserva la estructura completa.</p>
        <div className="form-actions">
          <a className="text-button" download={`campana-${campaignId}.csv`} href={campaignExportUrl(campaignId, 'csv')}>Descargar CSV</a>
          <a className="text-button" download={`campana-${campaignId}.json`} href={campaignExportUrl(campaignId, 'json')}>Descargar JSON</a>
        </div>
      </div>

      {error ? <div className="alert" role="alert">{error}</div> : null}

      <div className="campaign-document-list" aria-busy={loading}>
        {documents.map((document) => (
          <article className="card campaign-document-row" key={document.id}>
            <div className="campaign-document-icon" aria-hidden="true">▤</div>
            <div className="campaign-document-copy">
              <div className="campaign-document-topline">
                <strong>{document.filename}</strong>
                <span>{documentLabel(document.documentType)}</span>
              </div>
              <p>{deliveryLine(document)}</p>
              <small>{formatBytes(document.sizeBytes)} · {new Date(document.createdAt).toLocaleDateString('es-ES')}</small>
            </div>
            <a className="campaign-document-download" download={document.filename} href={privateDocumentContentUrl(document.id)}>Descargar</a>
          </article>
        ))}

        {!loading && documents.length === 0 ? (
          <div className="card empty-state">
            <strong>Aún no hay documentos</strong>
            Los tickets que adjuntes a una entrega aparecerán aquí automáticamente.
          </div>
        ) : null}

        {loading ? <div className="campaign-documents-loading" role="status">Cargando archivo privado…</div> : null}
      </div>
    </section>
  );
}
