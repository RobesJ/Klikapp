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
  numberOfLines,
  ...props 
}) => {
  // Extract font size from className and apply normalized size
  const runtimeStyle = useMemo((): TextStyle => {
    // Match text-{size} pattern
    const sizeMatch = className.match(/text-(xs|sm|base|lg|xl|2xl|3xl|4xl)/);
    
    if (sizeMatch) {
      const sizeKey = sizeMatch[1] as keyof typeof FONT_SIZES;
      return { fontSize: FONT_SIZES[sizeKey] };
    }
    
    return {};
  }, [className]);

  const cleanClassName = className.replace(/text-(xs|sm|base|lg|xl|2xl|3xl|4xl)/g, '').trim();

  return (
    <RNText 
      className={cleanClassName}
      style={[runtimeStyle, style]}
      allowFontScaling={allowFontScaling}
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      numberOfLines={numberOfLines}
      {...props}
    >
      {children}
    </RNText>
  );
};

// Typography component variants
export const Heading1: React.FC<TextProps> = ({ className = '', ...props }) => (
  <Text className={`text-3xl font-bold ${className}`} {...props} />
);

export const Heading2: React.FC<TextProps> = ({ className = '', ...props }) => (
  <Text className={`text-2xl leading-none font-bold ${className}`} {...props} />
);

export const Heading3: React.FC<TextProps> = ({ className = '', ...props }) => (
  <Text className={`text-xl leading-none ${className}`} {...props} />
);

export const Body: React.FC<TextProps> = ({ className = '', ...props }) => (
  <Text className={`text-base leading-none ${className}`} {...props} />
);

export const BodyLarge: React.FC<TextProps> = ({ className = '', ...props }) => (
  <Text className={`text-lg leading-none ${className}`} {...props} />
);

export const BodySmall: React.FC<TextProps> = ({ className = '', ...props }) => (
  <Text className={`text-sm leading-none ${className}`} {...props} />
);

export const Caption: React.FC<TextProps> = ({ className = '', ...props }) => (
  <Text className={`text-xs leading-none ${className}`} {...props} />
);