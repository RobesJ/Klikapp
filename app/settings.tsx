
/*
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useRef } from 'react';
import { Dimensions, Text, TouchableOpacity, View } from 'react-native';
import { TextInput } from 'react-native-gesture-handler';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function Settings() {
    const router = useRouter();
    const isExiting = useRef(false);

    const opacity = useSharedValue(0);
    const translateX = useSharedValue(20);
    const scale = useSharedValue(0.95);

    useFocusEffect(() => {
        const direction = -1;

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
    },);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transforms: [
            {translateX: translateX.value},
            {scale: scale.value},
        ]
    }));

 

  return (
    <SafeAreaView className= "flex-1 bg-dark-bg">
        <Animated.View style={[animatedStyle]}>
            <View className="mb-12 relative">                
                <TouchableOpacity
                    onPress={() => router.back()}
                    className="absolute top-3 left-6 w-10 h-10 items-center justify-center z-10"
                >
                  <MaterialIcons name="arrow-back" size={24} color="#d6d3d1" />
                </TouchableOpacity>
                <Text className="font-bold text-3xl text-dark-text_color top-4 text-center">
                    Nastavenia
                </Text>        
            </View>
            <View>
                <Text className="text-dark-text_color"> Zmenit pouzivatelske meno</Text>
                <TextInput
                />
                <TouchableOpacity
                    onPress={()=> router.back()}
                >
                    <Text className="text-dark-text_color">Ulozit</Text>
                </TouchableOpacity>
            </View>
        </Animated.View>
    </SafeAreaView>
  );
}
*/

import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef } from 'react';
import { BackHandler, Dimensions, Text, TouchableOpacity, View } from 'react-native';
import { TextInput } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function Settings() {
  const router = useRouter();
  const isExiting = useRef(false);
  
  const opacity = useSharedValue(0);
  const translateX = useSharedValue(SCREEN_WIDTH);
  const scale = useSharedValue(0.95);

  // Entry animation
  useFocusEffect(
    useCallback(() => {
      isExiting.current = false;
      
      // Reset values
      translateX.value = SCREEN_WIDTH;
      opacity.value = 0;
      scale.value = 0.95;
      
      // Animate in
      translateX.value = withSpring(0, {
        damping: 150,
        stiffness: 90,
      });
      opacity.value = withTiming(1, {
        duration: 100,
        easing: Easing.out(Easing.ease),
      });
      //scale.value = withSpring(1, {
      //  damping: 150,
      //  stiffness: 90,
      //});

      // Handle Android back button
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        handleBack();
        return true;
      });

      // Cleanup on unmount
      return () => {
        backHandler.remove();
      };
    }, [])
  );

  const handleBack = () => {
    if (isExiting.current) return;
    isExiting.current = true;

    // Animate out
    translateX.value = withTiming(SCREEN_WIDTH, {
      duration: 300,
      easing: Easing.in(Easing.ease),
    });
    opacity.value = withTiming(0, {
      duration: 300,
      easing: Easing.in(Easing.ease),
    }, (finished) => {
      if (finished) {
        runOnJS(router.back)();
      }
    });
    scale.value = withTiming(0.95, {
      duration: 300,
      easing: Easing.in(Easing.ease),
    });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: translateX.value },
      { scale: scale.value },
    ],
  }));

  return (
    <SafeAreaView className="flex-1 bg-dark-bg">
      <Animated.View style={[animatedStyle, { flex: 1 }]}>
        <View className="mb-12 relative">                
          <TouchableOpacity
            onPress={handleBack}
            className="absolute top-3 left-6 w-10 h-10 items-center justify-center z-10"
          >
            <MaterialIcons name="arrow-back" size={24} color="#d6d3d1" />
          </TouchableOpacity>
          <Text className="font-bold text-3xl text-dark-text_color top-4 text-center">
            Nastavenia
          </Text>        
        </View>
        <View className="px-6">
          <Text className="text-dark-text_color mb-2">Zmeniť používateľské meno</Text>
          <TextInput
            className="bg-dark-card p-4 rounded-lg text-dark-text_color mb-4"
            placeholderTextColor="#6B7280"
          />
          <TouchableOpacity
            onPress={handleBack}
            className="bg-primary p-4 rounded-lg items-center"
          >
            <Text className="text-white font-semibold">Uložiť</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}