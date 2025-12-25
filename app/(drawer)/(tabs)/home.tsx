import { AnimatedScreen } from '@/components/animatedScreen';
import { STATE_OPTIONS_HOME, TYPE_OPTIONS } from '@/components/badge';
import ProjectDetails from '@/components/cardDetails/projectDetails';
import ProjectCard from '@/components/cards/projectCard';
import FilterModal from '@/components/filterModal';
import { BodyLarge, BodySmall, Heading1, Label } from '@/components/typografy';
import WeekCalendar from '@/components/weekCalendar';
import { useAuth } from '@/context/authContext';
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
import { Dimensions, FlatList, PixelRatio, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Home() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDetails, setShowDetails] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectWithRelations | null>(null);

  const [showFilterModal, setShowFilterModal] = useState(false);
  const router = useRouter();
  const { user } = useAuth();
  const navigation = useNavigation();
  
  const {
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
    unlockProject
  } = useProjectStore();

  useEffect(() => {

    const pixelRatio = PixelRatio.get();
    console.log(pixelRatio);
    const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
    console.log(`screen_ width: ${SCREEN_WIDTH}, screen_height: ${SCREEN_HEIGHT}`);
    if(projects.size === 0){
      fetchActiveProjects();
      setTimeout(() => {
        loadRemamianinData();
      }, 500);

      async function loadRemamianinData() {
        await Promise.all([
          fetchAvailableUsers(),
          useClientStore.getState().fetchClients(30),
          useObjectStore.getState().fetchObjects(10),
          fetchPlannedProjects()
        ]);
      }
    }
  }, [projects.size]);
  
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

  const handleCloseWithUnlock = () => {
    setShowDetails(false);
    if (selectedProject?.project && user){
      unlockProject(selectedProject.project.id, user.id);
    }
    setSelectedProject(null);
  };

  const hasActiveFilters = (filters.users.length > 0 ) || (filters.state.length > 0 ) || (filters.type.length > 0);

  return (
    <SafeAreaView className="flex-1 bg-dark-bg">
        <AnimatedScreen tabIndex={0}>       
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
                <Heading1 allowFontScaling={false} className="font-bold text-4xl text-dark-text_color">Aktuálne projekty</Heading1>
                <Label className=' text-dark-text_color'>
                  {format(selectedDate, "EEE, d. MMMM yyyy", {locale: sk})}
                </Label>
             </View>
              <View className="flex-2 justify-between items-center">
                <Label className="text-xl text-green-500">ONLINE</Label>
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
                  <BodyLarge className='color-red-600'>
                   Zrušiť filtre
                  </BodyLarge>
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
                        <BodySmall className={`${textColor} font-medium mr-1`}>{filter.value}</BodySmall>
                        <BodySmall className={`${textColor} font-bold`}>✕</BodySmall>
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
      
        </AnimatedScreen>

      {/* Project details modal */}
      {selectedProject && (
        <ProjectDetails 
          key={selectedProject.project.id}
          projectWithRelations={selectedProject}
          visible={showDetails}
          onClose={()=> {
            setShowDetails(false);
            setSelectedProject(null);
          }}
          onCloseWithUnlock={handleCloseWithUnlock}
        />
      )}
            
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