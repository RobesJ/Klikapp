import { STATE_OPTIONS_HOME } from '@/components/badge';
import ProjectDetails from '@/components/cardDetails/projectDetails';
import ProjectCard from '@/components/cards/projectCard';
import { FilterPills } from '@/components/FilterPills';
import FilterModal from '@/components/modals/filterModal';
import { ProjectsListSkeleton } from '@/components/skeletons/skeleton';
import { Body, BodyLarge, Heading1 } from '@/components/typography';
import WeekCalendar from '@/components/weekCalendar';
import { useAuth } from '@/context/authContext';
import { useActiveFilters } from '@/hooks/projectFilteringHooks/useActiveFilters';
import { useFilterSections } from '@/hooks/projectFilteringHooks/useFilterSections';
import { useProjectFilters } from '@/hooks/projectFilteringHooks/useProjectFilters';
import { useHomeScreenStore } from '@/store/homeScreenStore';
import { ProjectWithRelations } from '@/types/projectSpecific';
import { applyFilters } from '@/utils/projectFilteringUtils';
import { EvilIcons, Feather } from '@expo/vector-icons';
import { DrawerActions } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import { format, isBefore, isSameDay, parseISO, startOfDay } from 'date-fns';
import { sk } from 'date-fns/locale';
import { useFocusEffect, useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function Home() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const navigation = useNavigation();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDetails, setShowDetails] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectWithRelations | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  
  const hasInitialized = useRef(false);
  
  const {
    initialLoading,
    fetchAvailableUsers,
    fetchActiveProjects,
    availableUsers,
    activeProjects,
    unlockProject
  } = useHomeScreenStore();

  const filterState = useProjectFilters({includeCities: false});

  // Init data on screen mount
  useEffect(() => {
      if (!hasInitialized.current){
        hasInitialized.current = true;
        fetchActiveProjects();
        fetchAvailableUsers();
      }
  }, [fetchActiveProjects, fetchAvailableUsers]);
  
  // clear filters when leaving the screen
  useFocusEffect(
    useCallback(() => {
      return () => {
        filterState.clearFilters();
      }
    }, [filterState.clearFilters])
  );

  const filterSections = useFilterSections({
    filters: filterState.filters,
    availableUsers: availableUsers,
    toggleType: filterState.toggleType,
    toggleState: filterState.toggleState,
    toggleUser: filterState.toggleUser,
    stateOptions: STATE_OPTIONS_HOME,
  });

  const activeFilters = useActiveFilters(filterState.filters, availableUsers);
  const filtered = applyFilters(Array.from(activeProjects.values()),filterState.filters);
  const selectedDay = startOfDay(selectedDate);
  
  const projectsForSelectedDate = filtered.filter((p) => {
      if (!p.project || p.project.completion_date) return false;

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

  const handleDetailsVisibility = useCallback((projectData: ProjectWithRelations, value: boolean) => {
    setSelectedProject(projectData);
    setShowDetails(value);
  }, []);

  const handleRefresh = useCallback(() => {
    fetchActiveProjects();
  }, [fetchActiveProjects]);

  const handleCloseWithUnlock = useCallback(() => {
    setShowDetails(false);
    if (selectedProject?.project && user){
      unlockProject(selectedProject.project.id, user.id);
    }
    setSelectedProject(null);
  }, [selectedProject, user, unlockProject]);

  const handleNavigatePlanning = useCallback(() => {
    router.push("/planning");
  }, [router]);

  const renderItem = useCallback(({item}: {item: ProjectWithRelations})  => (
    <ProjectCard
      project={item.project}
      client={item.client}
      users={item.users}
      objects={item.objects}
      onPress={() => handleDetailsVisibility(item, true)}
    />
  ), [handleDetailsVisibility]);

  const keyExtractor = useCallback((item: ProjectWithRelations) => item.project.id, []);

  return (
      <View
        style={{
          paddingTop: insets.top,
          paddingHorizontal: 16,
          paddingBottom: insets.bottom,
          flex: 1,
          backgroundColor: "#0c1026"
      }}
      >
          <View className="flex-row justify-between items-center">
              {/* Drawer toggle */}
              <TouchableOpacity
                onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
                activeOpacity={0.8}
                className="items-center justify-center"
              >
                  <EvilIcons name="navicon" size={36} color="white" />
              </TouchableOpacity>
              <View className='items-center'>
                  <Heading1 className="text-dark-text_color mb-1">
                      Aktuálne projekty
                  </Heading1>
                  <BodyLarge className="text-dark-text_color">
                      {format(selectedDate, "EEE, d. MMMM yyyy", { locale: sk })}
                  </BodyLarge>
              </View>
              <View className="justify-between items-center">
                  <Body className="text-green-500 mb-2">ONLINE</Body>
                  <TouchableOpacity
                    onPress={() => setShowFilterModal(true)}
                    activeOpacity={0.8}
                    className="items-center justify-center"
                  >
                      <Feather name="filter" size={20} color="white" />
                  </TouchableOpacity>    
              </View>
          </View>
      <View> 
        
        <View className="mt-4">
          <WeekCalendar 
            selectedDay={selectedDate}
            onDateSelect={setSelectedDate}
          />
        </View>

        {/* Active filters */}
        <FilterPills filters={activeFilters} onRemove={filterState.removeFilter}/>
      </View>

      {/* Content */}
      <View className="flex-1 pt-6 pb-16">
        {projectsForSelectedDate.length === 0 && initialLoading ? (
          <ProjectsListSkeleton />
        ) : (
          <FlashList
            data={projectsForSelectedDate}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            scrollEnabled
            refreshing={initialLoading}
            onRefresh={handleRefresh}
            ListEmptyComponent={
              <View className="flex-1 items-center justify-center">
                <Body className="text-red-500 mb-4">Žiadne bežiace projekty</Body>
                <TouchableOpacity
                  activeOpacity={0.8}
                  className="rounded-xl bg-blue-600 py-3 px-8"
                  onPress={handleNavigatePlanning}
                >
                  <Body className="text-white font-semibold">Plánovať projekty</Body>
                </TouchableOpacity>
              </View>
            }
          />
        )}
      </View>
      
      {/*
      ) : projectsForSelectedDate.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <Body className="text-red-500 mb-4">Žiadne bežiace projekty</Body>
            <TouchableOpacity
              activeOpacity={0.8}
              className="rounded-xl bg-blue-600 py-3 px-8"
              onPress={handleNavigatePlanning}
            >
              <Body className="text-white font-semibold">Plánovať projekty</Body>
            </TouchableOpacity>
          </View>
        ) : 
         */}

      {/* Project details modal */}
      {selectedProject && (
        <ProjectDetails 
          key={selectedProject.project.id}
          projectWithRelationsID={selectedProject.project.id}
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
        onClearAll={filterState.clearFilters}
      />

    </View>
  );
}