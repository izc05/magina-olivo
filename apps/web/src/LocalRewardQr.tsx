import { useMemo } from 'react';
import {
  encodeRewardQr,
  qrMatrixToPath,
  REWARD_QR_MODULE_COUNT,
  REWARD_QR_QUIET_ZONE,
} from './local-qr';

type LocalRewardQrProps = {
  token: string;
  label?: string;
};

export function LocalRewardQr({
  token,
  label = 'Código QR de recogida',
}: LocalRewardQrProps) {
  const path = useMemo(
    () => qrMatrixToPath(encodeRewardQr(token)),
    [token],
  );
  const viewSize = REWARD_QR_MODULE_COUNT + REWARD_QR_QUIET_ZONE * 2;

  return (
    <figure className="reward-local-qr">
      <svg
        role="img"
        aria-label={label}
        viewBox={`0 0 ${viewSize} ${viewSize}`}
        shapeRendering="crispEdges"
      >
        <rect
          width={viewSize}
          height={viewSize}
          className="reward-local-qr-bg"
        />
        <path
          d={path}
          transform={`translate(${REWARD_QR_QUIET_ZONE} ${REWARD_QR_QUIET_ZONE})`}
          className="reward-local-qr-modules"
        />
      </svg>
      <figcaption>Muéstralo en el punto de recogida.</figcaption>
    </figure>
  );
}
