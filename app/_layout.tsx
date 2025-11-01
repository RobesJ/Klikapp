import { AuthProvider } from "@/context/authContext";
import { Stack } from "expo-router";
import "../global.css";

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack >
        <Stack.Screen
          name="(tabs)"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="addClientScreen"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="(auth)/login"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="(auth)/register"
          options={{ headerShown: false }}
        />
      </Stack>
    </AuthProvider>
  );
}
