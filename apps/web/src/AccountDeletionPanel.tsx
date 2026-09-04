import { useEffect, useState } from 'react';

type DeletionRequest = {
  id: string;
  status: 'requested' | 'processing' | 'completed' | 'cancelled' | 'failed';
  requestedAt: string;
  confirmedAt: string;
  completedAt: string | null;
  cancelledAt: string | null;
  failedAt: string | null;
  failureCode: string | null;
};

async function jsonRequest<T>(url: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('accept', 'application/json');
  if (init.body) headers.set('content-type', 'application/json');
  const response = await fetch(url, { ...init, headers, credentials: 'include' });
  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const body = (await response.json()) as { error?: { message?: string }; message?: string };
      message = body.error?.message ?? body.message ?? message;
    } catch {
      // Keep generic status for non-JSON errors.
    }
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

function statusLabel(status: DeletionRequest['status']): string {
  switch (status) {
    case 'requested': return 'Solicitud registrada';
    case 'processing': return 'Eliminación en proceso';
    case 'completed': return 'Eliminación completada';
    case 'cancelled': return 'Solicitud cancelada';
    case 'failed': return 'Revisión necesaria';
  }
}

export function AccountDeletionPanel({ email }: { email: string }) {
  const [request, setRequest] = useState<DeletionRequest | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [emailConfirmation, setEmailConfirmation] = useState('');
  const [wordConfirmation, setWordConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void jsonRequest<{ request: DeletionRequest | null }>('/api/v1/account/deletion-request')
      .then((result) => {
        if (!cancelled) setRequest(result.request);
      })
      .catch(() => {
        // Mi Cuenta already covers global load errors. Keep this panel non-blocking.
      });
    return () => { cancelled = true; };
  }, []);

  const hasActiveRequest = request?.status === 'requested' || request?.status === 'processing';
  const confirmationReady =
    emailConfirmation.trim().toLocaleLowerCase('es') === email.trim().toLocaleLowerCase('es') &&
    wordConfirmation.trim().toLocaleUpperCase('es') === 'ELIMINAR';

  async function submitDeletionRequest() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await jsonRequest<{ request: DeletionRequest }>('/api/v1/account/deletion-request', {
        method: 'POST',
        body: JSON.stringify({
          email: emailConfirmation,
          confirmation: wordConfirmation,
        }),
      });
      setRequest(result.request);
      setExpanded(false);
      setEmailConfirmation('');
      setWordConfirmation('');
      setNotice('Solicitud registrada. Tus datos todavía no se consideran eliminados hasta que finalice el proceso seguro de supresión.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se ha podido registrar la solicitud de eliminación.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="section card card-body account-privacy-card">
      <h2 className="section-title account-section-title">Privacidad y control de tus datos</h2>
      <p className="section-copy">
        Consulta cómo tratamos tus datos, revisa las fuentes públicas y usa el canal de privacidad si necesitas ejercer un derecho que no esté automatizado.
      </p>
      <div className="form-actions account-export-actions">
        <a className="secondary-button account-download-link" href="/privacidad">Política de privacidad</a>
        <a className="secondary-button account-download-link" href="/fuentes">Fuentes y metodología</a>
        <a className="secondary-button account-download-link" href="/contacto">Contacto y derechos</a>
      </div>

      <div className="section" style={{ marginBottom: 0 }}>
        <h3 className="list-card-title">Eliminar mi cuenta</h3>
        <p className="section-copy">
          Esta acción inicia un proceso de supresión de la cuenta y de los datos privados asociados. Los documentos y relaciones compartidas se procesarán de forma controlada para evitar borrados parciales o afectar a otros usuarios.
        </p>
        <p className="section-copy">
          Solo se conservará la información mínima que deba mantenerse temporalmente por obligaciones legales o de seguridad, según la política de conservación que se publique antes del lanzamiento.
        </p>

        {request ? (
          <div className="card list-card account-export-status">
            <div className="list-card-main">
              <p className="list-card-title">{statusLabel(request.status)}</p>
              <p className="list-card-meta">Solicitada {new Date(request.requestedAt).toLocaleString('es-ES')}.</p>
              {hasActiveRequest ? <p className="list-card-meta">La solicitud está registrada; la supresión física todavía no se considera completada.</p> : null}
              {request.status === 'completed' && request.completedAt ? <p className="list-card-meta">Completada {new Date(request.completedAt).toLocaleString('es-ES')}.</p> : null}
              {request.status === 'failed' ? <p className="list-card-meta">La solicitud requiere revisión antes de poder finalizarse.</p> : null}
            </div>
            <span className="badge">{statusLabel(request.status)}</span>
          </div>
        ) : null}

        {notice ? <div className="alert success" role="status">{notice}</div> : null}
        {error ? <div className="alert" role="alert">{error}</div> : null}

        {!hasActiveRequest && request?.status !== 'completed' ? (
          <>
            {!expanded ? (
              <button className="secondary-button" type="button" onClick={() => setExpanded(true)}>
                Solicitar eliminación de mi cuenta
              </button>
            ) : (
              <div className="form-grid" style={{ marginTop: 16 }}>
                <div className="alert" role="note">
                  Por seguridad, confirma tu correo y escribe <strong>ELIMINAR</strong>. Si tu sesión no es reciente, tendrás que volver a iniciar sesión antes de registrar la solicitud.
                </div>
                <div className="field">
                  <label htmlFor="delete-account-email">Correo de la cuenta</label>
                  <input
                    id="delete-account-email"
                    type="email"
                    autoComplete="email"
                    value={emailConfirmation}
                    onChange={(event) => setEmailConfirmation(event.target.value)}
                    placeholder={email}
                  />
                </div>
                <div className="field">
                  <label htmlFor="delete-account-confirmation">Escribe ELIMINAR</label>
                  <input
                    id="delete-account-confirmation"
                    type="text"
                    autoComplete="off"
                    value={wordConfirmation}
                    onChange={(event) => setWordConfirmation(event.target.value)}
                  />
                </div>
                <div className="form-actions">
                  <button type="button" className="text-button" onClick={() => setExpanded(false)} disabled={busy}>Cancelar</button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => void submitDeletionRequest()}
                    disabled={busy || !confirmationReady}
                  >
                    {busy ? 'Registrando…' : 'Confirmar solicitud de eliminación'}
                  </button>
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>
    </section>
  );
}
