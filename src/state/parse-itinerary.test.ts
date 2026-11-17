import assert from 'node:assert/strict';
import test from 'node:test';

import { createSampleItinerary } from '../data/sample-itinerary.ts';
import { parseItinerary } from './parse-itinerary.ts';

test('示例行程可以原样读回来', () => {
  const sample = createSampleItinerary();
  const parsed = parseItinerary(JSON.stringify(sample));
  assert.deepEqual(parsed, sample);
});

test('旧存档没有想去列表时，仍然读出原来的一天', () => {
  const parsed = parseItinerary(
    JSON.stringify({
      id: 'sample-trip',
      title: '我的行程',
      days: [
        {
          id: 'day-kyoto',
          dateLabel: '第 1 天',
          title: '京都半日',
          stops: [
            {
              id: 'stop-fushimi',
              name: '伏见稻荷大社',
              latitude: 34.96714,
              longitude: 135.77267,
              mapboxId: 'poi.fushimi',
            },
          ],
          sampleLegs: [],
        },
      ],
    }),
  );

  assert.equal(parsed?.wishlist.length, 0);
  assert.equal(parsed?.activeDayId, 'day-kyoto');
  assert.equal(parsed?.days[0]?.stops[0]?.mapboxId, 'poi.fushimi');
});

test('空行程、坏坐标和重复 id 会被丢掉', () => {
  assert.equal(parseItinerary('{"id":"x","title":"行程","days":[]}'), null);
  const parsed = parseItinerary(
    JSON.stringify({
      id: 'trip',
      title: '行程',
      activeDayId: 'missing',
      days: [
        {
          id: 'day-1',
          dateLabel: '第 1 天',
          title: '第一天',
          stops: [
            { id: 'a', name: '浅草寺', latitude: 35.7, longitude: 139.8 },
            { id: 'a', name: '重复', latitude: 35.7, longitude: 139.8 },
            { id: 'b', name: '坏坐标', latitude: 120, longitude: 10 },
          ],
          sampleLegs: [],
        },
      ],
      wishlist: [{ id: 'a', name: '不该重复出现', latitude: 1, longitude: 2 }],
    }),
  );

  assert.equal(parsed?.activeDayId, 'day-1');
  assert.deepEqual(
    parsed?.days[0]?.stops.map((stop) => stop.id),
    ['a'],
  );
  assert.equal(parsed?.wishlist.length, 0);
});
