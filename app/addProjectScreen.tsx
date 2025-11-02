import ProjectForm from '@/components/forms/projectForm';
import { useRouter } from 'expo-router';
import { KeyboardAvoidingView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AddProjectScreen() {
  const router = useRouter();

  const handleSuccess = (project: any) => {
    router.back();
  }

  const handleCancel = () => {
    router.back();
  }
  
  return (
    <SafeAreaView className='flex-1'>
        <KeyboardAvoidingView>
      <View>
        <ProjectForm
          mode="create"
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        >
        </ProjectForm>
      </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}