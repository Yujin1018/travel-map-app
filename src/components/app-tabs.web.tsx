import {
  TabList,
  Tabs,
  TabSlot,
  TabTrigger,
  type TabListProps,
  type TabTriggerSlotProps,
} from 'expo-router/ui';
import { Pressable, StyleSheet, View, type PressableProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function AppTabs() {
  return (
    <View style={styles.fill}>
      <Tabs>
        <TabSlot style={styles.fill} />
        <TabList asChild>
          <CustomTabList>
            <TabTrigger name="map" href="/" asChild>
              <TabButton>地图</TabButton>
            </TabTrigger>
            <TabTrigger name="itinerary" href="/itinerary" asChild>
              <TabButton>行程</TabButton>
            </TabTrigger>
          </CustomTabList>
        </TabList>
      </Tabs>
    </View>
  );
}

export function TabButton({ children, isFocused, ...props }: TabTriggerSlotProps) {
  const theme = useTheme();

  return (
    <Pressable
      {...(props as PressableProps)}
      style={({ pressed }) => (pressed ? styles.pressed : undefined)}>
      <ThemedView
        style={[
          styles.tabButton,
          { backgroundColor: isFocused ? theme.backgroundSelected : 'transparent' },
        ]}>
        <ThemedText type="smallBold" style={{ color: isFocused ? theme.accent : theme.textSecondary }}>
          {children}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  const theme = useTheme();

  return (
    <View {...props} style={[styles.tabList, { backgroundColor: theme.background }]}>
      <ThemedView
        type="backgroundElement"
        style={[styles.inner, { borderColor: theme.backgroundSelected }]}>
        <ThemedText type="smallBold" style={styles.brand}>
          旅行地图
        </ThemedText>
        {props.children}
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  tabList: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.three,
    paddingTop: Spacing.two,
  },
  inner: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
    borderWidth: 1,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  brand: {
    marginRight: 'auto',
  },
  pressed: {
    opacity: 0.7,
  },
  tabButton: {
    borderRadius: 12,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
});
