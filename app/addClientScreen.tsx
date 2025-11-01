import ClientForm from '@/components/forms/ClientForm';
import { useRouter } from 'expo-router';
import { View } from 'react-native';

export default function AddClientScreen() {
  const router = useRouter();

  const handleSuccess = (client: any) => {
    router.back();
  }

  const handleCancel = () => {
    router.back();
  }
  
  return (
    
    <View className="flex-1 justify-start items-start bg-primary pt-20">
      <ClientForm
        mode="create"
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      >
      </ClientForm>
    </View>
  );
}