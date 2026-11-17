import { useState } from 'react';
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
  const [text, setText] = useState('');
  const [candidates, setCandidates] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState<'info' | 'danger'>('info');
  const [busy, setBusy] = useState(false);

  function recognize() {
    const next = extractPlaceCandidates(text);
    setCandidates(next);
    setSelected(next);
    if (next.length === 0) {
      setMessageTone('danger');
      setMessage('没有识别出地名。可以换一段写了地点的文字，或在上面直接搜索。');
      return;
    }
    setMessageTone('info');
    setMessage(
      reachedCandidateLimit(next)
        ? '一次最多确认 12 个地名。其余可以再贴一次，或直接搜索。请勾选要加入的地点。'
        : '请勾选要加入的地点。确认前不会写入行程。',
    );
  }

  function toggle(name: string) {
    setSelected((current) => (current.includes(name) ? current.filter((item) => item !== name) : [...current, name]));
  }

  async function confirm(destination: 'wishlist' | 'day') {
    const chosen = candidates.filter((name) => selected.includes(name));
    if (chosen.length === 0) {
      setMessageTone('danger');
      setMessage('请先勾选要加入的地名。');
      return;
    }
    if (!getMapboxPublicToken()) {
      setMessageTone('danger');
      setMessage(searchErrorMessage('missing-token'));
      return;
    }

    setBusy(true);
    const found: PlaceDraft[] = [];
    const missed: string[] = [];
    for (let index = 0; index < chosen.length; index += 1) {
      const name = chosen[index];
      if (!name) {
        continue;
      }
      setMessageTone('info');
      setMessage(`正在查找地点（${index + 1}/${chosen.length}）…`);
      const result = await searchPlaces(name, {
        token: getMapboxPublicToken(),
        limit: 1,
        autocomplete: false,
        proximity,
      });
      if (!result.ok) {
        const partial = commit(destination, found);
        setMessageTone('danger');
        setMessage(
          [describeAdded(destination, partial, missed), `${name}及后面的地名没有查完。${searchErrorMessage(result.reason)}`]
            .filter(Boolean)
            .join(''),
        );
        setBusy(false);
        return;
      }
      const place = result.places[0];
      if (!place) {
        missed.push(name);
        continue;
      }
      found.push(toDraft(place));
    }

    const outcome = commit(destination, found);
    const summary = describeAdded(destination, outcome, missed);
    setMessageTone(outcome.added.length > 0 && missed.length === 0 ? 'info' : 'danger');
    setMessage(summary || '没有可以加入的地点。');
    setBusy(false);
  }

  function commit(destination: 'wishlist' | 'day', places: PlaceDraft[]): AddManyResult {
    if (places.length === 0) {
      return { added: [], duplicates: [] };
    }
    return destination === 'wishlist' ? onAddToWishlist(places) : onAddToDay(places);
  }

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
      <ThemedText type="smallBold">从帖子导入</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        粘贴小红书、Instagram 或其他攻略正文。先列出可能的地名，确认后才会查找坐标并加入。
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        从图片识别地名会在下一步做。现在请先粘贴帖子里的文字。
      </ThemedText>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="把帖子正文粘贴到这里"
        placeholderTextColor={theme.textSecondary}
        multiline
        textAlignVertical="top"
        style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
      />
      <FillButton label="识别地名" tone="secondary" disabled={busy || !text.trim()} onPress={recognize} />
      {candidates.length > 0 ? (
        <View style={styles.list}>
          {candidates.map((name) => {
            const checked = selected.includes(name);
            return (
              <Pressable
                key={name}
                accessibilityRole="checkbox"
                accessibilityState={{ checked }}
                onPress={() => toggle(name)}
                style={styles.choice}>
                <View
                  style={[
                    styles.box,
                    {
                      borderColor: theme.accent,
                      backgroundColor: checked ? theme.accent : 'transparent',
                    },
                  ]}>
                  <ThemedText type="smallBold" style={styles.check}>
                    {checked ? '✓' : ''}
                  </ThemedText>
                </View>
                <ThemedText type="smallBold">{name}</ThemedText>
              </Pressable>
            );
          })}
          <View style={styles.actions}>
            <FillButton label="加入想去" disabled={busy} onPress={() => void confirm('wishlist')} />
            <FillButton label={`加到${dayLabel}`} tone="secondary" disabled={busy} onPress={() => void confirm('day')} />
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

function toDraft(place: GeocodedPlace): PlaceDraft {
  const note = formatPlaceContext(place);
  return {
    name: place.name,
    latitude: place.latitude,
    longitude: place.longitude,
    mapboxId: place.mapboxId,
    note: note || undefined,
  };
}

function describeAdded(destination: 'wishlist' | 'day', outcome: AddManyResult, missed: string[]): string {
  const where = destination === 'wishlist' ? '想去的地点' : '这一天';
  const parts: string[] = [];
  if (outcome.added.length > 0) {
    parts.push(`已加入${where}：${outcome.added.join('、')}。`);
  }
  if (outcome.duplicates.length > 0) {
    parts.push(`已经在行程或想去列表里：${outcome.duplicates.join('、')}。`);
  }
  if (missed.length > 0) {
    parts.push(`没有找到：${missed.join('、')}。`);
  }
  return parts.join('');
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
    minHeight: 36,
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
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});
