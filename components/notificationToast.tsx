import { NotificationType, useNotificationStore } from "@/store/notificationStore";
import { useEffect } from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { Body } from "./typography";

interface ToastItemProps {
    id: string;
    message: string;
    type: NotificationType;
}

const ToastItem: React.FC<ToastItemProps> = ({message, type}) => {
    const opacity = useSharedValue(0);

    useEffect(() => {
        opacity.value = withTiming(1, {duration: 300});
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
    }));
    
    const getColor = (type: NotificationType) => {
        switch (type) {
          case 'success': return '#10B981';
          case 'error': return '#EF4444';
          case 'warning': return '#F59E0B';
          case 'info': return '#3B82F6';
          default: return '#6B7280';
        }
    };

    return (
      <Animated.View
        style={[
          animatedStyle
        ]}
        className="flex-row justify-center items-center py-2 px-4 rounded-full bg-black/70"
      >
        <Body 
          className="font-bold text-white" 
          style={{color: getColor(type)}}
        >
          {message}
        </Body>
      </Animated.View>
    );
}

export const NotificationToast = ({screen} : {screen: string}) => {
    const { notifications } = useNotificationStore();
    
    const screenNotifications = notifications.filter(
        (n) => n.screen ===screen
    );

    if(screenNotifications.length === 0) return null;

    return (
        <View pointerEvents="box-none">
            {screenNotifications.map((notification) => (
              <ToastItem
                key={notification.id}
                id={notification.id}
                message={notification.message}
                type={notification.type}
              />
            ))}
        </View>
    )
}