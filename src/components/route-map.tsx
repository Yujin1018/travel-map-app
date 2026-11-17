import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { MapboxWebMap } from '@/components/mapbox-web-map';
import { SchematicMap } from '@/components/schematic-map';
import { SetupNotice } from '@/components/setup-notice';
import { ThemedText } from '@/components/themed-text';
import { getMapboxPublicToken } from '@/lib/mapbox';
import { hasCoordinates } from '@/lib/places';
import type { Stop } from '@/types/itinerary';

export function RouteMap({ stops }: { stops: Stop[] }) {
  const token = getMapboxPublicToken();
  const located = stops.filter(hasCoordinates);
  const unresolved = stops.length - located.length;
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
      {unresolved > 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          有 {unresolved} 个地点这次没有坐标，地图上先不画。搜索得到的坐标不会保存。
        </ThemedText>
      ) : null}
      {token && !mapFailed ? (
        <MapboxWebMap token={token} stops={located} onFail={() => setMapFailed(true)} />
      ) : (
        <SchematicMap stops={located} />
      )}
      <ThemedText type="small" themeColor="textSecondary">
        连线只表示这一天的访问顺序，是直线，不是道路，也不是交通时间。
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 8,
  },
});
