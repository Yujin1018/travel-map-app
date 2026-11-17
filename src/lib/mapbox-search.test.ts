import assert from 'node:assert/strict';
import test from 'node:test';

import { formatPlaceContext, parseSearchResponse } from './mapbox-search.ts';

test('解析 Search Box 结果里的名称、坐标和地区', () => {
  const places = parseSearchResponse({
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [135.785, 34.9949] },
        properties: {
          name: '清水寺',
          mapbox_id: 'poi.kiyomizu',
          context: {
            neighborhood: { name: '清水' },
            place: { name: '京都市' },
            region: { name: '京都府' },
            country: { name: '日本' },
          },
        },
      },
      {
        properties: { name: '坏结果', mapbox_id: 'bad' },
      },
    ],
  });

  assert.equal(places.length, 1);
  assert.equal(places[0]?.name, '清水寺');
  assert.equal(places[0]?.mapboxId, 'poi.kiyomizu');
  assert.equal(places[0]?.latitude, 34.9949);
  assert.equal(places[0]?.longitude, 135.785);
  assert.equal(formatPlaceContext(places[0] ?? { locality: '', region: '', country: '' }), '清水 · 京都府 · 日本');
});

test('坏掉的响应当成没有结果', () => {
  assert.deepEqual(parseSearchResponse(null), []);
  assert.deepEqual(parseSearchResponse({ features: 'nope' }), []);
});
