import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { FillButton } from '@/components/action-button';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getMapboxPublicToken } from '@/lib/mapbox';
import { formatPlaceContext, searchErrorMessage, searchPlaces, type GeocodedPlace } from '@/lib/mapbox-search';
import { parseCoordinate } from '@/lib/places';
import type { AddPlaceResult } from '@/state/itinerary-context';
import type { PlaceDraft } from '@/types/itinerary';

/**
 * 重新打开后补图钉。
 * 重新查找只在这次打开时画上。手填并保存的坐标会留在设备上。
 */
export function SessionPlaceRefresh({
  query,
  proximity,
  onAttach,
  onSaveManual,
}: {
  query: string;
  proximity: { latitude: number; longitude: number } | null;
  onAttach: (place: PlaceDraft) => AddPlaceResult;
  onSaveManual: (latitude: number, longitude: number) => 'saved' | 'invalid' | 'missing';
}) {
  const theme = useTheme();
  const [results, setResults] = useState<GeocodedPlace[] | null>(null);
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [message, setMessage] = useState('');
  const [tone, setTone] = useState<'info' | 'danger'>('info');
  const [busy, setBusy] = useState(false);

  async function lookup() {
    const token = getMapboxPublicToken();
    if (!token) {
      setTone('danger');
      setResults([]);
      setMessage('还没有搜索令牌。请在下面填写纬度和经度，点「保存坐标」。这样刷新后仍会画上。');
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
        ? '没有找到。请填写下面的纬度和经度再保存，刷新后仍会画上。'
        : '点一个结果，只在这次打开时画上。重新打开后还要再查。要一直留下，请改填下面的数字。',
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
        ? `「${place.name}」这次已经画在地图上。`
        : `已画出「${place.name}」。这是这次打开的结果，重新打开后要再查一次。`,
    );
  }

  function saveManual() {
    const parsedLatitude = parseCoordinate(latitude);
    const parsedLongitude = parseCoordinate(longitude);
    if (parsedLatitude === null || parsedLatitude < -90 || parsedLatitude > 90) {
      setTone('danger');
      setMessage('纬度要写成数字，范围是 -90 到 90。');
      return;
    }
    if (parsedLongitude === null || parsedLongitude < -180 || parsedLongitude > 180) {
      setTone('danger');
      setMessage('经度要写成数字，范围是 -180 到 180。');
      return;
    }
    const outcome = onSaveManual(parsedLatitude, parsedLongitude);
    setTone(outcome === 'saved' ? 'info' : 'danger');
    setMessage(
      outcome === 'saved'
        ? `已保存「${query}」的坐标。刷新后仍会画在地图上。`
        : '没有保存成功。',
    );
  }

  return (
    <View style={styles.box}>
      <FillButton label={busy ? '正在查找…' : '重新查找'} tone="secondary" disabled={busy} onPress={() => void lookup()} />
      {results?.map((place) => {
        const context = formatPlaceContext(place);
        return (
          <Pressable
            key={place.mapboxId}
            accessibilityRole="button"
            accessibilityLabel={`用${place.name}画到这次的地图上`}
            onPress={() => choose(place)}
            style={({ pressed }) => [
              styles.result,
              { borderColor: theme.backgroundSelected, opacity: pressed ? 0.75 : 1 },
            ]}>
            <ThemedText type="smallBold">{place.name}</ThemedText>
            {context ? (
              <ThemedText type="small" themeColor="textSecondary">
                {context}
              </ThemedText>
            ) : null}
            <ThemedText type="smallBold" style={{ color: theme.accent }}>
              用这个画上（仅本次）
            </ThemedText>
          </Pressable>
        );
      })}
      <ThemedText type="small" themeColor="textSecondary">
        要刷新后还在，请填写纬度和经度再保存。
      </ThemedText>
      <TextInput
        value={latitude}
        onChangeText={setLatitude}
        placeholder="纬度，例如 35.7148"
        placeholderTextColor={theme.textSecondary}
        accessibilityLabel={`${query}的纬度`}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="numbers-and-punctuation"
        returnKeyType="next"
        style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
      />
      <TextInput
        value={longitude}
        onChangeText={setLongitude}
        placeholder="经度，例如 139.7967"
        placeholderTextColor={theme.textSecondary}
        accessibilityLabel={`${query}的经度`}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="numbers-and-punctuation"
        returnKeyType="done"
        onSubmitEditing={saveManual}
        style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
      />
      <FillButton label="保存坐标" onPress={saveManual} />
      {message ? (
        <ThemedText
          type="small"
          accessibilityLiveRegion="polite"
          style={{ color: tone === 'danger' ? theme.danger : theme.textSecondary }}>
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
  result: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    gap: Spacing.one,
  },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
});
