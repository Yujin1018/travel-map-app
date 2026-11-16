import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { RouteMap } from '@/components/route-map';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useItinerary } from '@/state/itinerary-context';

export default function MapScreen() {
  const theme = useTheme();
  const { activeDay, itinerary, ready } = useItinerary();

  return (
    <Screen scroll>
      <View style={styles.header}>
        <ThemedText type="subtitle" style={styles.title}>
          旅行地图
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          按计划的先后顺序查看这一天要去的地方。
        </ThemedText>
      </View>

      {!ready || !activeDay || !itinerary ? (
        <ThemedText type="small" themeColor="textSecondary">
          正在读取行程…
        </ThemedText>
      ) : (
        <>
          <View style={[styles.summary, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="smallBold">
              {itinerary.title} · {activeDay.dateLabel} · {activeDay.title}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {activeDay.stops.length > 0
                ? activeDay.stops.map((stop) => stop.name).join(' → ')
                : '还没有地点'}
            </ThemedText>
            <Link href="/itinerary" style={styles.link}>
              <ThemedText type="smallBold" style={{ color: theme.accent }}>
                编辑行程
              </ThemedText>
            </Link>
          </View>
          <RouteMap stops={activeDay.stops} />
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
  summary: {
    borderRadius: 16,
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  link: {
    alignSelf: 'flex-start',
  },
});
