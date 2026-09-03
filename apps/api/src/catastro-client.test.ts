import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildCatastroBboxUrl,
  buildCatastroReferenceUrl,
  parseCatastroGml,
  validateCadastralReference,
  validateCatastroBbox,
} from './catastro-client.ts';

test('Catastro adapter builds a bounded official WFS query in Web Mercator', () => {
  const url = new URL(buildCatastroBboxUrl({
    minLon: -3.51,
    minLat: 37.70,
    maxLon: -3.50,
    maxLat: 37.71,
  }));
  assert.equal(url.origin, 'https://ovc.catastro.meh.es');
  assert.equal(url.pathname, '/INSPIRE/wfsCP.aspx');
  assert.equal(url.searchParams.get('service'), 'WFS');
  assert.equal(url.searchParams.get('version'), '2.0.0');
  assert.equal(url.searchParams.get('request'), 'GetFeature');
  assert.equal(url.searchParams.get('typenames'), 'cp:CadastralParcel');
  assert.equal(url.searchParams.get('srsName'), 'EPSG::3857');
  assert.equal(url.searchParams.get('count'), '80');
  assert.match(url.searchParams.get('bbox') ?? '', /^-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?$/);
});

test('Catastro adapter supports verified stored query by 14-character parcel reference', () => {
  assert.equal(validateCadastralReference('03065A04600062'), true);
  assert.equal(validateCadastralReference('03065A046000620001AB'), false);
  const url = new URL(buildCatastroReferenceUrl('03065a04600062'));
  assert.equal(url.searchParams.get('STOREDQUERY_ID'), 'GetParcel');
  assert.equal(url.searchParams.get('refcat'), '03065A04600062');
  assert.equal(url.searchParams.get('srsName'), 'EPSG::3857');
});

test('Catastro adapter rejects oversized or inverted bbox queries', () => {
  assert.match(validateCatastroBbox({ minLon: -3.5, minLat: 37.7, maxLon: -3.4, maxLat: 37.71 }) ?? '', /maximum span/);
  assert.match(validateCatastroBbox({ minLon: -3.4, minLat: 37.7, maxLon: -3.5, maxLat: 37.71 }) ?? '', /inverted/);
});

test('Catastro GML is normalized to WGS84 geometry and safe public fields', () => {
  const xml = `<?xml version="1.0"?>
    <wfs:FeatureCollection xmlns:wfs="http://www.opengis.net/wfs/2.0" xmlns:cp="http://inspire.ec.europa.eu/schemas/cp/4.0" xmlns:gml="http://www.opengis.net/gml/3.2">
      <wfs:member>
        <cp:CadastralParcel gml:id="ES.SDGC.CP.03065A04600062">
          <cp:areaValue uom="m2">10000</cp:areaValue>
          <cp:beginLifespanVersion>2011-12-19T00:00:00</cp:beginLifespanVersion>
          <cp:geometry>
            <gml:MultiSurface srsName="http://www.opengis.net/def/crs/EPSG/0/3857">
              <gml:surfaceMember><gml:Surface><gml:patches><gml:PolygonPatch><gml:exterior><gml:LinearRing>
                <gml:posList srsDimension="2" count="5">0 0 111.319490793 0 111.319490793 111.319490799 0 111.319490799 0 0</gml:posList>
              </gml:LinearRing></gml:exterior></gml:PolygonPatch></gml:patches></gml:Surface></gml:surfaceMember>
            </gml:MultiSurface>
          </cp:geometry>
          <cp:label>62</cp:label>
          <cp:nationalCadastralReference>03065A04600062</cp:nationalCadastralReference>
        </cp:CadastralParcel>
      </wfs:member>
    </wfs:FeatureCollection>`;

  const items = parseCatastroGml(xml);
  assert.equal(items.length, 1);
  const parcel = items[0]!;
  assert.equal(parcel.id, '03065A04600062');
  assert.equal(parcel.nationalCadastralReference, '03065A04600062');
  assert.equal(parcel.label, '62');
  assert.equal(parcel.areaM2, 10000);
  assert.equal(parcel.beginLifespanVersion, '2011-12-19T00:00:00');
  assert.equal(parcel.geometry.type, 'Polygon');
  const ring = (parcel.geometry.coordinates as number[][][])[0]!;
  assert.equal(ring.length, 5);
  assert.ok(Math.abs(ring[0]![0]!) < 1e-10);
  assert.ok(Math.abs(ring[0]![1]!) < 1e-10);
  assert.ok(ring[1]![0]! > 0.0009 && ring[1]![0]! < 0.0011);
  assert.ok(ring[2]![1]! > 0.0009 && ring[2]![1]! < 0.0011);
});

test('Catastro WFS exception responses are rejected', () => {
  assert.throws(() => parseCatastroGml('<ows:ExceptionReport xmlns:ows="http://www.opengis.net/ows/1.1"><ows:Exception /></ows:ExceptionReport>'), /exception/);
});
