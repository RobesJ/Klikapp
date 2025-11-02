import ObjectForm from '@/components/forms/objectForm';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AddObjectScreen() {
  const router = useRouter();

  const handleSuccess = (object: any) => {
    router.back();
  }

  const handleCancel = () => {
    router.back();
  }
  
  return (
    <SafeAreaView className='flex-1'>
      <View>
        <ObjectForm
          mode="create"
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        >
        </ObjectForm>
      </View>
    </SafeAreaView>
  );
}