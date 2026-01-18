// Draggable Project Card Component used in Planning screen
import ProjectCard from '@/components/cards/projectCard';
import { ProjectWithRelations } from '@/types/projectSpecific';
import { Dimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming
} from 'react-native-reanimated';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.4;

interface SwipeableProjectCardProps {
    project: ProjectWithRelations;
    swipeDirection: "left" | "right";
    onSwipe: () => void;
    onPress: () => void
}

export default function SwipeableProjectCard({ 
    project,
    swipeDirection,
    onSwipe,
    onPress,
}: SwipeableProjectCardProps) {
  
    const translateX = useSharedValue(0);

    const panGesture = Gesture.Pan()
        .activeOffsetX([-20, 20])  
        .failOffsetY([-10, 10])  
        .onChange((e) => {
            const allowed = swipeDirection === "right"
              ? e.translationX > 0
              : e.translationX < 0;

            if (allowed) translateX.value = e.translationX;
        })
        .onEnd(e => {
            if (Math.abs(e.translationX) > SWIPE_THRESHOLD){  
              
                translateX.value = withTiming(
                  swipeDirection === "right" ? SCREEN_WIDTH : - SCREEN_WIDTH, 
                  { duration: 300 }, 
                  () => {
                      runOnJS(onSwipe)();
                  }
                );
            }
            else {
                translateX.value = withSpring(0);
            }
        });

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }]
    }));

    return (
        <View className='mb-2 overflow-hidden'>
            <GestureDetector gesture={panGesture}>
                <Animated.View style={animatedStyle}>
                    <ProjectCard
                      project={project.project}
                      client={project.client}
                      users={project.users}
                      objects={project.objects}
                      onPress={onPress}
                    />
                </Animated.View>
            </GestureDetector> 
        </View>
    );
}