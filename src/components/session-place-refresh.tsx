import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ActionButton } from '@/components/action-button';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getMapboxPublicToken } from '@/lib/mapbox';
import { formatPlaceContext, searchErrorMessage, searchPlaces, type GeocodedPlace } from '@/lib/mapbox-search';
import type { AddPlaceResult } from '@/state/itinerary-context';
import type { PlaceDraft } from '@/types/itinerary';

/** 重新打开后，用保存的名称再查一次。坐标仍然只留在这次打开里。 */
export function SessionPlaceRefresh({
  query,
  proximity,
  onAttach,
}: {
  query: string;
  proximity: { latitude: number; longitude: number } | null;
  onAttach: (place: PlaceDraft) => AddPlaceResult;
}) {
  const theme = useTheme();
  const [results, setResults] = useState<GeocodedPlace[] | null>(null);
  const [message, setMessage] = useState('');
  const [tone, setTone] = useState<'info' | 'danger'>('info');
  const [busy, setBusy] = useState(false);

  async function lookup() {
    const token = getMapboxPublicToken();
    if (!token) {
      setTone('danger');
      setMessage(searchErrorMessage('missing-token'));
      return;
    }
    setBusy(true);
    setResults(null);
    const result = await searchPlaces(query, { token, limit: 5, autocomplete: false, proximity });
    setBusy(false);
    if (!result.ok) {
      setResults([]);
      setTone('danger');
      setMessage(searchErrorMessage(result.reason));
      return;
    }
    setResults(result.places);
    setTone(result.places.length === 0 ? 'danger' : 'info');
    setMessage(
      result.places.length === 0
        ? '没有找到。可以在下面手填经纬度，手填的坐标会一直留在地图上。'
        : '请点一个结果。点中后只在这次打开时画在地图上，重新打开还要再查一次。',
    );
  }

  function choose(place: GeocodedPlace) {
    const note = formatPlaceContext(place);
    const outcome = onAttach({
      name: place.name,
      latitude: place.latitude,
      longitude: place.longitude,
      mapboxId: place.mapboxId,
      note: note || undefined,
      coordinateSource: 'mapbox',
      userLabel: query,
    });
    if (outcome === 'invalid') {
      setTone('danger');
      setMessage('这个结果缺少可用的坐标。');
      return;
    }
    setResults(null);
    setTone('info');
    setMessage(
      outcome === 'duplicate'
        ? `「${place.name}」这次已经在地图上。`
        : `已用这次的结果画出「${place.name}」。重新打开后要再查一次。`,
    );
  }

  return (
    <View style={styles.box}>
      <ActionButton label={busy ? '正在查找…' : '重新查找'} disabled={busy} onPress={() => void lookup()} />
      {results?.map((place) => (
        <ActionButton key={place.mapboxId} label={`用「${place.name}」画上`} onPress={() => choose(place)} />
      ))}
      {message ? (
        <ThemedText type="small" accessibilityLiveRegion="polite" style={{ color: tone === 'danger' ? theme.danger : theme.textSecondary }}>
          {message}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    gap: Spacing.two,
  },
});
