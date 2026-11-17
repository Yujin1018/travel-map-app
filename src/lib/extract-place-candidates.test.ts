import assert from 'node:assert/strict';
import test from 'node:test';

import { extractPlaceCandidates } from './extract-place-candidates.ts';

test('从带标记和箭头的攻略里抽出地名', () => {
  const names = extractPlaceCandidates(`京都一日游｜人少好拍
📍伏见稻荷大社
📍清水寺
📍八坂神社
路线：伏见稻荷大社 → 清水寺 → 二年坂 → 八坂神社
#京都旅行 #清水寺`);

  assert.deepEqual(names, ['清水寺', '伏见稻荷大社', '八坂神社', '二年坂']);
});

test('从编号列表里抽出中文和英文地名', () => {
  const names = extractPlaceCandidates(`1. 金阁寺
2. 龙安寺
3. Fushimi Inari Taisha
4. Kiyomizu-dera
5. Yasaka Shrine`);

  assert.deepEqual(names, ['金阁寺', '龙安寺', 'Fushimi Inari Taisha', 'Kiyomizu-dera', 'Yasaka Shrine']);
});

test('从句子里抽出带后缀的地名，忽略没有地点的句子', () => {
  assert.deepEqual(extractPlaceCandidates('早上先去了金阁寺，下午在岚山散步。'), ['金阁寺', '岚山']);
  assert.deepEqual(extractPlaceCandidates('今天天气很好，吃了很多好吃的。'), []);
});

test('第一站这种写法，以及重复地名只保留一次', () => {
  assert.deepEqual(extractPlaceCandidates('第一站：金阁寺\n第二站：金阁寺\n第三站：龙安寺'), ['金阁寺', '龙安寺']);
});
