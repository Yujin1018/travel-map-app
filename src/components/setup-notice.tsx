import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function SetupNotice() {
  const theme = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.route }]}>
      <ThemedText type="smallBold">地图令牌还没配置</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        把项目根目录的 .env.example 复制成 .env，填入 EXPO_PUBLIC_MAPBOX_TOKEN。只使用以 pk.
        开头的公开令牌，不要填写 sk. 秘密令牌。保存后重新运行 npx expo start。
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        现在不必配置也能看行程。下面是按顺序排好的示意路线，不是真实地图。
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderLeftWidth: 4,
    borderRadius: 16,
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
});
