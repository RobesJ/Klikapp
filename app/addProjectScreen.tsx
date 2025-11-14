import ProjectForm from '@/components/forms/projectForm';
import { useProjectStore } from "@/store/projectStore";
import { ProjectWithRelations } from "@/types/projectSpecific";
import { useLocalSearchParams, useRouter } from 'expo-router';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';


export default function AddProjectScreen() {
  const router = useRouter();
  const { addProject, updateProject } = useProjectStore();
  const { project, mode, preselectedClient } = useLocalSearchParams();

  const parsedProject = project ? (JSON.parse(project as string) as ProjectWithRelations) : undefined;
  const parsedClient =  preselectedClient ? JSON.parse(preselectedClient as string) : undefined;

  const handleSuccess = (projectData: ProjectWithRelations) => {
    if (mode === "create"){
      addProject(projectData);
    }
    else{
      updateProject(projectData.project.id, projectData);
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