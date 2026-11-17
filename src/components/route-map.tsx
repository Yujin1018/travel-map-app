import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { MapboxWebMap } from '@/components/mapbox-web-map';
import { SchematicMap } from '@/components/schematic-map';
import { SetupNotice } from '@/components/setup-notice';
import { ThemedText } from '@/components/themed-text';
import { getMapboxPublicToken } from '@/lib/mapbox';
import type { Stop } from '@/types/itinerary';

export function RouteMap({ stops }: { stops: Stop[] }) {
  const token = getMapboxPublicToken();
  const [mapFailed, setMapFailed] = useState(false);

  useEffect(() => {
    setMapFailed(false);
  }, [token]);

  return (
    <View style={styles.stack}>
      {!token ? <SetupNotice /> : null}
      {token && mapFailed ? (
        <ThemedText type="small" themeColor="textSecondary">
          地图没有加载成功，下面改成示意路线。可以检查网络和公开令牌后再打开。
        </ThemedText>
      ) : null}
      {token && !mapFailed ? (
        <MapboxWebMap token={token} stops={stops} onFail={() => setMapFailed(true)} />
      ) : (
        <SchematicMap stops={stops} />
      )}
      <ThemedText type="small" themeColor="textSecondary">
        连线只表示这一天的访问顺序，还不是实际道路。
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 8,
  },
});
