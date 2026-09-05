# RAIF snapshot runbook

## Purpose

This command downloads one verified local snapshot of the official Junta de Andalucía RAIF olivar archive. It is intentionally manual in V1: the archive is large enough that we should decide retention and extraction storage before scheduling weekly downloads.

The snapshot step does **not** parse pests, infer plot risk, or recommend treatments. It only creates a bounded, integrity-checked source artifact for later ingestion.

## Safety guarantees

The worker snapshot helper:

- accepts only HTTPS URLs on `juntadeandalucia.es` or its subdomains;
- validates the final redirect host again;
- refuses archives larger than 128 MiB by default;
- streams to disk instead of buffering the whole archive in memory;
- creates the destination with exclusive create (`wx`) and mode `0600`;
- refuses to overwrite an existing snapshot;
- verifies a ZIP signature after download;
- calculates SHA-256 for reproducibility;
- removes the partial file on failure;
- keeps HTTP `Last-Modified` only as technical metadata, never as authoritative RAIF observation freshness.

## Manual staging / Raspberry execution

Choose a new filename for every run. A timestamped or catalog-dated path is preferred.

```bash
cd /path/to/magina-olivo
export RAIF_SNAPSHOT_PATH=/srv/magina-olivo/raif-snapshots/raif-olivar-2026-08-31.zip
npm run source:raif:snapshot --workspace @magina/worker
```

Optional source override for controlled testing:

```bash
export RAIF_OLIVAR_ZIP_URL='https://www.juntadeandalucia.es/.../raif_olivar_andalucia_2006_2026.zip'
```

Never point `RAIF_OLIVAR_ZIP_URL` at mirrors, arbitrary hosts, local files or HTTP URLs.

## Expected success output

The command prints one JSON event containing:

- `event = raif_snapshot_downloaded`
- final trusted URL
- download timestamp
- byte length
- SHA-256
- ETag / Last-Modified when supplied by the remote server
- content type
- local output path

Store the JSON result alongside the deployment log. Do not treat `Last-Modified` as the date of the agronomic observation.

## Retention for the first staging runs

Until the real archive structure is validated on staging:

1. keep the original ZIP unchanged;
2. keep at least the current snapshot and the immediately previous snapshot;
3. never commit ZIP snapshots to Git;
4. do not import raw XML blindly into product tables;
5. record the SHA-256 before extraction;
6. inspect archive entry names and uncompressed sizes before selecting XML files.

## Next ingestion contract

The official dataset documents separate XML resources for olivar parcels and provincial samples. The future parser must join records using the documented keys:

`PROVINCIA + MUNICIPIO + PARCELA`

The first ingestion target is **Jaén**. Raw observations should become traceable normalized snapshots; they must not automatically become treatment recommendations or per-plot diagnoses.
