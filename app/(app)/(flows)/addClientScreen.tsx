import ClientForm from '@/components/forms/clientForm';
import { useAuth } from '@/context/authContext';
import { supabase } from '@/lib/supabase';
import { useClientStore } from '@/store/clientStore';
import { Client } from '@/types/generics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AddClientScreen(){
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    const { addClient, updateClient, unlockClient } = useClientStore();
    const { mode, client } = useLocalSearchParams();
    const parsedClient = client ? JSON.parse(client as string) : undefined;

    // unlock client when leaving client form
    useEffect(() => {
        return () => {
            if (mode === "edit" && user && parsedClient){
                unlockClient(parsedClient?.id, user?.id);
            }
        }
    }, [mode, user?.id, parsedClient]);

    /// lock renewal in intervals
    useEffect(() => {
        if(!user || mode === "create") return;
    
        const interval = setInterval(() => {
            supabase
                .from('clients')
                .update({ lock_expires_at: new Date(Date.now() + 5 * 60 * 1000) })
                .eq('id', parsedClient.id)
                .eq('locked_by', user.id);
        }, 120_000);

        return () => clearInterval(interval);      
    }, [ parsedClient?.id, user?.id, mode]);


    const handleSuccess = (client: Client) => {
        if (mode === "create"){
            addClient(client);
        }
        else{
            updateClient(client.id, client);
            if(user){
                unlockClient(parsedClient?.id, user?.id);
            }
        }
        router.back();
    };

    return (
        <View 
            style={{
                paddingTop: insets.top,
                paddingBottom: insets.bottom,
                flex: 1
            }}
            className="bg-dark-bg"
        >
            <ClientForm
                mode={(mode as "create" | "edit") || "create"}
                initialData={parsedClient}
                onSuccess={handleSuccess}
            />
        </View>
    );
}