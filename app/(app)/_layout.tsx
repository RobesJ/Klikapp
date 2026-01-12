import { Stack } from "expo-router";

export default function AppLayout() {
    return (
        <Stack 
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: '#0c1026f0' }
            }}
        >
            <Stack.Screen 
              name="(drawer)" 
              options={{ 
                headerShown: false }} 
            />

            <Stack.Screen
              name="(flows)/addClientScreen"
              options={{   
                headerShown: false,
                presentation: 'modal',
                animation: 'slide_from_bottom'
              }}
            />

            <Stack.Screen
              name="(flows)/addObjectScreen"
              options={{   
                headerShown: false,
                animation: 'slide_from_bottom',
                presentation: 'modal'
            }}
            />

            <Stack.Screen 
              name="(flows)/addProjectScreen"
              options={{   
                headerShown: false,
                animation: 'slide_from_bottom',
                presentation: 'modal'
            }}
            />
        </Stack>
    );
}
