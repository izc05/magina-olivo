import { useEffect, useState } from 'react';

type Notice = {
  id: number;
  kind: 'offline' | 'success';
  title: string;
  detail: string;
};

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

    const queued = () => show({
      kind: 'offline',
      title: 'Entrega guardada en este móvil',
      detail: 'No se perderá. Mágina Olivo la sincronizará cuando vuelva la conexión.',
    });

    const synced = () => show({
      kind: 'success',
      title: 'Datos sincronizados',
      detail: 'Las operaciones pendientes ya están guardadas en tu cuenta.',
    });

    window.addEventListener('magina:delivery-offline-queued', queued);
    window.addEventListener('magina:sync-complete', synced);
    return () => {
      if (timer !== null) window.clearTimeout(timer);
      window.removeEventListener('magina:delivery-offline-queued', queued);
      window.removeEventListener('magina:sync-complete', synced);
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
