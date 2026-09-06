import { useEffect, useRef, useState } from 'react';
import {
  rewardPartnerApi,
  RewardPartnerApiError,
  type RewardPartnerContext,
  type RewardTokenInspection,
  type RewardValidationResult,
} from './reward-partner-api';

type BarcodeDetectorInstance = {
  detect(source: HTMLVideoElement): Promise<Array<{ rawValue?: string }>>;
};

type BarcodeDetectorConstructor = new (options?: { formats?: string[] }) => BarcodeDetectorInstance;

type WindowWithBarcodeDetector = Window & typeof globalThis & {
  BarcodeDetector?: BarcodeDetectorConstructor;
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function stopStream(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => track.stop());
}

export function RewardValidatorPage() {
  const [partners, setPartners] = useState<RewardPartnerContext[]>([]);
  const [token, setToken] = useState('');
  const [inspection, setInspection] = useState<RewardTokenInspection | null>(null);
  const [result, setResult] = useState<RewardValidationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanTimerRef = useRef<number | null>(null);

  useEffect(() => {
    let active = true;
    void rewardPartnerApi.context()
      .then((items) => {
        if (active) setPartners(items);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        if (reason instanceof RewardPartnerApiError && reason.status === 401) {
          setAuthRequired(true);
          return;
        }
        setError(reason instanceof Error ? reason.message : 'No se han podido cargar tus permisos de cooperativa.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      if (scanTimerRef.current != null) window.clearTimeout(scanTimerRef.current);
      stopStream(streamRef.current);
    };
  }, []);

  function stopCamera() {
    if (scanTimerRef.current != null) {
      window.clearTimeout(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    stopStream(streamRef.current);
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setScanning(false);
  }

  async function inspect(candidate = token) {
    const clean = candidate.trim();
    if (!clean || working) return;

    setWorking(true);
    setError(null);
    setNotice(null);
    setResult(null);
    setInspection(null);

    try {
      const next = await rewardPartnerApi.inspect(clean);
      setToken(clean);
      setInspection(next);
      if (next.status === 'valid') {
        setNotice('Código válido. Revisa los datos y confirma la entrega solo cuando tengas el producto delante.');
      } else if (next.status === 'expired') {
        setNotice('El canje está caducado. No debe entregarse ninguna unidad.');
      } else if (next.status === 'redeemed') {
        setNotice('Este canje ya consta como entregado.');
      } else if (next.status === 'revoked') {
        setNotice('Este código fue sustituido por otro y ya no es válido.');
      } else {
        setNotice('Este código ya no está activo.');
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se ha podido comprobar el código.');
    } finally {
      setWorking(false);
    }
  }

  async function confirmDelivery() {
    if (!inspection || inspection.status !== 'valid' || working) return;

    setWorking(true);
    setError(null);
    setNotice(null);
    try {
      const next = await rewardPartnerApi.validate(token.trim());
      setResult(next);
      setInspection(null);
      if (next.outcome === 'redeemed') {
        setNotice('Entrega confirmada. El código ha quedado consumido y no puede volver a utilizarse.');
      } else {
        setNotice(`El canje había caducado. Se han devuelto ${next.olivesRefunded} 🫒 al usuario y no debe entregarse el producto.`);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se ha podido confirmar la entrega.');
    } finally {
      setWorking(false);
    }
  }

  async function startCamera() {
    if (scanning || working) return;
    setError(null);
    setNotice(null);

    const Detector = (window as WindowWithBarcodeDetector).BarcodeDetector;
    if (!Detector) {
      setNotice('Este navegador no ofrece lectura QR integrada. Puedes introducir el código manualmente.');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setNotice('La cámara no está disponible en este dispositivo. Puedes introducir el código manualmente.');
      return;
    }

    try {
      const detector = new Detector({ formats: ['qr_code'] });
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: 'environment' } },
      });
      streamRef.current = stream;
      setScanning(true);

      const video = videoRef.current;
      if (!video) {
        stopStream(stream);
        streamRef.current = null;
        setScanning(false);
        return;
      }
      video.srcObject = stream;
      await video.play();

      const scan = async () => {
        const currentVideo = videoRef.current;
        if (!streamRef.current || !currentVideo) return;
        try {
          const detected = await detector.detect(currentVideo);
          const rawValue = detected.find((item) => item.rawValue?.trim())?.rawValue?.trim();
          if (rawValue) {
            stopCamera();
            setToken(rawValue);
            void inspect(rawValue);
            return;
          }
        } catch {
          // A frame can fail while the camera is focusing; keep scanning.
        }
        scanTimerRef.current = window.setTimeout(() => void scan(), 350);
      };

      scanTimerRef.current = window.setTimeout(() => void scan(), 350);
    } catch (reason) {
      stopCamera();
      setError(reason instanceof Error ? reason.message : 'No se ha podido abrir la cámara.');
    }
  }

  function reset() {
    stopCamera();
    setToken('');
    setInspection(null);
    setResult(null);
    setNotice(null);
    setError(null);
  }

  if (authRequired) {
    return (
      <main className="reward-validator-page reward-validator-state">
        <section className="reward-validator-state-card">
          <span className="reward-validator-kicker">Mágina Olivo · Cooperativas</span>
          <h1>Acceso privado</h1>
          <p>Inicia sesión con la cuenta autorizada por la cooperativa para validar recompensas.</p>
          <a href="/">Ir a iniciar sesión</a>
        </section>
      </main>
    );
  }

  if (loading) {
    return <main className="reward-validator-page reward-validator-state"><p role="status">Comprobando permisos…</p></main>;
  }

  if (partners.length === 0) {
    return (
      <main className="reward-validator-page reward-validator-state">
        <section className="reward-validator-state-card">
          <span className="reward-validator-kicker">Mágina Olivo · Cooperativas</span>
          <h1>No tienes permisos de validación</h1>
          <p>Esta cuenta no está asociada como validador, gestor o propietario de ninguna cooperativa participante.</p>
          <a href="/recompensas">Volver a recompensas</a>
        </section>
      </main>
    );
  }

  return (
    <main className="reward-validator-page">
      <header className="reward-validator-topbar">
        <a href="/recompensas" aria-label="Volver a recompensas">←</a>
        <div>
          <span className="reward-validator-kicker">Mágina Olivo</span>
          <strong>Validar recompensa</strong>
        </div>
        <span className="reward-validator-role">{partners[0]?.role ?? 'validator'}</span>
      </header>

      <section className="reward-validator-hero">
        <div>
          <span className="reward-validator-kicker">Punto de entrega</span>
          <h1>Escanea, revisa y confirma</h1>
          <p>El escaneo solo comprueba el canje. La botella no se descuenta definitivamente hasta pulsar “Confirmar entrega”.</p>
        </div>
        <div className="reward-validator-partners">
          {partners.map((partner) => (
            <article key={partner.partnerId}>
              <strong>{partner.partnerName}</strong>
              <span>{partner.pickupPoints.length} puntos activos</span>
            </article>
          ))}
        </div>
      </section>

      {notice ? <p className="reward-validator-notice" role="status">{notice}</p> : null}
      {error ? <p className="reward-validator-error" role="alert">{error}</p> : null}

      <section className="reward-validator-grid">
        <article className="reward-validator-scan-card">
          <div className="reward-validator-card-heading">
            <div>
              <span className="reward-validator-kicker">1 · Leer código</span>
              <h2>QR o entrada manual</h2>
            </div>
            <button type="button" className="reward-validator-camera-button" onClick={() => scanning ? stopCamera() : void startCamera()}>
              {scanning ? 'Cerrar cámara' : 'Abrir cámara'}
            </button>
          </div>

          <div className={`reward-validator-camera${scanning ? ' active' : ''}`}>
            <video ref={videoRef} muted playsInline aria-label="Vista de cámara para escanear QR" />
            <div className="reward-validator-reticle" aria-hidden="true" />
            {!scanning ? <span>La cámara se activa solo cuando la solicitas.</span> : null}
          </div>

          <label>
            Código de recogida
            <textarea
              value={token}
              onChange={(event) => {
                setToken(event.target.value);
                setInspection(null);
                setResult(null);
              }}
              placeholder="Pega aquí el código si no usas la cámara"
              rows={3}
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          <button type="button" className="reward-validator-primary" disabled={working || token.trim().length < 16} onClick={() => void inspect()}>
            {working ? 'Comprobando…' : 'Comprobar código'}
          </button>
        </article>

        <article className="reward-validator-check-card">
          <div className="reward-validator-card-heading">
            <div>
              <span className="reward-validator-kicker">2 · Revisar</span>
              <h2>Datos de la entrega</h2>
            </div>
          </div>

          {!inspection && !result ? (
            <div className="reward-validator-empty">
              <span aria-hidden="true">▣</span>
              <p>Escanea o introduce un código para ver la recompensa antes de entregarla.</p>
            </div>
          ) : null}

          {inspection ? (
            <div className={`reward-validator-inspection status-${inspection.status}`}>
              <span className="reward-validator-status">{inspection.status === 'valid' ? '✓ CANJE VÁLIDO' : `CANJE ${inspection.status.toUpperCase()}`}</span>
              <h3>{inspection.rewardTitle}</h3>
              <dl>
                <div><dt>Cooperativa</dt><dd>{inspection.partnerName ?? 'Mágina Olivo'}</dd></div>
                <div><dt>Punto</dt><dd>{inspection.pickupPoint?.name ?? 'Sin punto asignado'}</dd></div>
                {inspection.pickupPoint ? <div><dt>Dirección</dt><dd>{inspection.pickupPoint.address}</dd></div> : null}
                <div><dt>Coste</dt><dd>{inspection.olivesCost} 🫒</dd></div>
                <div><dt>Caduca</dt><dd>{formatDate(inspection.expiresAt)}</dd></div>
              </dl>

              {inspection.status === 'valid' ? (
                <div className="reward-validator-confirm-zone">
                  <strong>Comprueba físicamente la recompensa antes de continuar.</strong>
                  <button type="button" disabled={working} onClick={() => void confirmDelivery()}>
                    {working ? 'Confirmando…' : 'Confirmar entrega'}
                  </button>
                </div>
              ) : (
                <p className="reward-validator-do-not-deliver">NO ENTREGAR PRODUCTO</p>
              )}
            </div>
          ) : null}

          {result ? (
            <div className={`reward-validator-result outcome-${result.outcome}`}>
              <span className="reward-validator-status">{result.outcome === 'redeemed' ? '✓ ENTREGA REGISTRADA' : 'CANJE CADUCADO'}</span>
              <h3>{result.rewardTitle}</h3>
              {result.outcome === 'redeemed' ? (
                <p>Stock actualizado y código consumido. Una segunda validación será rechazada.</p>
              ) : (
                <p>No entregues el producto. Se han devuelto {result.olivesRefunded} 🫒 al usuario.</p>
              )}
              <button type="button" onClick={reset}>Validar otro canje</button>
            </div>
          ) : null}
        </article>
      </section>
    </main>
  );
}
