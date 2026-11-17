import { useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { FillButton } from '@/components/action-button';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { extractPlaceCandidates, reachedCandidateLimit } from '@/lib/extract-place-candidates';
import { getMapboxPublicToken } from '@/lib/mapbox';
import { formatPlaceContext, searchErrorMessage, searchPlaces, type GeocodedPlace } from '@/lib/mapbox-search';
import type { AddManyResult } from '@/state/itinerary-context';
import type { PlaceDraft } from '@/types/itinerary';

type Candidate = {
  id: string;
  name: string;
  included: boolean;
};

type LookupRow = {
  id: string;
  query: string;
  results: GeocodedPlace[];
  selectedId: string | null;
  error: string;
};

export function PostImport({
  dayLabel,
  proximity,
  onAddToWishlist,
  onAddToDay,
}: {
  dayLabel: string;
  proximity: { latitude: number; longitude: number } | null;
  onAddToWishlist: (places: PlaceDraft[]) => AddManyResult;
  onAddToDay: (places: PlaceDraft[]) => AddManyResult;
}) {
  const theme = useTheme();
  const nextId = useRef(0);
  const [text, setText] = useState('');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [rows, setRows] = useState<LookupRow[] | null>(null);
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState<'info' | 'danger'>('info');
  const [busy, setBusy] = useState(false);

  function findNames() {
    const names = extractPlaceCandidates(text);
    const next = names.map((name) => {
      nextId.current += 1;
      return { id: `candidate-${nextId.current}`, name, included: true };
    });
    setCandidates(next);
    setRows(null);
    if (next.length === 0) {
      setMessageTone('danger');
      setMessage('这段文字里没有找出地名。可以换一段写了地点的文字，或在上面直接搜索。');
      return;
    }
    setMessageTone('info');
    setMessage(
      reachedCandidateLimit(names)
        ? '一次最多列出 12 个。这是按文字规则挑出来的，不是人工智能。可以改名字，再查找坐标。'
        : '这是按文字规则挑出来的，不是人工智能。可以改错字，取消不需要的，再查找坐标。确认前不会写入行程。',
    );
  }

  async function lookup() {
    const chosen = candidates.filter((item) => item.included && item.name.trim());
    if (chosen.length === 0) {
      setMessageTone('danger');
      setMessage('请先勾选要查找的地名。');
      return;
    }
    const token = getMapboxPublicToken();
    if (!token) {
      setMessageTone('danger');
      setMessage(searchErrorMessage('missing-token'));
      return;
    }

    setBusy(true);
    const nextRows: LookupRow[] = [];
    for (let index = 0; index < chosen.length; index += 1) {
      const item = chosen[index];
      if (!item) {
        continue;
      }
      setMessageTone('info');
      setMessage(`正在查找地点（${index + 1}/${chosen.length}）…`);
      const result = await searchPlaces(item.name.trim(), {
        token,
        limit: 5,
        autocomplete: false,
        proximity,
      });
      if (!result.ok) {
        nextRows.push({
          id: item.id,
          query: item.name.trim(),
          results: [],
          selectedId: null,
          error: searchErrorMessage(result.reason),
        });
        if (result.reason !== 'aborted') {
          break;
        }
      } else if (result.places.length === 1) {
        nextRows.push({
          id: item.id,
          query: item.name.trim(),
          results: result.places,
          selectedId: result.places[0]?.mapboxId ?? null,
          error: '',
        });
      } else {
        nextRows.push({
          id: item.id,
          query: item.name.trim(),
          results: result.places,
          selectedId: null,
          error: result.places.length === 0 ? '没有找到。可以改名后再查。' : '',
        });
      }
    }
    setRows(nextRows);
    setMessageTone('info');
    setMessage('多个结果的地名需要点选一个。没点选的不会加入。');
    setBusy(false);
  }

  function commit(destination: 'wishlist' | 'day') {
    if (!rows) {
      return;
    }
    const drafts = rows.flatMap((row) => {
      const place = row.results.find((item) => item.mapboxId === row.selectedId);
      return place ? [toDraft(place, row.query)] : [];
    });
    if (drafts.length === 0) {
      setMessageTone('danger');
      setMessage('还没有选中可以加入的结果。');
      return;
    }
    const outcome = destination === 'wishlist' ? onAddToWishlist(drafts) : onAddToDay(drafts);
    const skipped = rows.filter((row) => row.results.length > 1 && !row.selectedId).map((row) => row.query);
    const missed = rows.filter((row) => row.results.length === 0).map((row) => row.query);
    const where = destination === 'wishlist' ? '想去的地点' : '这一天';
    const parts: string[] = [];
    if (outcome.added.length > 0) {
      parts.push(`已加入${where}：${outcome.added.join('、')}。坐标只在这次打开时有效。`);
    }
    if (outcome.duplicates.length > 0) {
      parts.push(`已经在行程里：${outcome.duplicates.join('、')}。`);
    }
    if (skipped.length > 0) {
      parts.push(`有多个结果但还没选：${skipped.join('、')}。`);
    }
    if (missed.length > 0) {
      parts.push(`没有找到：${missed.join('、')}。`);
    }
    setMessageTone(outcome.added.length > 0 && skipped.length === 0 && missed.length === 0 ? 'info' : 'danger');
    setMessage(parts.join('') || '没有可以加入的地点。');
  }

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
      <ThemedText type="smallBold">从帖子导入</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        粘贴小红书、Instagram 或其他攻略正文。下面会按标点和地名用字挑出候选，不是人工智能识别。
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        从图片识别地名还没做。现在只能处理粘贴出来的文字。
      </ThemedText>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="把帖子正文粘贴到这里"
        placeholderTextColor={theme.textSecondary}
        multiline
        textAlignVertical="top"
        accessibilityLabel="帖子正文"
        style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
      />
      <FillButton label="找出地名" tone="secondary" disabled={busy || !text.trim()} onPress={findNames} />
      {rows === null && candidates.length > 0 ? (
        <View style={styles.list}>
          {candidates.map((item) => (
            <View key={item.id} style={styles.choice}>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: item.included }}
                accessibilityLabel={`选择${item.name || '地名'}`}
                onPress={() =>
                  setCandidates((current) =>
                    current.map((candidate) =>
                      candidate.id === item.id ? { ...candidate, included: !candidate.included } : candidate,
                    ),
                  )
                }
                style={styles.boxHit}>
                <View
                  style={[
                    styles.box,
                    {
                      borderColor: theme.accent,
                      backgroundColor: item.included ? theme.accent : 'transparent',
                    },
                  ]}>
                  <ThemedText type="smallBold" style={styles.check}>
                    {item.included ? '✓' : ''}
                  </ThemedText>
                </View>
              </Pressable>
              <TextInput
                value={item.name}
                onChangeText={(name) =>
                  setCandidates((current) =>
                    current.map((candidate) => (candidate.id === item.id ? { ...candidate, name } : candidate)),
                  )
                }
                accessibilityLabel="修改候选地名"
                placeholder="修改地名"
                placeholderTextColor={theme.textSecondary}
                style={[styles.nameInput, { color: theme.text, borderColor: theme.backgroundSelected }]}
              />
            </View>
          ))}
          <FillButton label="查找坐标" disabled={busy} onPress={() => void lookup()} />
        </View>
      ) : null}
      {rows ? (
        <View style={styles.list}>
          {rows.map((row) => (
            <View key={row.id} style={styles.review}>
              <ThemedText type="smallBold">{row.query}</ThemedText>
              {row.error ? (
                <ThemedText type="small" style={{ color: theme.danger }}>
                  {row.error}
                </ThemedText>
              ) : null}
              {row.results.length > 1 ? (
                <ThemedText type="small" themeColor="textSecondary">
                  有多个结果，请选一个。
                </ThemedText>
              ) : null}
              {row.results.map((place) => {
                const selected = row.selectedId === place.mapboxId;
                const context = formatPlaceContext(place);
                return (
                  <Pressable
                    key={place.mapboxId}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    onPress={() =>
                      setRows((current) =>
                        current?.map((item) =>
                          item.id === row.id ? { ...item, selectedId: place.mapboxId } : item,
                        ) ?? null,
                      )
                    }
                    style={styles.radio}>
                    <View
                      style={[
                        styles.radioMark,
                        { borderColor: theme.accent, backgroundColor: selected ? theme.accent : 'transparent' },
                      ]}
                    />
                    <View style={styles.copy}>
                      <ThemedText type="smallBold">{place.name}</ThemedText>
                      {context ? (
                        <ThemedText type="small" themeColor="textSecondary">
                          {context}
                        </ThemedText>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ))}
          <View style={styles.actions}>
            <FillButton label="加入想去" disabled={busy} onPress={() => commit('wishlist')} />
            <FillButton label={`加到${dayLabel}`} tone="secondary" disabled={busy} onPress={() => commit('day')} />
            <FillButton
              label="返回改名字"
              tone="secondary"
              disabled={busy}
              onPress={() => {
                setRows(null);
                setMessage('可以继续修改地名，然后再查找。');
                setMessageTone('info');
              }}
            />
          </View>
        </View>
      ) : null}
      {message ? (
        <ThemedText
          type="small"
          accessibilityLiveRegion="polite"
          style={{ color: messageTone === 'danger' ? theme.danger : theme.textSecondary }}>
          {message}
        </ThemedText>
      ) : null}
    </View>
  );
}

function toDraft(place: GeocodedPlace, userLabel: string): PlaceDraft {
  const note = formatPlaceContext(place);
  return {
    name: place.name,
    latitude: place.latitude,
    longitude: place.longitude,
    mapboxId: place.mapboxId,
    note: note || undefined,
    coordinateSource: 'mapbox',
    userLabel,
  };
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    gap: Spacing.two,
    padding: Spacing.three,
  },
  input: {
    minHeight: 120,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  list: {
    gap: Spacing.two,
  },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 44,
  },
  boxHit: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: {
    color: '#ffffff',
    lineHeight: 18,
  },
  nameInput: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: Spacing.two,
    fontSize: 16,
  },
  review: {
    gap: Spacing.one,
  },
  radio: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 44,
  },
  radioMark: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});
