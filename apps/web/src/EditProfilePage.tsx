import { Camera, UserRound } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { PublicNavigation } from './PublicNavigation';
import { VisualHeader } from './VisualChrome';

type User = { id: string; name?: string | null; email: string };
type Holding = { id: string; municipality: string | null };
type Destination = { id: string; officialName: string; brandName: string | null; municipality: string | null };
type Preferences = {
  preferredCooperativeId: string | null;
  notifyWeather: boolean;
  notifyTasks: boolean;
  notifyPendingYield: boolean;
  weatherRainProbabilityPercentThreshold: number;
  weatherFrostCThreshold: number;
  weatherWindKmhThreshold: number;
};

async function jsonRequest<T>(url: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('accept', 'application/json');
  if (init.body) headers.set('content-type', 'application/json');
  const response = await fetch(url, { ...init, headers, credentials: 'include' });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: { message?: string }; message?: string } | null;
    throw new Error(body?.error?.message || body?.message || `HTTP ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export function EditProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [municipality, setMunicipality] = useState('');
  const [preferredCooperativeId, setPreferredCooperativeId] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      jsonRequest<{ user: User }>('/api/v1/me'),
      jsonRequest<Preferences>('/api/v1/account/preferences'),
      jsonRequest<{ items: Destination[] }>('/api/v1/public/destinations'),
      jsonRequest<{ items: Holding[] }>('/api/v1/holdings'),
    ]).then(([session, preferences, directory, holdings]) => {
      if (cancelled) return;
      setUser(session.user);
      const [firstName = '', ...lastNames] = (session.user.name || '').trim().split(/\s+/);
      setName(firstName);
      setSurname(lastNames.join(' '));
      setPreferredCooperativeId(preferences.preferredCooperativeId);
      setPreferences(preferences);
      setDestinations(directory.items);
      setMunicipality(holdings.items.find((holding) => holding.municipality)?.municipality || 'Sin municipio indicado');
    }).catch((reason) => {
      if (!cancelled) setError(reason instanceof Error ? reason.message : 'No se ha podido cargar el perfil.');
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const initials = useMemo(() => ([name, surname].filter(Boolean).join(' ') || user?.email || 'MO').trim().split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase(), [name, surname, user?.email]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanName = [name, surname].map((part) => part.trim()).filter(Boolean).join(' ');
    if (cleanName.length < 2) {
      setError('Escribe un nombre de al menos 2 caracteres.');
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const currentPreferences = preferences ?? await jsonRequest<Preferences>('/api/v1/account/preferences');
      await Promise.all([
        jsonRequest<{ user: User }>('/api/auth/update-user', { method: 'POST', body: JSON.stringify({ name: cleanName }) }),
        jsonRequest('/api/v1/account/preferences', {
          method: 'PUT',
          body: JSON.stringify({
            preferredCooperativeId,
            notifyWeather: currentPreferences.notifyWeather,
            notifyTasks: currentPreferences.notifyTasks,
            notifyPendingYield: currentPreferences.notifyPendingYield,
            weatherRainProbabilityPercentThreshold: currentPreferences.weatherRainProbabilityPercentThreshold,
            weatherFrostCThreshold: currentPreferences.weatherFrostCThreshold,
            weatherWindKmhThreshold: currentPreferences.weatherWindKmhThreshold,
          }),
        }),
      ]);
      setUser((current) => current ? { ...current, name: cleanName } : current);
      setNotice('Perfil actualizado correctamente.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se ha podido guardar el perfil.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="loading-screen" role="status">Cargando perfil…</div>;

  return <main className="account-shell edit-profile-shell">
    <VisualHeader />
    <PublicNavigation activePath="/mi-magina" />
    <div className="account-page">
      <a className="profile-back-link" href="/mi-magina">← Perfil</a>
      <section>
        <p className="eyebrow page-eyebrow">MI PERFIL</p>
        <h1 className="section-title">Editar perfil</h1>
        <p className="section-copy">Actualiza tus datos personales y de contacto.</p>
      </section>
      {error ? <div className="alert section" role="alert">{error}</div> : null}
      {notice ? <div className="alert success section" role="status">{notice}</div> : null}
      <form className="edit-profile-form" onSubmit={save}>
        <section className="section card edit-profile-photo" aria-label="Foto de perfil">
          <span className="edit-profile-avatar" aria-hidden="true">{initials || <UserRound />}</span>
          <span><strong>Foto de perfil</strong><small>Añade una foto para personalizar tu cuenta.</small></span>
          <button type="button" disabled aria-label="Añadir foto, próximamente"><Camera aria-hidden="true" /></button>
        </section>
        <section className="section edit-profile-fields">
          <div className="field card"><label htmlFor="profile-name">Nombre *</label><input id="profile-name" autoComplete="given-name" minLength={2} maxLength={60} value={name} onChange={(event) => setName(event.target.value)} required /></div>
          <div className="field card"><label htmlFor="profile-surname">Apellidos *</label><input id="profile-surname" autoComplete="family-name" maxLength={80} value={surname} onChange={(event) => setSurname(event.target.value)} required /></div>
          <div className="field card"><label htmlFor="profile-email">Correo electrónico *</label><input id="profile-email" type="email" value={user?.email || ''} readOnly aria-describedby="profile-email-help" /><small id="profile-email-help">El correo de acceso no se cambia desde esta pantalla.</small></div>
          <div className="field card"><label htmlFor="profile-phone">Teléfono</label><input id="profile-phone" type="tel" placeholder="Próximamente" readOnly aria-describedby="profile-phone-help" /><small id="profile-phone-help">El teléfono se habilitará cuando la cuenta admita su verificación.</small></div>
          <div className="field card"><label htmlFor="profile-municipality">Municipio *</label><input id="profile-municipality" value={municipality} readOnly /></div>
          <div className="field card"><label htmlFor="profile-cooperative">Cooperativa favorita</label><select id="profile-cooperative" value={preferredCooperativeId ?? ''} onChange={(event) => setPreferredCooperativeId(event.target.value || null)}><option value="">Ninguna / decidir en cada entrega</option>{destinations.map((item) => <option key={item.id} value={item.id}>{item.brandName || item.officialName}{item.municipality ? ` · ${item.municipality}` : ''}</option>)}</select></div>
        </section>
        <div className="section edit-profile-actions"><button className="primary-button" type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Guardar cambios'}</button><a href="/mi-magina">Cancelar</a></div>
      </form>
    </div>
  </main>;
}
