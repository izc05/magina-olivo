import { useEffect, useMemo, useState } from 'react';
import type { Delivery } from './api.ts';
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

export function CampaignDocuments({
  holdingId,
  campaignId,
  deliveries,
}: {
  holdingId: string;
  campaignId: string;
  deliveries: Delivery[];
}) {
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const deliveriesById = useMemo(
    () => new Map(deliveries.map((delivery) => [delivery.id, delivery])),
    [deliveries],
  );

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

      {error ? <div className="alert" role="alert">{error}</div> : null}

      <div className="campaign-document-list" aria-busy={loading}>
        {documents.map((document) => {
          const delivery = document.deliveryId ? deliveriesById.get(document.deliveryId) : undefined;
          return (
            <article className="card campaign-document-row" key={document.id}>
              <div className="campaign-document-icon" aria-hidden="true">▤</div>
              <div className="campaign-document-copy">
                <div className="campaign-document-topline">
                  <strong>{document.filename}</strong>
                  <span>{documentLabel(document.documentType)}</span>
                </div>
                <p>
                  {delivery
                    ? `${new Date(delivery.deliveredAt).toLocaleDateString('es-ES')} · ${delivery.kilograms} kg · ${delivery.customDestination || 'Cooperativa'}`
                    : 'Documento privado de la campaña'}
                </p>
                <small>{formatBytes(document.sizeBytes)} · {new Date(document.createdAt).toLocaleDateString('es-ES')}</small>
              </div>
              <a className="campaign-document-download" href={privateDocumentContentUrl(document.id)}>Descargar</a>
            </article>
          );
        })}

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
