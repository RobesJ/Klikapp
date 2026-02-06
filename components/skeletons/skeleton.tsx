import { useEffect } from "react";
import { DimensionValue, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";

interface SkeletonProps {
    width?: number | string;
    height?: number | string;
    borderRadius?: number;
    className?: string;
}
  
export function Skeleton({ 
    width = '100%', 
    height = 20, 
    borderRadius = 4, 
    className = '' 
}: SkeletonProps) {
    const opacity = useSharedValue(0.3);
  
    useEffect(() => {
      opacity.value = withRepeat(
        withTiming(1, { duration: 1000 }),
        -1,
        true
      );
    }, []);
  
    const animatedStyle = useAnimatedStyle(() => ({
      opacity: opacity.value,
    }));

    const staticStyle = {
        width: width as DimensionValue,
        height: typeof height === 'number' ? height : height as DimensionValue,
        borderRadius: borderRadius,
        backgroundColor: '#374151',
    };
  
    return (
      <Animated.View
        style={[ animatedStyle, staticStyle ]}
        className={className}
      />
    );
}

function ClientCardSkeleton() {
    return (
      <View className="flex-row items-center bg-gray-800 rounded-lg p-4 mb-3">
        {/* Client avatar/image circle */}
        <Skeleton width={60} height={60} borderRadius={30} className="mr-4" />
        
        {/* Client info */}
        <View className="flex-1">
          {/* Client name */}
          <Skeleton width="70%" height={18} className="mb-2" borderRadius={4} />
          
          {/* Phone number */}
          <Skeleton width="50%" height={14} borderRadius={4} />
        </View>
      </View>
    );
}
  
// Full Clients List Skeleton
export function ClientsListSkeleton() {
    return (
      <View>
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <ClientCardSkeleton key={i} />
        ))}
      </View>
    );
}

function ObjectCardSkeleton() {
    return (
      <View className="flex-2 bg-gray-800 rounded-lg p-4 mb-3">
        {/* Client info */}
        <Skeleton width="30%" height={22} className="mb-4" borderRadius={4} />

        <View className="flex-2 px-6">
          {/* Client name */}
          <View className="flex-row justify-center items-center border-t border-gray-700 mb-2">
                <Skeleton width="70%" height={14} borderRadius={4} />
                <Skeleton width="10%" height={14} borderRadius={4} />
          </View>
          <View className="flex-row justify-center items-center border-t border-gray-700">
                <Skeleton width="70%" height={14} borderRadius={4} />
                <Skeleton width="10%" height={14} borderRadius={4} />
          </View>
        </View>
      </View>
    );
}
  
// Full Clients List Skeleton
export function ObjectsListSkeleton() {
    return (
      <View>
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <ObjectCardSkeleton key={i} />
        ))}
      </View>
    );
}

function ProjectCardSkeleton() {
    return (
      <View className="flex-2 bg-gray-800 rounded-2xl p-4 mb-3">
        <View className="flex-row  items-center justify-between mb-3">
            <Skeleton width="30%" height={30} borderRadius={4} />
            <Skeleton width="20%" height={20} borderRadius={100} />
        </View>
        <View className="flex-2">
            <Skeleton width="50%" height={14} borderRadius={4} className="mb-2"/>
            <Skeleton width="50%" height={14} borderRadius={4} className="mb-2"/>
            <Skeleton width="50%" height={14} borderRadius={4} className="mb-2"/>
        </View>
      </View>
    );
}
  
// Full Clients List Skeleton
export function ProjectsListSkeleton() {
    return (
      <View>
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <ProjectCardSkeleton key={i} />
        ))}
      </View>
    );
}

export function PlanningListSkeleton() {
    return (
      <View>
        {[1, 2, 3].map((i) => (
          <ProjectCardSkeleton key={i} />
        ))}
      </View>
    );
}