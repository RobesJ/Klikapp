import ProjectForm from '@/components/forms/projectForm';
import { useAuth } from '@/context/authContext';
import { supabase } from '@/lib/supabase';
import { useClientStore } from '@/store/clientStore';
import { useProjectStore } from "@/store/projectStore";
import { ProjectWithRelations } from "@/types/projectSpecific";
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AddProjectScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { addProject, updateProject, unlockProject } = useProjectStore();
  const { project, mode, preselectedClientID } = useLocalSearchParams();

  const parsedProject = project ? (JSON.parse(project as string) as ProjectWithRelations) : undefined;
  const parsedClientId = preselectedClientID ? preselectedClientID as string : undefined;
  const { updateClientCounts } = useClientStore();

  // unlock project when leaving project form
  useEffect(() => {
    return () => {
      if (mode === "edit" && parsedProject?.project.id && user){
        unlockProject(parsedProject?.project.id, user.id);
      }
    }
  },[parsedProject?.project.id, user?.id]);

  // lock renewal in intervals
  useEffect(() => {
    if(!user) return;
    
    const interval = setInterval(() => {
        supabase
          .from('objects')
          .update({ lock_expires_at: new Date(Date.now() + 5 * 60 * 1000) })
          .eq('id', parsedProject?.project.id,)
          .eq('locked_by', user.id);
      }, 120_000);

    return () => clearInterval(interval);
  }, [parsedProject?.project.id, user?.id]);

  // if success adding / updating project in store
  const handleSuccess = (projectData: ProjectWithRelations) => {
    if (mode === "create"){
      if(projectData.project){
        addProject(projectData);        
        updateClientCounts(projectData.client.id, 1,0);
      }
    }
    else{
        updateProject(projectData.project?.id , projectData, false);
        if (projectData.project && user){
          unlockProject(projectData.project.id, user.id);
        }
    }
    router.back();
  };

  return (
    <SafeAreaView className= "flex-1 bg-dark-bg">
      <ProjectForm
          mode={(mode as "create" | "edit") || "create"}
          initialData={parsedProject}
          onSuccess={handleSuccess}
          preselectedClientID={parsedClientId}
      />
    </SafeAreaView>
  );
}