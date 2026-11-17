import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { ThemedText } from '@/components/themed-text';
import { useMapFrameHeight } from '@/hooks/use-map-frame';
import { useTheme } from '@/hooks/use-theme';
import { buildMapHtml } from '@/lib/mapbox-html';
import type { Stop } from '@/types/itinerary';

export function MapboxWebMap({
  token,
  stops,
  onFail,
}: {
  token: string;
  stops: Stop[];
  onFail: () => void;
}) {
  const theme = useTheme();
  const frameHeight = useMapFrameHeight();
  const stopKey = stops.map((stop) => `${stop.id}:${stop.latitude}:${stop.longitude}`).join('|');

  return (
    <View style={[styles.frame, { backgroundColor: theme.mapSurface, height: frameHeight }]}>
      <WebView
        key={stopKey}
        originWhitelist={['*']}
        source={{ html: buildMapHtml(token, stops), baseUrl: 'https://localhost' }}
        style={[styles.webView, { height: frameHeight }]}
        javaScriptEnabled
        domStorageEnabled
        setSupportMultipleWindows={false}
        androidLayerType="hardware"
        startInLoadingState
        renderLoading={() => (
          <View style={[styles.loading, { backgroundColor: theme.mapSurface }]}>
            <ThemedText type="small" themeColor="textSecondary">
              正在打开地图…
            </ThemedText>
          </View>
        )}
        onError={onFail}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    height: 460,
    borderRadius: 20,
    overflow: 'hidden',
  },
  webView: {
    height: 460,
    backgroundColor: 'transparent',
  },
  loading: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
