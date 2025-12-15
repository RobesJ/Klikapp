import { AuthProvider } from "@/context/authContext";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "../global.css";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <Stack >
          <Stack.Screen
            name="(drawer)"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="addClientScreen"
            options={{   
              headerShown: false,
              animation: 'slide_from_bottom',
              presentation: 'modal'
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
        </Stack>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
