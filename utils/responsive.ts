import { Dimensions, PixelRatio, Platform } from 'react-native';

// Get device dimensions
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Benchmark configuration
const BENCHMARK_WIDTH = 375; // iPhone 11/12/13/14 standard width
const BENCHMARK_PIXEL_RATIO = 2.3; // Standard @2x displays

// Device size categories
export const DEVICE_SIZE = {
  SMALL: 'small',
  MEDIUM: 'medium',
  LARGE: 'large',
} as const;

export type DeviceSize = typeof DEVICE_SIZE[keyof typeof DEVICE_SIZE];

// Determine device size category
export const getDeviceSize = (): DeviceSize => {
  if (SCREEN_WIDTH < 320) return DEVICE_SIZE.SMALL;
  if (SCREEN_WIDTH > 500) return DEVICE_SIZE.LARGE;
  return DEVICE_SIZE.MEDIUM;
};

// Device info interface
export interface DeviceInfo {
  width: number;
  height: number;
  pixelRatio: number;
  fontScale: number;
  size: DeviceSize;
  platform: 'ios' | 'android' | 'windows' | 'macos' | 'web';
  isSmallDevice: boolean;
  isLargeDevice: boolean;
}

// Get current device info
export const DEVICE_INFO: DeviceInfo = {
  width: SCREEN_WIDTH,
  height: SCREEN_HEIGHT,
  pixelRatio: PixelRatio.get(),
  fontScale: PixelRatio.getFontScale(),
  size: getDeviceSize(),
  platform: Platform.OS as DeviceInfo['platform'],
  isSmallDevice: SCREEN_WIDTH < 320,
  isLargeDevice: SCREEN_WIDTH > 500,
};

/**
 * Calculate scale factor based on screen width
 * Benchmark: 375px width = 1.0 scale
 */
export const getWidthScale = (): number => {
  return SCREEN_WIDTH / BENCHMARK_WIDTH;
};

/**
 * Calculate pixel density multiplier
 */
export const getPixelDensityMultiplier = (): number => {
  const pixelRatio = PixelRatio.get();
  
  // Linear scaling based on pixel density
  return BENCHMARK_PIXEL_RATIO / pixelRatio;
};

/**
 * Get device size multiplier
 * Small devices: slightly smaller fonts
 * Large devices: slightly larger fonts
 */
export const getDeviceSizeMultiplier = (): number => {
  const deviceSize = getDeviceSize();
  
  switch (deviceSize) {
    case DEVICE_SIZE.SMALL:
      return 0.92; 
    case DEVICE_SIZE.LARGE:
      return 1.1; 
    case DEVICE_SIZE.MEDIUM:
    default:
      return 1.0;
  }
};

// Font normalization options
export interface NormalizeFontOptions {
  respectWidth?: boolean;
  respectDensity?: boolean;
  respectDeviceSize?: boolean;
  respectFontScale?: boolean;
  maxFontScale?: number;
  minSize?: number | null;
  maxSize?: number | null;
}

/**
 * Main font normalization function
 * Combines width scaling, pixel density, and device size
 * 
 * @param baseSize - Base font size in pixels
 * @param options - Configuration options
 * @returns Normalized font size
 */
export const normalizeFont = (
  baseSize: number,
  options: NormalizeFontOptions = {}
): number => {
  const {
    respectWidth = true,
    respectDensity = true,
    respectDeviceSize = true,
    respectFontScale = true,
    maxFontScale = 1.3,
    minSize = null,
    maxSize = null,
  } = options;

  let size = baseSize;

  // Apply width-based scaling
  if (respectWidth) {
    size *= getWidthScale();
  }

  // Apply pixel density multiplier
  if (respectDensity) {
    size *= getPixelDensityMultiplier();
  }

  // Apply device size adjustment
  if (respectDeviceSize) {
    size *= getDeviceSizeMultiplier();
  }

  // Apply user's font scale (accessibility)
  if (respectFontScale) {
    const fontScale = PixelRatio.getFontScale();
    const limitedFontScale = Math.min(fontScale, maxFontScale);
    size *= limitedFontScale;
  }

  // Apply min/max constraints
  if (minSize !== null) size = Math.max(size, minSize);
  if (maxSize !== null) size = Math.min(size, maxSize);

  // Round to nearest pixel
  return Math.round(PixelRatio.roundToNearestPixel(size));
};

// Font size scale type
export type FontSizeKey = 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';

/**
 * Preset font sizes with normalization applied
 * These match Tailwind's default scale
 */
export const FONT_SIZES: Record<FontSizeKey, number> = {
  xs: normalizeFont(10),
  sm: normalizeFont(12),
  base: normalizeFont(13),
  lg: normalizeFont(15),
  xl: normalizeFont(19),
  '2xl': normalizeFont(24),
  '3xl': normalizeFont(28),
  '4xl': normalizeFont(32)
};

/**
 * Get font size for NativeWind className
 * Usage: getFontSize('text-base') → 16
 */
export const getFontSize = (className: string): number => {
  // Extract size from className (e.g., 'text-base' → 'base')
  const match = className.match(/text-(\w+)/);
  if (!match) return FONT_SIZES.base;
  
  const size = match[1] as FontSizeKey;
  return FONT_SIZES[size] || FONT_SIZES.base;
};
