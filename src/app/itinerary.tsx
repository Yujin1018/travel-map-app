import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Screen } from '@/components/screen';
import { StopList } from '@/components/stop-list';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useItinerary } from '@/state/itinerary-context';

function parseCoordinate(value: string): number | null {
  const cleaned = value.trim().replace(/，/g, '.').replace(/。/g, '.').replace(/\s/g, '');
  if (!/^[-+]?\d+(\.\d+)?$/.test(cleaned)) {
    return null;
  }
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : null;
}

export default function ItineraryScreen() {
  const theme = useTheme();
  const { activeDay, itinerary, ready, addStop, removeStop, moveStop, resetToSample } = useItinerary();
  const [name, setName] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [error, setError] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);

  function handleAdd() {
    const trimmedName = name.trim();
    const parsedLatitude = parseCoordinate(latitude);
    const parsedLongitude = parseCoordinate(longitude);

    if (!trimmedName) {
      setError('请填写地点名称。');
      return;
    }
    if (parsedLatitude === null || parsedLatitude < -90 || parsedLatitude > 90) {
      setError('纬度要写成数字，范围是 -90 到 90。');
      return;
    }
    if (parsedLongitude === null || parsedLongitude < -180 || parsedLongitude > 180) {
      setError('经度要写成数字，范围是 -180 到 180。');
      return;
    }

    addStop({ name: trimmedName, latitude: parsedLatitude, longitude: parsedLongitude });
    setName('');
    setLatitude('');
    setLongitude('');
    setError('');
  }

  function handleReset() {
    resetToSample();
    setConfirmReset(false);
  }

  return (
    <Screen scroll>
      <View style={styles.header}>
        <ThemedText type="subtitle" style={styles.title}>
          行程
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          地点按从上到下的顺序排列。示例里的分钟数是写好的占位，不是路线规划算出来的。
        </ThemedText>
      </View>

      {!ready || !activeDay || !itinerary ? (
        <ThemedText type="small" themeColor="textSecondary">
          正在读取行程…
        </ThemedText>
      ) : (
        <>
          <View style={styles.header}>
            <ThemedText type="smallBold">
              {itinerary.title} · {activeDay.dateLabel}
            </ThemedText>
            <ThemedText type="default">{activeDay.title}</ThemedText>
          </View>

          <StopList day={activeDay} onMove={moveStop} onRemove={removeStop} />

          <View style={[styles.form, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="smallBold">添加地点</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              先手动填写坐标，例如纬度 35.7148、经度 139.7967。之后可以换成在地图上搜索。
            </ThemedText>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="名称，例如 浅草寺"
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
            />
            <TextInput
              value={latitude}
              onChangeText={setLatitude}
              placeholder="纬度，例如 35.7148"
              placeholderTextColor={theme.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="numbers-and-punctuation"
              style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
            />
            <TextInput
              value={longitude}
              onChangeText={setLongitude}
              placeholder="经度，例如 139.7967"
              placeholderTextColor={theme.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="numbers-and-punctuation"
              style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
            />
            {error ? (
              <ThemedText type="small" style={{ color: theme.danger }}>
                {error}
              </ThemedText>
            ) : null}
            <Pressable
              accessibilityRole="button"
              onPress={handleAdd}
              style={({ pressed }) => [
                styles.primary,
                { backgroundColor: theme.accent, opacity: pressed ? 0.8 : 1 },
              ]}>
              <ThemedText type="smallBold" style={styles.primaryText}>
                加到这一天的最后
              </ThemedText>
            </Pressable>
          </View>

          {confirmReset ? (
            <View style={[styles.form, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="smallBold">恢复示例行程？</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                当前这一天的地点会被示例地点替换。
              </ThemedText>
              <View style={styles.confirmRow}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setConfirmReset(false)}
                  style={[styles.confirmButton, { backgroundColor: theme.backgroundSelected }]}>
                  <ThemedText type="smallBold">取消</ThemedText>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={handleReset}
                  style={[styles.confirmButton, { backgroundColor: theme.danger }]}>
                  <ThemedText type="smallBold" style={styles.primaryText}>
                    确认恢复
                  </ThemedText>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable accessibilityRole="button" onPress={() => setConfirmReset(true)} style={styles.reset}>
              <ThemedText type="smallBold" style={{ color: theme.danger }}>
                恢复示例行程
              </ThemedText>
            </Pressable>
          )}
          <ThemedText type="small" themeColor="textSecondary">
            行程保存在这台设备上，没有账号，也没有服务器。
          </ThemedText>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.one,
  },
  title: {
    fontSize: 32,
    lineHeight: 40,
  },
  form: {
    borderRadius: 16,
    gap: Spacing.two,
    padding: Spacing.three,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  primary: {
    minHeight: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    color: '#ffffff',
  },
  reset: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  confirmButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
