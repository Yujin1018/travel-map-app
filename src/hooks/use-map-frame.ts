import { useWindowDimensions } from 'react-native';

/** 小屏上地图矮一些，横竖屏变化时跟着窗口高度走。 */
export function useMapFrameHeight(): number {
  const { height } = useWindowDimensions();
  return Math.max(280, Math.min(460, Math.round(height * 0.46)));
}
