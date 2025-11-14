import ClientForm from '@/components/forms/clientForm';
import { useClientStore } from '@/store/clientStore';
import { Client } from '@/types/generics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AddClientScreen(){
  const router = useRouter();
  const { addClient, updateClient } = useClientStore();
  const { mode, client } = useLocalSearchParams();

  const parsedClient = client ? JSON.parse(client as string) : undefined;

  const handleSuccess = (client: Client) => {
    if (mode === "create"){
      addClient(client);
    }
    else{
      updateClient(client.id, client);
    }
    router.back();
  };

  return (
    <SafeAreaView className='flex-1'>
      <KeyboardAvoidingView
            behavior={Platform.OS === "android" ? "padding" : "height"}
            className='flex-1'
      >
        <View>
        <ClientForm
            mode={(mode as "create" | "edit") || "create"}
            initialData={parsedClient}
            onSuccess={handleSuccess}
            onCancel={() =>router.back}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}