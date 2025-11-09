import ClientForm from '@/components/forms/clientForm';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AddClientScreen(){
  const router = useRouter();
  const { mode, client } = useLocalSearchParams();

  const parsedClient = client ? JSON.parse(client as string) : undefined;

  const handleSuccess = (client: any) => {
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