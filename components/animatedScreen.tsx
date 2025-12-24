import { useIsFocused } from '@react-navigation/native';
import { usePathname } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Dimensions } from 'react-native';
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';


const { width: SCREEN_WIDTH } = Dimensions.get('window');
interface AnimatedScreenProps {
  children: React.ReactNode;
  tabIndex: number;
}

const TAB_ORDER: { [key: string]: number} = {
    '/home': 0,
    '/clients': 1,
    '/objects': 2,
    '/projects': 3,
    '/planning': 4,
}
export function AnimatedScreen({ children, tabIndex }: AnimatedScreenProps) {
    const isFocused = useIsFocused();
    const pathName = usePathname();
    const previousIndex = useRef(tabIndex);
    const previousFocusState = useRef(true);
    const isFirstMount = useRef(true);

    const opacity = useSharedValue(0);
    const translateX = useSharedValue(20);
    const scale = useSharedValue(0.95);

    useEffect(() => {
        const currentIndex = TAB_ORDER[pathName] ?? tabIndex;

        if (isFocused) {
            
            if (isFirstMount.current){
                isFirstMount.current = false;
                opacity.value = 1;
                translateX.value = 0;
                scale.value = 1;
                previousFocusState.current = true;
                previousIndex.current = currentIndex;
                return;
            }

            if(!previousFocusState.current && previousIndex.current === currentIndex) {
                opacity.value = 0;
                scale.value = 0.98;

                opacity.value = withTiming(1, {
                    duration: 100,
                    easing: Easing.out(Easing.ease),
                });

                scale.value = withSpring(1, {
                    damping: 20,
                    stiffness: 120,
                });

                previousFocusState.current = true;
                return;
            }

            const direction = currentIndex > previousIndex.current ? 1 : -1;

            translateX.value = direction * SCREEN_WIDTH;
            opacity.value = 0;
            scale.value = 0.95;

            translateX.value = withSpring(0, {
                damping: 20,
                stiffness: 90,
            });

            opacity.value = withTiming(1, {
                duration: 400,
                easing: Easing.out(Easing.linear),
            });

            scale.value = withSpring(1, {
                damping: 20,
                stiffness: 90,
            });

            previousIndex.current = currentIndex;
            previousFocusState.current = true;
        }
        else{
            opacity.value = withTiming(0.3, {duration: 200});
            previousFocusState.current = false;
        }
 
    }, [isFocused, pathName, tabIndex]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transforms: [
        {translateX: translateX.value},
        {scale: scale.value},
    ]
  }));

  return (
    <Animated.View style={[{ flex: 1 }, animatedStyle]}>
      {children}
    </Animated.View>
  );
}