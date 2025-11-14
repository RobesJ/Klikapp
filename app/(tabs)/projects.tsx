import ProjectDetails from '@/components/cardDetails/projectDetails';
import ProjectCard from '@/components/projectCard';
import { useProjectStore } from '@/store/projectStore';
import { ProjectWithRelations } from "@/types/projectSpecific";
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';


export default function Projects() {
  
  const [showDetails, setShowDetails] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectWithRelations | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const {
    filteredProjects,
    backgroundLoading,
    fetchProjects,
    filters,
    setFilters,
    clearFilters
  } = useProjectStore();

  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      fetchProjects(50);
    }, [])
  );
  

  const handleRefresh = () => {
    fetchProjects(50);
  };

  const handleModalVisibility = (projectData: ProjectWithRelations, value: boolean) => {
    setSelectedProject(projectData);
    setShowDetails(value);
  };

  return (
    <SafeAreaView className="flex-1">
      <View className="flex-2 mt-4 px-6 mb-8">
        <View className="flex-row justify-between">
          <Text className="font-bold text-4xl">Projekty</Text>
          <Text className="text-xl text-green-500">ONLINE</Text>
        </View>
        <View className='flex-2 w-full mt-4'> 
          <TextInput 
            className='border-2 rounded-xl border-gray-500 py-4 px-4'
            placeholder='Vyhladajte klienta...'
          />
        
        </View>
      </View>
      
      <FlatList
        data={filteredProjects}
        keyExtractor={(item) => item.project.id}
        renderItem={({item}) =>(
          <ProjectCard
              project={item.project}
              client={item.client}
              users={item.users}
              objects={item.objects}
              onPress={() => handleModalVisibility(item, true)}
          />
        )}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
        refreshing={backgroundLoading}
        onRefresh={handleRefresh}
        ListEmptyComponent={
          backgroundLoading ? (
            <Text className="text-center text-gray-500 mt-10">Načítavam...</Text>
          ) : (
            <Text className="text-center text-gray-500 mt-10">Žiadne projekty</Text>
          )
        }
      />
      
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
                          mode: "edit", 
                          preselectedClient: JSON.stringify(selectedProject?.client)
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