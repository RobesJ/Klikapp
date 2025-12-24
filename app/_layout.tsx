import { AuthProvider } from "@/context/authContext";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "../global.css";

export default function RootLayout() {
  
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AuthProvider>
          <Stack 
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: '#13122B' }
            }}
          >

            <Stack.Screen 
              name="index" 
              options={{ 
                headerShown: false }} 
            />

            <Stack.Screen
              name="(drawer)"
              options={{ headerShown: false }}
            />

            <Stack.Screen
              name="addClientScreen"
              options={{   
                headerShown: false,
                presentation: 'modal',
                animation: 'slide_from_bottom'
              }}
            />

            <Stack.Screen
              name="addObjectScreen"
              options={{   
                headerShown: false,
                animation: 'slide_from_bottom',
                presentation: 'modal'
            }}
            />
            <Stack.Screen 
              name="addProjectScreen"
              options={{   
                headerShown: false,
                animation: 'slide_from_bottom',
                presentation: 'modal'
            }}
            />

            <Stack.Screen
              name="(auth)/login"
              options={{ 
                headerShown: false,
                animation: 'slide_from_right'
               }}
            />
            <Stack.Screen
              name="(auth)/register"
              options={{ 
                headerShown: false,
                animation: 'slide_from_right'
               }}
            />
            <Stack.Screen 
              name="(auth)/forgot-pwd" 
              options={{ 
                headerShown: false,
                animation: 'slide_from_right'
              }}
            />
            <Stack.Screen 
              name="(auth)/reset-pwd" 
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="settings" 
              options={{ 
                headerShown: false,
                animation: 'none' //'slide_from_right' 
              }}
            />
          </Stack>
        </AuthProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
