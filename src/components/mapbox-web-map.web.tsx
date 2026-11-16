import { createElement } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { buildMapHtml } from '@/lib/mapbox-html';
import type { Stop } from '@/types/itinerary';

/**
 * 浏览器里没有可用的 react-native-webview。
 * 这里用页面内的 iframe 加载同一份 Mapbox 页面，手机上的 Expo Go 仍使用原生 WebView。
 */
export function MapboxWebMap({
  token,
  stops,
}: {
  token: string;
  stops: Stop[];
  onFail: () => void;
}) {
  const theme = useTheme();

  return (
    <View style={[styles.frame, { backgroundColor: theme.mapSurface }]}>
      {createElement('iframe', {
        title: 'Mapbox 地图',
        srcDoc: buildMapHtml(token, stops),
        style: {
          border: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'transparent',
        },
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    height: 460,
    borderRadius: 20,
    overflow: 'hidden',
  },
});
