import { STATE_OPTIONS_HOME, TYPE_OPTIONS } from '@/components/badge';
import ProjectDetails from '@/components/cardDetails/projectDetails';
import ProjectCard from '@/components/cards/projectCard';
import FilterModal from '@/components/filterModal';
import WeekCalendar from '@/components/weekCalendar';
import { useClientStore } from '@/store/clientStore';
import { useObjectStore } from '@/store/objectStore';
import { useProjectStore } from '@/store/projectStore';
import { ProjectWithRelations } from '@/types/projectSpecific';
import { EvilIcons, Feather } from '@expo/vector-icons';
import { DrawerActions } from '@react-navigation/native';
import { format, isBefore, isSameDay, parseISO, startOfDay } from 'date-fns';
import { sk } from 'date-fns/locale';
import { useFocusEffect, useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Home() {
  const [appReady, setAppReady] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDetails, setShowDetails] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectWithRelations | null>(null);

  const [showFilterModal, setShowFilterModal] = useState(false);
  const router = useRouter();
  const navigation = useNavigation();
  
  const {
    initialLoading,
    backgroundLoading,
    fetchAvailableUsers,
    fetchActiveProjects,
    fetchPlannedProjects,
    getFilteredProjects,
    availableUsers,
    projects,
    filters,
    clearFilters,
    removeFilter,
    toggleTypeFilter,
    toggleStateFilter,
    toggleUserFilter,
    deleteProject
  } = useProjectStore();

  useEffect(() => {
    async function initApp() {
      await fetchActiveProjects();
      
      setAppReady(true);

      setTimeout(() => {
        loadRemamianinData();
      }, 500);
    }

    async function loadRemamianinData() {
      await Promise.all([
        fetchAvailableUsers(),
        useClientStore.getState().fetchClients(100),
        useObjectStore.getState().fetchObjects(100),
        fetchPlannedProjects()
      ]);
    }

    initApp();
  }, []);
  
  useFocusEffect(
    useCallback(() => {
      return () => {
        clearFilters();
      }
    }, [clearFilters])
  );

  const filterSections = [
    {
      id: 'type',
      title: 'Typ',
      type: 'styled' as const,
      options: TYPE_OPTIONS.map(type => ({
        value: type.value,
        colors: type.colors,
      })),
      selectedValues: filters.type,
      onToggle: toggleTypeFilter,
    },
    {
      id: 'state',
      title: 'Stav',
      type: 'styled' as const,
      options: STATE_OPTIONS_HOME.map(state => ({
        value: state.value,
        colors: state.colors,
      })),
      selectedValues: filters.state,
      onToggle: toggleStateFilter,
    },
    {
      id: 'users',
      title: 'Priradení používatelia',
      type: 'simple' as const,
      options: availableUsers.map(user => ({
        value: user.id,
        label: user.name,
      })),
      selectedValues: filters.users,
      onToggle: toggleUserFilter,
    },
  ];

  const projectsForSelectedDate = useMemo(() => {
    const filtered = getFilteredProjects(filters);
    const selectedDay = startOfDay(selectedDate);

    return filtered.filter((p) => {
      if (!p.project) return false;
      if (p.project.completion_date) return false;

      // Planned projects for the selected day
      if (p.project.state === "Naplánovaný" && p.project.start_date) {
        try {
          const startDate = parseISO(p.project.start_date);
          return isSameDay(startDate, selectedDay);
        } catch {
          return false;
        }
      }

      // Active/paused projects that started on or before the selected day
      if ((p.project.state === "Prebieha" || p.project.state === "Pozastavený") && p.project.start_date) {
        try {
          const startDate = parseISO(p.project.start_date);
          return isBefore(startDate, selectedDay) || isSameDay(startDate, selectedDay);
        } catch {
          return false;
        }
      }

      return false;
    });
  }, [filters, getFilteredProjects, selectedDate, projects]);

  const handleDetailsVisibility = (projectData: ProjectWithRelations, value: boolean) => {
    setSelectedProject(projectData);
    setShowDetails(value);
  };

  const getActiveFilters = () => {
    return [
      ...filters.type.map(t => ({ type: "type" as const, value: t })),
      ...filters.state.map(s => ({ type: "state" as const, value: s })),
      ...filters.users.map(u => ({ type: "users" as const, value: u }))
    ];
  };

  const handleClearFilters = () => {
    clearFilters();
  };

  const hasActiveFilters = (filters.users.length > 0 ) || (filters.state.length > 0 ) || (filters.type.length > 0);

  return (
    <SafeAreaView className="flex-1 bg-dark-bg">
      {appReady && (
        <View className='flex-1'>       
          {/* Header */}   
          <View className="flex-2 mt-4 mx-4 mb-8">
            <View className="flex-row justify-between">
            <TouchableOpacity
              onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
              activeOpacity={0.8}
              className="items-center justify-center"
            >
              <EvilIcons name="navicon" size={36} color="white" />
            </TouchableOpacity>
  
              <View className='ml-6 items-center justify-center'>
                <Text className="font-bold text-4xl text-dark-text_color">Aktuálne projekty</Text>
                <Text className=' text-dark-text_color'>
                  {format(selectedDate, "EEE, d. MMMM yyyy", {locale: sk})}
                </Text>
             </View>
              <View className="flex-2 justify-between items-center">
                <Text className="text-xl text-green-500">ONLINE</Text>
                <TouchableOpacity
                    onPress={() => {setShowFilterModal(true)}}
                    activeOpacity={0.8}
                    className="ml-4 items-center justify-center"
                  >
                    <Feather name="filter" size={20} color="white" />
                </TouchableOpacity>
              </View>
            </View>
             
            <View className="mt-4">
               <WeekCalendar 
                 selectedDay={selectedDate}
                 onDateSelect={setSelectedDate}
               />
            </View>

            <View className='flex-row'>            

              {/* Clear filters button */}
              <View className='flex-1 items-end justify-center'>
              {hasActiveFilters && (
                <TouchableOpacity
                  onPress={()=> handleClearFilters()}
                  >
                  <Text className='color-red-600'>
                   Zrušiť filtre
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
                      pillColor = TYPE_OPTIONS.find(s => s.value === filter.value)?.colors[1] ?? "border-gray-500 bg-yellow-100";
                      textColor = TYPE_OPTIONS.find(s => s.value === filter.value)?.colors[0] ?? "border-gray-500 bg-yellow-100";
                    } 
                    else if (filter.type === 'state') {
                      pillColor = STATE_OPTIONS_HOME.find(s => s.value === filter.value)?.colors[1] ?? "border-gray-500 bg-yellow-100";
                      textColor = STATE_OPTIONS_HOME.find(s => s.value === filter.value)?.colors[0] ?? "border-gray-500 bg-yellow-100";
                    }
                    else {
                      pillColor = "bg-blue-100";
                      textColor = "text-blue-700";
                    }
                  
                    return (
                      <TouchableOpacity
                        key={`${filter.type}-${filter.value}-${index}`}
                        onPress={() => removeFilter(filter.type, filter.value)}
                        className={`${pillColor} rounded-full px-3 py-2 mr-2 mb-2 flex-row items-center`}
                      >
                        <Text className={`${textColor} font-medium mr-1`}>{filter.value}</Text>
                        <Text className={`${textColor} font-bold`}>✕</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
            
          </View>

          <FlatList
            data={projectsForSelectedDate}
            keyExtractor={(item) => item.project.id}
            renderItem={({item}) =>(
              <ProjectCard
                  project={item.project}
                  client={item.client}
                  users={item.users}
                  objects={item.objects}
                  onPress={() => handleDetailsVisibility(item, true)}
              />
            )}
            ListEmptyComponent={
              backgroundLoading ? (
                <Text className="text-center text-gray-500 mt-10">Načítavam...</Text>
              ) : (
                <View className='flex-1 items-center'>
                <Text className="text-red-500 mb-4 text-lg">
                  Žiadne bežiace projekty
                </Text>
                <TouchableOpacity
                  activeOpacity={0.8}
                  className="rounded-xl bg-blue-600 py-3 px-8"
                  onPress={()=> router.push("/planning")}
                >
                  <Text className='text-white font-semibold'>Plánovať projekty</Text>
                </TouchableOpacity>
                </View>
              )
            }
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
            scrollEnabled={true}
          />
        </View>
      )}

      {/* Project details modal */}
      <Modal
        visible={showDetails}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDetails(false)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center">
          <View className="w-3/4 bg-dark-bg rounded-2xl overflow-hidden">
            {/* Header */}
            <View className="px-4 py-6 border-b border-gray-200">
              <View className="flex-row items-center justify-between">
                <Text className="text-xl font-bold text-dark-text_color">
                  {selectedProject?.project.type}
                </Text>
                
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
                    className="w-8 h-8 bg-gray-600 rounded-full items-center justify-center"
                  >
                    <Feather name="edit-2" size={16} color="white" />
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
                    className="w-8 h-8 bg-gray-600 rounded-full items-center justify-center"
                  >
                    <EvilIcons name="trash" size={24} color="white" />
                  </TouchableOpacity>


                  <TouchableOpacity
                    onPress={() => setShowDetails(false)}
                    className="w-8 h-8 bg-gray-600 rounded-full items-center justify-center"
                  >
                    <EvilIcons name="close" size={24} color="white" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
                  
            <ScrollView className="max-h-screen-safe-offset-12 p-4">
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

      {/* Filters modal */}
      <FilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        sections={filterSections}
        onClearAll={clearFilters}
      />

    </SafeAreaView>
  );
}