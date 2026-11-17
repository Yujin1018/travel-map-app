import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useMapFrameHeight } from '@/hooks/use-map-frame';
import { useTheme } from '@/hooks/use-theme';
import { hasCoordinates } from '@/lib/places';
import type { Stop } from '@/types/itinerary';

type Point = {
  stop: Stop;
  index: number;
  x: number;
  y: number;
};

function projectStops(input: Stop[], width: number, height: number): Point[] {
  const stops = input.filter(hasCoordinates);
  if (stops.length === 0 || width <= 0 || height <= 0) {
    return [];
  }

  const padX = 48;
  const padY = 42;
  let minLat = Math.min(...stops.map((stop) => stop.latitude));
  let maxLat = Math.max(...stops.map((stop) => stop.latitude));
  let minLng = Math.min(...stops.map((stop) => stop.longitude));
  let maxLng = Math.max(...stops.map((stop) => stop.longitude));

  if (maxLat - minLat < 0.02) {
    minLat -= 0.01;
    maxLat += 0.01;
  }
  if (maxLng - minLng < 0.02) {
    minLng -= 0.01;
    maxLng += 0.01;
  }

  const innerWidth = Math.max(width - padX * 2, 1);
  const innerHeight = Math.max(height - padY * 2, 1);

  return stops.map((stop, index) => ({
    stop,
    index,
    x: padX + ((stop.longitude - minLng) / (maxLng - minLng)) * innerWidth,
    y: padY + ((maxLat - stop.latitude) / (maxLat - minLat)) * innerHeight,
  }));
}

export function SchematicMap({ stops }: { stops: Stop[] }) {
  const theme = useTheme();
  const frameHeight = useMapFrameHeight();
  const located = stops.filter(hasCoordinates);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const points = projectStops(located, size.width, size.height);
  const grid: number[] = [];
  for (let position = 0; position <= Math.max(size.width, size.height); position += 36) {
    grid.push(position);
  }

  return (
    <View
      style={[styles.frame, { backgroundColor: theme.mapSurface, height: frameHeight }]}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setSize({ width, height });
      }}>
      {size.width > 0 && size.height > 0 ? (
        <Svg width={size.width} height={size.height}>
          {grid.map((position) => (
            <Line
              key={`v-${position}`}
              x1={position}
              y1={0}
              x2={position}
              y2={size.height}
              stroke={theme.mapGrid}
              strokeWidth={1}
            />
          ))}
          {grid.map((position) => (
            <Line
              key={`h-${position}`}
              x1={0}
              y1={position}
              x2={size.width}
              y2={position}
              stroke={theme.mapGrid}
              strokeWidth={1}
            />
          ))}
          {points.length >= 2 ? (
            <Polyline
              points={points.map((point) => `${point.x},${point.y}`).join(' ')}
              fill="none"
              stroke={theme.route}
              strokeWidth={3}
              strokeDasharray="7 6"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ) : null}
          {points.map((point) => (
            <Circle key={point.stop.id} cx={point.x} cy={point.y} r={14} fill={theme.accent} />
          ))}
          {points.map((point) => (
            <SvgText
              key={`${point.stop.id}-order`}
              x={point.x}
              y={point.y}
              fill="#ffffff"
              fontSize={13}
              fontWeight="700"
              textAnchor="middle"
              alignmentBaseline="central">
              {point.index + 1}
            </SvgText>
          ))}
        </Svg>
      ) : null}

      {points.map((point) => {
        const labelOnRight = point.x < size.width * 0.62;
        return (
          <View
            key={`${point.stop.id}-label`}
            pointerEvents="none"
            style={[
              styles.label,
              labelOnRight ? { left: point.x + 18 } : { right: size.width - point.x + 18 },
              { top: point.y - 12 },
            ]}>
            <ThemedText
              type="smallBold"
              numberOfLines={2}
              style={[styles.name, { backgroundColor: theme.backgroundElement, color: theme.text }]}>
              {point.stop.name}
            </ThemedText>
          </View>
        );
      })}

      {stops.length === 0 ? (
        <View style={styles.empty} pointerEvents="none">
          <ThemedText type="smallBold">这一天还没有地点</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            到「行程」页添加后，会按顺序出现在这里。
          </ThemedText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    height: 460,
    borderRadius: 20,
    overflow: 'hidden',
  },
  label: {
    position: 'absolute',
    width: 128,
    gap: 2,
  },
  name: {
    overflow: 'hidden',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  empty: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    padding: Spacing.four,
  },
});
