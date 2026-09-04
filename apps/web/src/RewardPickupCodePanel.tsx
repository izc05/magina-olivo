import { useEffect, useMemo, useState } from 'react';
import { LocalRewardQr } from './LocalRewardQr';
import './reward-local-qr.css';

type RewardPickupCodePanelProps = {
  token: string;
  tokenHint?: string | null;
};

export function RewardPickupCodePanel({ token, tokenHint }: RewardPickupCodePanelProps) {
  const [manualVisible, setManualVisible] = useState(false);
  const safeHint = useMemo(() => tokenHint ?? token.slice(-8), [token, tokenHint]);

  useEffect(() => {
    setManualVisible(false);
  }, [token]);

  return (
    <div className="rewards-token-box">
      <span>Código de recogida</span>
      <LocalRewardQr token={token} />

      <div className="reward-token-hint" aria-label={`Terminación del código ${safeHint}`}>
        <small>Terminación segura</small>
        <code>••••{safeHint}</code>
      </div>

      <button
        type="button"
        className="reward-manual-toggle"
        aria-expanded={manualVisible}
        onClick={() => setManualVisible((current) => !current)}
      >
        {manualVisible ? 'Ocultar código manual' : 'Mostrar código manual'}
      </button>

      {manualVisible ? (
        <div className="reward-manual-code" role="status">
          <code>{token}</code>
          <small>Usa este código solo si el punto de recogida no puede leer el QR.</small>
        </div>
      ) : null}

      <small className="reward-token-security-note">
        El QR se genera en este dispositivo. El token no se envía a ningún servicio externo.
      </small>
    </div>
  );
}
