import { Platform, Text, TextProps } from 'react-native';

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