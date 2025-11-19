import ProjectDetails from '@/components/cardDetails/projectDetails';
import ProjectCard from '@/components/cards/projectCard';
import FilterModal from '@/components/filterModal';
import { useProjectStore } from '@/store/projectStore';
import { ProjectWithRelations } from "@/types/projectSpecific";
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const TYPE_OPTIONS = [
  { 
    value: "Obhliadka", 
    label: "Obhliadka", 
    color: "bg-green-50", 
    checkColor: "bg-green-600" 
  },
  { 
    value: "Montáž", 
    label: "Montáž", 
    color: "bg-blue-50", 
    checkColor: "bg-blue-600" 
  },
  { 
    value: "Revízia", 
    label: "Revízia", 
    color: "bg-red-50", 
    checkColor: "bg-amber-600" 
  },
  {
    value: "Čistenie", 
    label: "Čistenie", 
    color: "bg-yellow-50", 
    checkColor: "bg-yellow-500" 
  }
];

const STATE_OPTIONS = [
  { 
    value: "Aktívny", 
    label: "Aktívny", 
    color: "bg-green-50", 
    checkColor: "bg-green-600" 
  },
  { 
    value: "Prebieha", 
    label: "Prebieha", 
    color: "bg-yellow-50", 
    checkColor: "bg-yellow-500" 
  },
  { 
    value: "Ukončený", 
    label: "Ukončený", 
    color: "bg-gray-100", 
    checkColor: "bg-gray-600" 
  },
];

export default function Projects() {
  const router = useRouter();
  const [showDetails, setShowDetails] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectWithRelations | null>(null);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showStateModal, setShowStateModal] = useState(false);
  const [searchText, setSearchText] = useState('');

  const {
    filteredProjects,
    backgroundLoading,
    fetchProjects,
    filters,
    setFilters,
    clearFilters,
    removeFilter,
    toggleTypeFilter,
    toggleStateFilter,
    deleteProject
  } = useProjectStore();

  useFocusEffect(
    useCallback(() => {
      fetchProjects(50);
    }, [])
  );
  
  const handleRefresh = () => {
    fetchProjects(50);
  };

  const handleSearch = (text: string) => {
    setSearchText(text);
    setFilters({searchQuery: text});
  };

  const getActiveFilters = () => {
    return [
      ...filters.type.map(t => ({ type: "type" as const, value: t })),
      ...filters.state.map(s => ({ type: "state" as const, value: s }))
    ];
  };

  const activeTypeCount = filters.type.length;
  const activeStateCount = filters.state.length;

  const handleClearFilters = () => {
    setSearchText('');
    clearFilters();
  };

  const hasActiveFilters = filters.searchQuery || (filters.state.length > 0 ) || (filters.type.length > 0);

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

        {/* Search klient Input*/}
        <View className="flex-row items-center border-2 border-gray-500 rounded-xl px-4 py-2 mt-4 mb-2">
          <Ionicons name="search" size={20} color="gray" />
          <TextInput
            className="flex-1 ml-2"
            placeholder='Vyhladajte klienta alebo mesto...'
            value={searchText}
            onChangeText={handleSearch}
          />
        </View>

        <View className='flex-row'>
        {/* Type filter button */}
          <TouchableOpacity
            onPress={() => setShowTypeModal(true)}
            className="bg-white border-2 border-gray-300 rounded-xl px-4 py-4 flex-row items-center mr-2"
          >
            <Text className="mr-2">Typ projektu</Text>
            {activeTypeCount > 0 && (
              <View className="bg-blue-500 rounded-full w-4 h-4 items-center justify-center">
                <Text className="text-white text-xs font-bold">{activeTypeCount}</Text>
              </View>
            )}
            <Text className="ml-2">▼</Text>
          </TouchableOpacity>

          {/* State filter button */}
          <TouchableOpacity
            onPress={() => setShowStateModal(true)}
            className="bg-white border-2 border-gray-300 rounded-xl px-4 py-4 flex-row items-center"
          >
            <Text className="mr-2">Stav projektu</Text>
            {activeStateCount > 0 && (
              <View className="bg-blue-500 rounded-full w-4 h-4 items-center justify-center">
                <Text className="text-white text-xs font-bold">{activeStateCount}</Text>
              </View>
            )}
            <Text className="ml-2">▼</Text>
          </TouchableOpacity>

          {/* Clear filters button */}
          <View className='flex-1 items-end justify-center'>
          {hasActiveFilters && (
            <TouchableOpacity
              onPress={()=> handleClearFilters()}
              >
              <Text className='color-red-600'>
               Zrusit filtre
              </Text>
            </TouchableOpacity>
          )}
          </View>
        </View>

        {/* Active filters indicator */}
        {getActiveFilters().length > 0 && (
          <View className="px-6 mt-4">
            <View className="flex-row flex-wrap">
              {getActiveFilters().map((filter, index) => {
                // Get color based on type/value
                let pillColor = "bg-blue-100";
                let textColor = "text-blue-700";

                if (filter.type === 'type') {
                  switch(filter.value) {
                    case "Čistenie":
                      pillColor = "bg-yellow-100";
                      textColor = "text-yellow-700";
                      break;
                    case "Revízia":
                      pillColor = "bg-red-100";
                      textColor = "text-red-700";
                      break;
                    case "Obhliadka":
                      pillColor = "bg-green-100";
                      textColor = "text-green-700";
                      break;
                    case "Montáž":
                      pillColor = "bg-blue-100";
                      textColor = "text-blue-700";
                      break;
                  }
                } else {
                  switch(filter.value) {
                    case "Aktívny":
                      pillColor = "bg-green-100";
                      textColor = "text-green-700";
                      break;
                    case "Prebieha":
                      pillColor = "bg-yellow-100";
                      textColor = "text-yellow-700";
                      break;
                    case "Ukončený":
                      pillColor = "bg-gray-100";
                      textColor = "text-gray-700";
                      break;
                  }
                }

                return (
                  <TouchableOpacity
                    key={`${filter.type}-${filter.value}-${index}`}
                    onPress={() => removeFilter(filter.type, filter.value)}  // ✅ Use filter.type directly!
                    className={`${pillColor} rounded-full px-3 py-2 mr-2 mb-2 flex-row items-center`}
                  >
                    <Text className={`${textColor} font-medium mr-1`}>
                      {filter.value}
                    </Text>
                    <Text className={`${textColor} font-bold`}>✕</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
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
      
      {/* Add new project buton*/}
      <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => {router.push({
        pathname: "/addProjectScreen",
        params: { mode: "create" }
      })}}
      style={{
        position: 'absolute',
        bottom: 110,
        right: 28,
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#777777',
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
                <Text className="text-xl font-bold">{selectedProject?.project.type}</Text>

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
                    onPress={() => {
                      if(selectedProject){
                        try{
                          deleteProject(selectedProject?.project.id);
                          setShowDetails(false);
                        }
                        catch (error){
                          console.error("Delete failed:", error);
                        }
                        setSelectedProject(null);
                      }
                    }}
                    activeOpacity={0.8}
                    className="w-8 h-8 bg-blue-100 rounded-full items-center justify-center"
                  >
                    <Text className="text-blue-600 font-bold">🗑</Text>
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

      <FilterModal
          visible={showTypeModal}
          onClose={() =>setShowTypeModal(false)}
          title="Vyberte typ projektu"
          options={TYPE_OPTIONS}
          selectedCount={activeTypeCount}
          selectedValues={filters.type}
          onToggle={toggleTypeFilter}
          onClearSelection={()=>setFilters({ type: []})}
      />

      <FilterModal
          visible={showStateModal}
          onClose={() =>setShowStateModal(false)}
          title="Vyberte stav projektu"
          options={STATE_OPTIONS}
          selectedCount={activeStateCount}
          selectedValues={filters.state}
          onToggle={toggleStateFilter}
          onClearSelection={()=>setFilters({ state: []})}
      />
    </SafeAreaView>
  );
}