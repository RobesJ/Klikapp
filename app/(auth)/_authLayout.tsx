import { useAuth } from "@/context/authContext";
import { Redirect, Stack, useRouter } from "expo-router";
import { useEffect } from "react";
import { Linking } from "react-native";

export default function AuthLayout() {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      // Handle deep links
      const handleDeepLink = (event: { url: string }) => {
        const url = event.url;

        if (url.includes('reset-pwd') || url.includes("type=recovery")) {
          router.push('/(auth)/reset-pwd');
        }
      };

      // Add listener
      const subscription = Linking.addEventListener('url', handleDeepLink);

      // Check if app was opened with a deep link
      Linking.getInitialURL().then((url) => {
        if (url){
            //console.log("Initial url:", url);
            if (url.includes('reset-pwd') || url.includes('reset-password') || url.includes('type=recovery')) {
                router.push('/(auth)/reset-pwd');
              }
        } 
      });

      return () => {
        subscription.remove();
      };
    }, []);


    if (!loading && user) {
       return <Redirect href="/(drawer)/(tabs)/home"/>
    }

    return (
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { 
            backgroundColor: '#FFFFFF'
          },
          animation: 'slide_from_right',
        }}
      >
            <Stack.Screen name="login"/> 
            <Stack.Screen name="register"/>
            <Stack.Screen name="forgot-pwd" />
            <Stack.Screen name="reset-pwd"/>
        </Stack>
    );
}