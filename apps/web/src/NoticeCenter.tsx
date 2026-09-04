import { useEffect, useState } from 'react';

type NoticeKind = 'offline' | 'success' | 'warning' | 'info';

type Notice = {
  id: number;
  kind: NoticeKind;
  title: string;
  detail: string;
};

type AppNoticeDetail = {
  kind: NoticeKind;
  title: string;
  detail: string;
};

const noticeKinds = new Set<NoticeKind>(['offline', 'success', 'warning', 'info']);

export function NoticeCenter() {
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    let sequence = 0;
    let timer: number | null = null;

    const show = (next: Omit<Notice, 'id'>) => {
      sequence += 1;
      if (timer !== null) window.clearTimeout(timer);
      setNotice({ ...next, id: sequence });
      timer = window.setTimeout(() => setNotice(null), 5200);
    };

    const deliveryQueued = () => show({
      kind: 'offline',
      title: 'Entrega guardada en este móvil',
      detail: 'No se perderá. Mágina Olivo la sincronizará cuando vuelva la conexión.',
    });

    const activityQueued = () => show({
      kind: 'offline',
      title: 'Labor guardada en este móvil',
      detail: 'No se perderá. Se añadirá a la historia de la parcela cuando vuelva la conexión.',
    });

    const synced = () => show({
      kind: 'success',
      title: 'Datos sincronizados',
      detail: 'Las operaciones pendientes ya están guardadas en tu cuenta.',
    });

    const appNotice = (event: Event) => {
      if (!(event instanceof CustomEvent)) return;
      const detail = event.detail as Partial<AppNoticeDetail> | null;
      if (!detail || typeof detail.title !== 'string' || typeof detail.detail !== 'string') return;
      if (!detail.kind || !noticeKinds.has(detail.kind)) return;
      show({ kind: detail.kind, title: detail.title, detail: detail.detail });
    };

    window.addEventListener('magina:delivery-offline-queued', deliveryQueued);
    window.addEventListener('magina:activity-offline-queued', activityQueued);
    window.addEventListener('magina:sync-complete', synced);
    window.addEventListener('magina:notice', appNotice);
    return () => {
      if (timer !== null) window.clearTimeout(timer);
      window.removeEventListener('magina:delivery-offline-queued', deliveryQueued);
      window.removeEventListener('magina:activity-offline-queued', activityQueued);
      window.removeEventListener('magina:sync-complete', synced);
      window.removeEventListener('magina:notice', appNotice);
    };
  }, []);

  if (!notice) return null;

  return (
    <div className={`toast-notice ${notice.kind}`} role="status" aria-live="polite" key={notice.id}>
      <strong>{notice.title}</strong>
      <span>{notice.detail}</span>
      <button type="button" aria-label="Cerrar aviso" onClick={() => setNotice(null)}>×</button>
    </div>
  );
}
