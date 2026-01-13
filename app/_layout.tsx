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
                        contentStyle: { backgroundColor: '#0c1026f0' }
                      }}
                    >
                      <Stack.Screen 
                        name="index" 
                        options={{ headerShown: false }} 
                      />
                      <Stack.Screen 
                        name="(auth)" 
                        options={{ headerShown: false }} 
                      />
                      <Stack.Screen 
                        name="(app)" 
                        options={{ headerShown: false }} 
                      />
                    </Stack>
                </AuthProvider>
            </GestureHandlerRootView>
        </SafeAreaProvider>
    );
} 
