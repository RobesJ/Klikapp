import ProjectForm from '@/components/forms/projectForm';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AddProjectScreen() {
  const router = useRouter();
  const { project, mode, preselectedClient } = useLocalSearchParams();

  const parsedProject = project ? JSON.parse(project as string) : undefined;
  const parsedClient =  preselectedClient ? JSON.parse(preselectedClient as string) : undefined;

  const handleSuccess = (project: any) => {
    router.back();
  };

  return (
    <SafeAreaView className='flex-1'>
        <KeyboardAvoidingView
            behavior={Platform.OS === "android" ? "padding" : "height"}
            className='flex-1'
        >
          <View>
            <ProjectForm
              mode={(mode as "create" | "edit") || "create"}
              initialData={parsedProject}
              onSuccess={handleSuccess}
              preselectedClient={parsedClient}
            >
          </ProjectForm>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}