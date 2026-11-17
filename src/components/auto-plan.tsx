import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { FillButton } from '@/components/action-button';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { planDays } from '@/lib/plan-days';
import { hasCoordinates } from '@/lib/places';
import type { Stop } from '@/types/itinerary';

const MIN_DAYS = 1;
const MAX_DAYS = 10;

export function AutoPlan({ places, onApply }: { places: Stop[]; onApply: (groups: Stop[][]) => void }) {
  const theme = useTheme();
  const [dayCount, setDayCount] = useState(3);
  const [preview, setPreview] = useState<Stop[][] | null>(null);
  const [message, setMessage] = useState('');
  const placeKey = places.map((place) => place.id).join('|');

  useEffect(() => {
    setPreview(null);
  }, [dayCount, placeKey]);

  const located = places.filter(hasCoordinates);
  const emptyDays = preview ? preview.filter((group) => group.length === 0).length : 0;

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
      <ThemedText type="smallBold">智能分配</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        把已有坐标的地点按直线距离分成几天，同一天尽量靠近，一天内部再按就近顺序排。这不是沿道路规划，也不会估算交通时间。
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {located.length > 0 ? `现在有 ${located.length} 个有坐标的地点可以分配。` : '先加入有坐标的地点，再做分组。'}
        {places.length > located.length ? ' 没有坐标的地点会留在原地，不参加这次分组。' : ''}
      </ThemedText>
      <View style={styles.stepper}>
        <FillButton
          label="少一天"
          tone="secondary"
          disabled={dayCount <= MIN_DAYS}
          onPress={() => setDayCount((current) => Math.max(MIN_DAYS, current - 1))}
        />
        <ThemedText type="smallBold">{dayCount} 天</ThemedText>
        <FillButton
          label="多一天"
          tone="secondary"
          disabled={dayCount >= MAX_DAYS}
          onPress={() => setDayCount((current) => Math.min(MAX_DAYS, current + 1))}
        />
      </View>
      <FillButton
        label="生成分配"
        disabled={located.length === 0}
        onPress={() => {
          setMessage('');
          setPreview(planDays(located, dayCount));
        }}
      />
      {preview ? (
        <View style={styles.preview}>
          {preview.map((stops, index) => (
            <View key={`day-${index + 1}`}>
              <ThemedText type="smallBold">第 {index + 1} 天</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {stops.length > 0 ? stops.map((stop) => stop.name).join(' → ') : '这一天没有地点'}
              </ThemedText>
            </View>
          ))}
          {emptyDays > 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              地点比天数少，空着的天确认后可以删掉。
            </ThemedText>
          ) : null}
          <ThemedText type="small" themeColor="textSecondary">
            确认后会替换现在每一天的安排。想去列表里分出去的地点会从列表里拿走。
          </ThemedText>
          <View style={styles.stepper}>
            <FillButton
              label="就按这样安排"
              onPress={() => {
                onApply(preview);
                setPreview(null);
                setMessage('已按远近分成这些天。可以在上面调整顺序、换到别的天，或移回想去列表。');
              }}
            />
            <FillButton label="取消" tone="secondary" onPress={() => setPreview(null)} />
          </View>
        </View>
      ) : null}
      {message ? (
        <ThemedText type="small" accessibilityLiveRegion="polite">
          {message}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    gap: Spacing.two,
    padding: Spacing.three,
  },
  stepper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.two,
  },
  preview: {
    gap: Spacing.two,
  },
});
