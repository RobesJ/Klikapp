import { useAuth } from "@/context/authContext";
import { Redirect, Stack } from "expo-router";

export default function AuthLayout() {
    const { user, loading } = useAuth();
    
    if (!loading && user) {
        <Redirect href="/(tabs)/home"/>;
    }

    return (
        <Stack>
            <Stack.Screen name="login"/> 
            <Stack.Screen name="register"/>
        </Stack>
    );
}