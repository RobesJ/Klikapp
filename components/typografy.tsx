/*
import { Dimensions, Platform, Text, TextProps } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const SCALE = SCREEN_WIDTH > SCREEN_HEIGHT ? SCREEN_HEIGHT : SCREEN_WIDTH;

const BASE_WIDTH = 375;

const fontConfig = {
  small: {min: 0.8, max: 1},
  medium: {min: 0.9, max: 1.1},
  large: {min: 1, max: 1.2}
}

const getScreenSizeCategory = (): "small" | "medium" | "large" => {
  if (SCALE < 350) return "small";
  if (SCALE > 500) return "large";
  return "medium";
}
const IOS_SCALE = 0.85;

interface PlatformTextProps extends TextProps {
  className?: string;
}

// Map Tailwind classes to scaled pixel values for iOS
const getFontSize = (className: string): string => {
  if (Platform.OS !== 'ios') return className;
  
  const sizeMatches = className.match(/text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)/);
  if (!sizeMatches) return className;
  
  const size = sizeMatches[1];
  const sizeMap: { [key: string]: number } = {
    'xs': 12,
    'sm': 14,
    'base': 16,
    'lg': 18,
    'xl': 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
    '6xl': 60,
    '7xl': 72,
    '8xl': 96,
    '9xl': 128,
  };
  
  const baseSize = sizeMap[size];
  if (!baseSize) return className;
  
  const scaledSize = Math.round(baseSize * IOS_SCALE);
  
  // Replace the text-{size} class with text-[{scaled}px]
  return className.replace(`text-${size}`, `text-[${scaledSize}px]`);
};

export function PlatformText({ className = '', style, ...props }: PlatformTextProps) {
  const adjustedClassName = getFontSize(className);
  
  return <Text className={adjustedClassName} style={style} {...props} />;
}

// Convenience exports with preset sizes
export const PlatformTextXS = (props: PlatformTextProps) => (
  <PlatformText {...props} className={`text-xs ${props.className || ''}`} />
);

export const PlatformTextSM = (props: PlatformTextProps) => (
  <PlatformText {...props} className={`text-sm ${props.className || ''}`} />
);

export const PlatformTextBase = (props: PlatformTextProps) => (
  <PlatformText {...props} className={`text-base ${props.className || ''}`} />
);

export const PlatformTextLG = (props: PlatformTextProps) => (
  <PlatformText {...props} className={`text-lg ${props.className || ''}`} />
);

export const PlatformTextXL = (props: PlatformTextProps) => (
  <PlatformText {...props} className={`text-xl ${props.className || ''}`} />
);

export const PlatformText2XL = (props: PlatformTextProps) => (
  <PlatformText {...props} className={`text-2xl ${props.className || ''}`} />
);

*/
import React, { useMemo } from 'react';
import { Text as RNText, TextProps as RNTextProps, TextStyle } from 'react-native';
import { FONT_SIZES } from '../utils/responsive';

// Extended Text props
export interface TextProps extends RNTextProps {
  className?: string;
  allowFontScaling?: boolean;
  maxFontSizeMultiplier?: number;
  children?: React.ReactNode;
}

/**
 * Base Text component with normalized font sizing
 * All text in your app should use this or its variants
 * 
 * This component applies runtime font scaling to override Tailwind's
 * static sizes with device-appropriate sizes
 */
export const Text: React.FC<TextProps> = ({ 
  className = '', 
  allowFontScaling = false,
  maxFontSizeMultiplier = 1.3,
  style,
  children,
  ...props 
}) => {
  // Extract font size from className and apply normalized size
  const runtimeStyle = useMemo((): TextStyle => {
    // Match text-{size} pattern
    const sizeMatch = className.match(/text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl)/);
    
    if (sizeMatch) {
      const sizeKey = sizeMatch[1] as keyof typeof FONT_SIZES;
      return { fontSize: FONT_SIZES[sizeKey] };
    }
    
    return {};
  }, [className]);

  return (
    <RNText 
      className={className}
      style={[runtimeStyle, style]}
      allowFontScaling={allowFontScaling}
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      {...props}
    >
      {children}
    </RNText>
  );
};

// Typography component variants
export const Heading1: React.FC<TextProps> = ({ className = '', ...props }) => (
  <Text className={`text-2xl font-bold ${className}`} {...props} />
);

export const Heading2: React.FC<TextProps> = ({ className = '', ...props }) => (
  <Text className={`text-3xl font-bold ${className}`} {...props} />
);

export const Heading3: React.FC<TextProps> = ({ className = '', ...props }) => (
  <Text className={`text-2xl font-semibold ${className}`} {...props} />
);

export const Heading4: React.FC<TextProps> = ({ className = '', ...props }) => (
  <Text className={`text-xl font-semibold ${className}`} {...props} />
);

export const Body: React.FC<TextProps> = ({ className = '', ...props }) => (
  <Text className={`text-base ${className}`} {...props} />
);

export const BodyLarge: React.FC<TextProps> = ({ className = '', ...props }) => (
  <Text className={`text-lg ${className}`} {...props} />
);

export const BodySmall: React.FC<TextProps> = ({ className = '', ...props }) => (
  <Text className={`text-sm ${className}`} {...props} />
);

export const Caption: React.FC<TextProps> = ({ className = '', ...props }) => (
  <Text className={`text-xs ${className}`} {...props} />
);

export const Label: React.FC<TextProps> = ({ className = '', ...props }) => (
  <Text className={`text-sm font-medium ${className}`} {...props} />
);