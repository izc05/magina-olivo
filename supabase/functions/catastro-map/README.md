# Catastro map Edge Function

Authenticated server-side adapter for the public INSPIRE Cadastral Parcels WFS operated by Dirección General del Catastro.

## Operations

POST body by cadastral reference:

```json
{"operation":"reference","reference":"23044A01200034"}
```

POST body by map viewport:

```json
{
  "operation":"bbox",
  "bbox":{
    "minLongitude":-3.47,
    "minLatitude":37.73,
    "maxLongitude":-3.44,
    "maxLatitude":37.76
  }
}
```

The upstream URL is fixed server-side. BBOX size and response size are limited and requests time out after 8 seconds. The function must remain authenticated with `verify_jwt = true`.
