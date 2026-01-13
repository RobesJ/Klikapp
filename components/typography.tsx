/*import React, { useMemo } from 'react';
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
    const sizeMatch = className.match(/text-(xs|sm|base|lg|xl|2xl|3xl)/);
    
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
  <Text className={`text-3xl leading-none font-bold ${className}`} {...props} />
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

// Pre-calculate all font sizes at module level (runs once)
const FONT_SIZE_CACHE: Record<string, TextStyle> = {
  'text-xs': { fontSize: FONT_SIZES.xs },
  'text-sm': { fontSize: FONT_SIZES.sm },
  'text-base': { fontSize: FONT_SIZES.base },
  'text-lg': { fontSize: FONT_SIZES.lg },
  'text-xl': { fontSize: FONT_SIZES.xl },
  'text-2xl': { fontSize: FONT_SIZES['2xl'] },
  'text-3xl': { fontSize: FONT_SIZES['3xl'] },
  'text-4xl': { fontSize: FONT_SIZES['4xl'] },
};

// Helper to extract font size from className
const getFontSizeStyle = (className: string): TextStyle => {
  // Check cache first
  for (const [key, value] of Object.entries(FONT_SIZE_CACHE)) {
    if (className.includes(key)) {
      return value;
    }
  }
  return {};
};

/**
 * Base Text component with normalized font sizing
 */
export const Text: React.FC<TextProps> = ({ 
  className = '', 
  allowFontScaling = false,
  maxFontSizeMultiplier = 1.3,
  style,
  children,
  ...props 
}) => {
  // Only recalculate if className changes
  const runtimeStyle = useMemo((): TextStyle => {
    return getFontSizeStyle(className);
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

// Pre-defined style objects (created once)
const heading1BaseStyle: TextStyle = { 
  fontSize: FONT_SIZES['3xl'],
  fontWeight: 'bold',
  includeFontPadding: false,
};

const heading2BaseStyle: TextStyle = { 
  fontSize: FONT_SIZES['2xl'],
  fontWeight: 'bold',
  includeFontPadding: false,
};

const heading3BaseStyle: TextStyle = { 
  fontSize: FONT_SIZES.xl,
  includeFontPadding: false,
};

const bodyBaseStyle: TextStyle = { 
  fontSize: FONT_SIZES.base,
  includeFontPadding: false,
};

const bodyLargeBaseStyle: TextStyle = { 
  fontSize: FONT_SIZES.lg,
  includeFontPadding: false,
};

const bodySmallBaseStyle: TextStyle = { 
  fontSize: FONT_SIZES.sm,
  includeFontPadding: false,
};

const captionBaseStyle: TextStyle = { 
  fontSize: FONT_SIZES.xs,
  includeFontPadding: false,
};

// Typography component variants
export const Heading1: React.FC<TextProps> = ({ className = '', style, ...props }) => (
  <RNText 
    className={`font-bold ${className}`}
    style={[heading1BaseStyle, style]}
    allowFontScaling={false}
    {...props} 
  />
);

export const Heading2: React.FC<TextProps> = ({ className = '', style, ...props }) => (
  <RNText 
    className={`font-bold ${className}`}
    style={[heading2BaseStyle, style]}
    allowFontScaling={false}
    {...props} 
  />
);

export const Heading3: React.FC<TextProps> = ({ className = '', style, ...props }) => (
  <RNText 
    className={className}
    style={[heading3BaseStyle, style]}
    allowFontScaling={false}
    {...props} 
  />
);

export const Body: React.FC<TextProps> = ({ className = '', style, ...props }) => (
  <RNText 
    className={className}
    style={[bodyBaseStyle, style]}
    allowFontScaling={false}
    {...props} 
  />
);

export const BodyLarge: React.FC<TextProps> = ({ className = '', style, ...props }) => (
  <RNText 
    className={className}
    style={[bodyLargeBaseStyle, style]}
    allowFontScaling={false}
    {...props} 
  />
);

export const BodySmall: React.FC<TextProps> = ({ className = '', style, ...props }) => (
  <RNText 
    className={className}
    style={[bodySmallBaseStyle, style]}
    allowFontScaling={false}
    {...props} 
  />
);

export const Caption: React.FC<TextProps> = ({ className = '', style, ...props }) => (
  <RNText 
    className={className}
    style={[captionBaseStyle, style]}
    allowFontScaling={false}
    {...props} 
  />
);