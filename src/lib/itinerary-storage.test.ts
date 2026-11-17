import assert from 'node:assert/strict';
import test from 'node:test';

import { createSampleItinerary } from '../data/sample-itinerary.ts';
import { parseCoordinate, withManualCoordinates } from './places.ts';
import { parseItinerary } from '../state/parse-itinerary.ts';
import type { Itinerary } from '../types/itinerary.ts';
import { createBackup, itineraryForStorage, readBackupEnvelope } from './itinerary-storage.ts';

test('保存时去掉搜索得到的坐标，保留手填和示例坐标', () => {
  const sample = createSampleItinerary();
  const itinerary: Itinerary = {
    ...sample,
    wishlist: [
      {
        id: 'searched',
        name: 'Kiyomizu-dera',
        userLabel: '清水寺',
        latitude: 34.99,
        longitude: 135.78,
        mapboxId: 'poi.kiyomizu',
        note: '东山区 · 京都府 · 日本',
        coordinateSource: 'mapbox',
      },
      {
        id: 'manual',
        name: '浅草寺',
        latitude: 35.7148,
        longitude: 139.7967,
        coordinateSource: 'manual',
      },
    ],
  };

  const stored = itineraryForStorage(itinerary);
  assert.equal(stored.wishlist[0]?.name, '清水寺');
  assert.equal(stored.wishlist[0]?.latitude, undefined);
  assert.equal(stored.wishlist[0]?.mapboxId, undefined);
  assert.equal(stored.wishlist[0]?.note, undefined);
  assert.equal(stored.wishlist[1]?.latitude, 35.7148);
  assert.equal(stored.days[0]?.stops[0]?.latitude, 34.96714);

  const raw = createBackup(itinerary);
  assert.equal(raw.includes('poi.kiyomizu'), false);
  assert.equal(raw.includes('东山区'), false);
  const envelope = readBackupEnvelope(raw);
  const restored = envelope ? parseItinerary(JSON.stringify(envelope)) : null;
  assert.equal(restored?.wishlist[0]?.coordinateSource, 'mapbox');
  assert.equal(restored?.wishlist[0]?.latitude, undefined);
  assert.equal(restored?.wishlist[1]?.name, '浅草寺');
});

test('手填坐标会留下来，搜索编号会被拿掉', () => {
  const saved = withManualCoordinates(
    {
      id: 'searched',
      name: '清水寺',
      coordinateSource: 'mapbox',
      mapboxId: 'poi.kiyomizu',
      note: '东山区 · 京都府 · 日本',
    },
    34.9949,
    135.785,
  );
  assert.equal(saved.coordinateSource, 'manual');
  assert.equal(saved.latitude, 34.9949);
  assert.equal(saved.mapboxId, undefined);
  assert.equal(saved.note, undefined);
  assert.equal(parseCoordinate('35，7148'), 35.7148);
  assert.equal(parseCoordinate('北纬'), null);
});

test('不是本应用的文件不会被当成备份', () => {
  assert.equal(readBackupEnvelope('{"kind":"other","version":1}'), null);
  assert.equal(readBackupEnvelope('not json'), null);
});
