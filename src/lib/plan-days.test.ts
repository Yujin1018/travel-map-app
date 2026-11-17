import assert from 'node:assert/strict';
import test from 'node:test';

import { planDays } from './plan-days.ts';
import type { Stop } from '../types/itinerary.ts';

function stop(id: string, latitude: number, longitude: number): Stop {
  return { id, name: id, latitude, longitude };
}

test('把东京、京都东部和岚山分成三组，不把城市混在一起', () => {
  const tokyo = ['浅草寺', '晴空塔', '上野公园'];
  const east = ['清水寺', '八坂神社', '二年坂'];
  const west = ['渡月桥', '岚山公园', '竹林', '野宫神社'];
  const places = [
    stop('浅草寺', 35.7148, 139.7967),
    stop('晴空塔', 35.7101, 139.8107),
    stop('上野公园', 35.7156, 139.7731),
    stop('清水寺', 34.9949, 135.785),
    stop('八坂神社', 35.0036, 135.7786),
    stop('二年坂', 34.9986, 135.781),
    stop('渡月桥', 35.0134, 135.672),
    stop('岚山公园', 35.0094, 135.6668),
    stop('竹林', 35.0155, 135.678),
    stop('野宫神社', 35.011, 135.668),
  ];

  const groups = planDays(places, 3).filter((group) => group.length > 0);
  const names = groups.map((group) => group.map((place) => place.name).sort());

  assert.equal(groups.length, 3);
  for (const city of [tokyo, east, west]) {
    assert.ok(names.some((group) => city.every((name) => group.includes(name)) && group.length === city.length));
  }
});

test('同一天的顺序沿直线往下走，不来回跳', () => {
  const places = [0, 0.2, 0.4, 0.6, 0.8, 1].map((longitude, index) => stop(`p${index}`, 35, longitude));
  const [day] = planDays(places, 1);
  assert.deepEqual(
    day?.map((place) => place.longitude),
    [0, 0.2, 0.4, 0.6, 0.8, 1],
  );
});

test('分成两天时，直线上的点按左右两段分开', () => {
  const places = [0, 1, 2, 3, 4, 5].map((longitude, index) => stop(`p${index}`, 35, longitude));
  const groups = planDays(places, 2).map((group) => group.map((place) => place.longitude).sort((left, right) => left - right));
  assert.deepEqual(groups.sort((left, right) => (left[0] ?? 0) - (right[0] ?? 0)), [
    [0, 1, 2],
    [3, 4, 5],
  ]);
});

test('地点比天数少时，多出来的天是空的', () => {
  const groups = planDays([stop('a', 35, 135), stop('b', 36, 136)], 3);
  assert.equal(groups.length, 3);
  assert.equal(groups.filter((group) => group.length > 0).length, 2);
});

test('没有地点时不生成安排', () => {
  assert.deepEqual(planDays([], 3), []);
});
