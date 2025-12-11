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
              headerShown: false

          }}
          />
          <Stack.Screen
            name="addObjectScreen"
            options={{   
              headerShown: false
          }}
          />
          <Stack.Screen 
            name="addProjectScreen"
            options={{   
              headerShown: false
          }}
          />

          <Stack.Screen
            name="(auth)/login"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="(auth)/register"
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="(auth)/forgot-pwd" 
            options={{ headerShown: false }}
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
