#!/usr/bin/env bash
set -euo pipefail
# Uso: bash tools/process_flow_video.sh hero_raw.mp4 video_scroll.mp4
HERO="${1:?Indica hero_raw.mp4}"
SCROLL="${2:?Indica video_scroll.mp4}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
mkdir -p "$ROOT/assets/frames"
rm -f "$ROOT/assets/frames"/frame_????.webp
ffmpeg -hide_banner -loglevel warning -y -i "$HERO" -frames:v 1 -c:v libwebp -q:v 86 "$ROOT/assets/hero-static.webp"
ffmpeg -hide_banner -loglevel warning -y -i "$HERO" -an -c:v libx264 -crf 23 -preset slow -pix_fmt yuv420p -movflags +faststart "$ROOT/assets/hero-loop.mp4"
ffmpeg -hide_banner -loglevel warning -y -i "$SCROLL" -vf "fps=24,scale=1600:-2:flags=lanczos" -c:v libwebp -lossless 0 -compression_level 5 -q:v 78 -start_number 1 "$ROOT/assets/frames/frame_%04d.webp"
COUNT="$(find "$ROOT/assets/frames" -maxdepth 1 -name "frame_????.webp" | wc -l | tr -d " ")"
if (( COUNT < 2 )); then echo "ERROR: secuencia incompleta" >&2; exit 1; fi
cp "$ROOT/assets/frames/frame_0001.webp" "$ROOT/assets/scroll-static.webp"
python3 - "$ROOT/index.html" "$COUNT" <<'PY'
from pathlib import Path
import re,sys
p=Path(sys.argv[1]);s=p.read_text();p.write_text(re.sub(r'data-frame-count="\d+"',f'data-frame-count="{int(sys.argv[2])}"',s))
PY
echo "Generados $COUNT fotogramas"
du -sh "$ROOT/assets/frames" "$ROOT/assets/hero-loop.mp4"
