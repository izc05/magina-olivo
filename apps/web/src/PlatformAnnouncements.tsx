import { useEffect, useMemo, useState } from 'react';

type PlatformAnnouncement = {
  id: string;
  title: string;
  body: string;
  severity: 'info' | 'notice' | 'warning' | 'urgent';
  startsAt: string | null;
  endsAt: string | null;
  source: string;
  officialWarning: false;
};

async function fetchAnnouncements(): Promise<PlatformAnnouncement[]> {
  const account = await fetch('/api/v1/account/announcements', {
    credentials: 'include',
    headers: { accept: 'application/json' },
  });
  if (account.ok) {
    const body = await account.json() as { items?: PlatformAnnouncement[] };
    return body.items ?? [];
  }

  const publicResponse = await fetch('/api/v1/public/announcements', {
    headers: { accept: 'application/json' },
  });
  if (!publicResponse.ok) return [];
  const body = await publicResponse.json() as { items?: PlatformAnnouncement[] };
  return body.items ?? [];
}

export function PlatformAnnouncements() {
  const [items, setItems] = useState<PlatformAnnouncement[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    let active = true;
    void fetchAnnouncements()
      .then((next) => { if (active) setItems(next); })
      .catch(() => { if (active) setItems([]); });
    return () => { active = false; };
  }, []);

  const visible = useMemo(() => items.filter((item) => !dismissed.has(item.id)), [items, dismissed]);
  if (!visible.length) return null;

  return (
    <div className="platform-announcement-stack" aria-label="Avisos de Mágina Olivo">
      {visible.slice(0, 3).map((item) => (
        <aside key={item.id} className={`platform-announcement severity-${item.severity}`} role={item.severity === 'urgent' ? 'alert' : 'status'}>
          <div className="platform-announcement-copy">
            <span className="platform-announcement-source">Mágina Olivo · Aviso de la plataforma</span>
            <strong>{item.title}</strong>
            <p>{item.body}</p>
          </div>
          <button
            type="button"
            aria-label={`Cerrar aviso ${item.title}`}
            onClick={() => setDismissed((current) => new Set([...current, item.id]))}
          >×</button>
        </aside>
      ))}
    </div>
  );
}
