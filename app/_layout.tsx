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
          options={{   
            headerShown: false
            /*title: "Vytvoriť klienta",
            headerTitleAlign: 'center',
            headerStyle: { backgroundColor: '#0c1026f0' },
            headerTintColor: '#d6d3d1',
            headerTitleStyle: {
              fontSize: 28,
              fontWeight: 'semibold'
            }
              */
        }}
        />
        <Stack.Screen
          name="addObjectScreen"
          options={{   
            headerShown: false
            /*title: "Vytvoriť klienta",
            headerTitleAlign: 'center',
            headerStyle: { backgroundColor: '#0c1026f0' },
            headerTintColor: '#d6d3d1',
            headerTitleStyle: {
              fontSize: 28,
              fontWeight: 'semibold'
            }
              */
        }}
        />
        <Stack.Screen 
          name="addProjectScreen"
          options={{   
            headerShown: false
            /*title: "Vytvoriť klienta",
            headerTitleAlign: 'center',
            headerStyle: { backgroundColor: '#0c1026f0' },
            headerTintColor: '#d6d3d1',
            headerTitleStyle: {
              fontSize: 28,
              fontWeight: 'semibold'
            }
              */
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
  );
}
