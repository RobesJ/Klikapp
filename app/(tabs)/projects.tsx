import ProjectDetails from '@/components/cardDetails/projectDetails';
import ProjectCard from '@/components/projectCard';
import { supabase } from '@/lib/supabase';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Project {
  id: string;
  client_id?: string;
  type: string | null;
  state: string | null;
  scheduled_date: string | null;
  start_date: string | null;
  completion_date: string | null;
  notes: string | null;
}

interface User {
  id: string;
  name: string;
  email: string | null;
}

interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  type: string | null;
  notes: string | null;
}

interface Object {
  id: string;
  client_id?: string;
  address: string | null;
  placement: string | null;
  appliance: string | null;
  note: string | null;
}

interface Chimney {
  id: string;
  type: string | null;
  labelling: string | null;
}

interface ObjectWithRelations {
  object: Object;
  chimneys: Chimney[];
}
interface ProjectWithRelations {
  project: Project;
  client: Client;
  users: User[];
  objects: ObjectWithRelations[];
}

export default function Projects() {
  const [projects, setProjects] = useState<ProjectWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectWithRelations | null>(null);

  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      fetchProjects();
    }, [])
  );

  async function fetchProjects() {
    try {
        const {data: projectsData, error: projectError } = await supabase
          .from("projects")
          .select(`
            *,
            clients (*)
          `);

        if (projectError) throw projectError;

        const projectWithRelations: ProjectWithRelations[] = await Promise.all(
          projectsData.map(async (projectItem: any) => {
            // Fetch assigned users
            const { data: usersData, error: usersError } = await supabase
              .from("project_assignments")
              .select(`
                user_profiles (
                  id,
                  name,
                  email
                )
              `)
              .eq("project_id", projectItem.id);
              
            if (usersError) throw usersError;

            // Fetch assigned objects
            const {data: objectsData, error: objectsError} = await supabase
                .from("project_objects")
                .select(`
                  objects (
                    id,
                    client_id,
                    address,
                    placement,
                    appliance,
                    note
                  )
                `)
                .eq("project_id", projectItem.id);
                
            if (objectsError) throw objectsError;

            const users: User[] =
              usersData?.map((item: any) => item.user_profiles).filter(Boolean) ?? [];
            
            const objectIds = objectsData?.map((item: any) => item.objects?.id).filter(Boolean) ?? [];

            // Fetch chimneys for all objects at once
            let objectsWithChimneys: ObjectWithRelations[] = [];
            
            if (objectIds.length > 0) {
              const { data: chimneysData, error: chimneysError } = await supabase
                .from("chimneys")
                .select(`
                  object_id,
                  chimney_types (
                    id,
                    type,
                    labelling
                  )
                `)
                .in("object_id", objectIds);

              if (chimneysError) throw chimneysError;

              // Group chimneys by object_id
              const chimneysByObject: Record<string, Chimney[]> = {};
              chimneysData?.forEach((item: any) => {
                if (!chimneysByObject[item.object_id]) {
                  chimneysByObject[item.object_id] = [];
                }
                if (item.chimney_types) {
                  chimneysByObject[item.object_id].push({
                    id: item.chimney_types.id,
                    type: item.chimney_types.type,
                    labelling: item.chimney_types.labelling
                  });
                }
              });

              // Combine objects with their chimneys
              objectsWithChimneys = objectsData
                ?.map((item: any) => {
                  if (!item.objects) return null;
                  return {
                    object: item.objects,
                    chimneys: chimneysByObject[item.objects.id] || []
                  };
                })
                .filter((item): item is ObjectWithRelations => item !== null) ?? [];
            }

            return {
              project: { ...projectItem },
              client: projectItem.clients,
              users,
              objects: objectsWithChimneys,
            };
          })
        );
        
        setProjects(projectWithRelations);
    } catch (error: any){
      console.error("Error fetching projects: ", error.message)
    } finally{
      setLoading(false);
    }
  }

  const handleModalVisibility = (projectData: ProjectWithRelations, value: boolean) => {
    setSelectedProject(projectData);
    setShowDetails(value);
  };

  return (
    <SafeAreaView className="flex-1">
      <View className="flex-row items-start mt-4 ml-6 mb-6">
        <Text className="font-bold text-4xl">Projekty</Text>
      </View>
      <ScrollView className="px-5 mb-24">
      {loading ?
          ( <Text>Loading...</Text>)
          : (
            projects.map(projectData => (
                <ProjectCard 
                  key={projectData.project.id} 
                  project={projectData.project}
                  client={projectData.client}
                  users={projectData.users}
                  objects={projectData.objects}
                  onPress={()=>handleModalVisibility(projectData, true)}
                />
              ))
            )
        }
      </ScrollView>
      <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => {router.push({
        pathname: "/addProjectScreen",
        params: { mode: "create" }
      })}}
      style={{
        position: 'absolute',
        bottom: 130,
        right: 24,
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#000000',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
      }}
    >
      <Text 
        className='text-white text-3xl'>
        +
      </Text>
      </TouchableOpacity>
      <Modal
        visible={showDetails}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDetails(false)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center">
          <View className="w-3/4 bg-white rounded-2xl overflow-hidden">
            {/* Header */}
            <View className="px-4 py-6 border-b border-gray-200">
              <View className="flex-row items-center justify-between">
                <Text className="text-xl font-bold">Detaily projektu</Text>

                <View className="flex-row gap-2">
                  <TouchableOpacity
                    onPress={() => {
                      setShowDetails(false);
                      router.push({
                        pathname: "/addProjectScreen",
                        params: { 
                          project: JSON.stringify(selectedProject), 
                          mode: "edit" 
                        }
                      });
                    }}
                    activeOpacity={0.8}
                    className="w-8 h-8 bg-blue-100 rounded-full items-center justify-center"
                  >
                    <Text className="text-blue-600 font-bold">✏️</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    onPress={() => setShowDetails(false)}
                    className="w-8 h-8 bg-gray-100 rounded-full items-center justify-center"
                  >
                    <Text className="text-gray-600 font-bold">✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
                  
            <ScrollView className="max-h-96 p-4">
              {selectedProject && (
                <ProjectDetails 
                  project={selectedProject.project}
                  client={selectedProject.client}
                  assignedUsers={selectedProject.users} 
                  objects={selectedProject.objects}/>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}