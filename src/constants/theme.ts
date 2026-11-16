/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://unistyl.es/), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#1C2430',
    background: '#F4EFE6',
    backgroundElement: '#FFFCF7',
    backgroundSelected: '#E4F1EE',
    textSecondary: '#5C6B73',
    accent: '#0E6B63',
    route: '#C4622D',
    danger: '#9C3B2E',
    mapSurface: '#D7E6E4',
    mapGrid: '#C5D8D5',
  },
  dark: {
    text: '#F6F1E8',
    background: '#101614',
    backgroundElement: '#1B2622',
    backgroundSelected: '#243833',
    textSecondary: '#B7C4BE',
    accent: '#8ED9CF',
    route: '#E39A62',
    danger: '#F0A297',
    mapSurface: '#1A2C2A',
    mapGrid: '#2C4441',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
