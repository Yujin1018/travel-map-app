import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { DaySwitcher } from '@/components/day-switcher';
import { RouteMap } from '@/components/route-map';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useItinerary } from '@/state/itinerary-context';

export default function MapScreen() {
  const theme = useTheme();
  const { activeDay, itinerary, wishlist, ready, selectDay } = useItinerary();

  return (
    <Screen scroll>
      <View style={styles.header}>
        <ThemedText type="subtitle" style={styles.title}>
          旅行地图
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          地图显示当前选中的这一天。地点之间的线只表示访问顺序。
        </ThemedText>
      </View>

      {!ready || !activeDay || !itinerary ? (
        <ThemedText type="small" themeColor="textSecondary">
          正在读取行程…
        </ThemedText>
      ) : (
        <>
          <DaySwitcher days={itinerary.days} activeDayId={activeDay.id} onSelect={selectDay} />
          <View style={[styles.summary, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="smallBold">
              {activeDay.dateLabel}
              {activeDay.title !== activeDay.dateLabel ? ` · ${activeDay.title}` : ''}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {activeDay.stops.length > 0 ? activeDay.stops.map((stop) => stop.name).join(' → ') : '这一天还没有地点'}
            </ThemedText>
            {wishlist.length > 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                还有 {wishlist.length} 个想去的地点没排进某一天。
              </ThemedText>
            ) : null}
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
