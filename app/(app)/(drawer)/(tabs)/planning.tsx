import ProjectDetails from '@/components/cardDetails/projectDetails';
import { FilterPills } from '@/components/FilterPills';
import FilterModal from '@/components/modals/filterModal';
import { PlanningListSkeleton } from '@/components/skeletons/skeleton';
import SwipeableProjectCard from '@/components/SwipeableProjectCard';
import { Body, BodyLarge, Heading1 } from '@/components/typography';
import WeekCalendar from '@/components/weekCalendar';
import { useAuth } from '@/context/authContext';
import { useActiveFilters } from '@/hooks/projectFilteringHooks/useActiveFilters';
import { useFilterSections } from '@/hooks/projectFilteringHooks/useFilterSections';
import { useProjectFilters } from '@/hooks/projectFilteringHooks/useProjectFilters';
import { useProjectStore } from '@/store/projectStore';
import { ProjectWithRelations } from '@/types/projectSpecific';
import { applyFilters, extractCitiesFromProjects } from '@/utils/projectFilteringUtils';
import { EvilIcons, Feather } from '@expo/vector-icons';
import { DrawerActions } from "@react-navigation/native";
import { FlashList } from '@shopify/flash-list';
import { format, parseISO } from 'date-fns';
import { sk } from 'date-fns/locale';
import { useFocusEffect, useLocalSearchParams, useNavigation } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Dimensions, TouchableOpacity, Vibration, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SCREEN_HEIGHT = Dimensions.get('window').height;

export default function Planning() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { preselectedDate } = useLocalSearchParams();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDetails, setShowDetails] = useState(false);
  const [selectedProject, setSelectedProject] =  useState<ProjectWithRelations | null>(null);
  const [showFilterModalAssigned,  setShowFilterModalAssigned] = useState(false);
  const [showFilterModalUnassigned,  setShowFilterModalUnassigned] = useState(false);
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [unassignedDaysAhead, setUnassignedDaysAhead] = useState(30);
  
  const hasInitialized = useRef(false);
  const currentAssingmentsRef = useRef<Record<string, Date>>({});

  const availableUsers  = useProjectStore(state => state.availableUsers);
  const getAssignedProjects  = useProjectStore(state => state.getAssignedProjects);
  const getUnassignedProjects  = useProjectStore(state => state.getUnassignedProjects);

  const {
    syncProjects,
    backgroundLoading,
    assignProjectToDate,
    unassignProject,
    unlockProject,
    changeStateOfAssignedProject,
  } = useProjectStore();

  const assignedFilterState = useProjectFilters({includeCities: false});
  const unassignedFilterState = useProjectFilters({includeCities: true});

  const filterSectionsAssigned = useFilterSections({
      filters: assignedFilterState.filters,
      availableUsers: availableUsers,
      toggleType: assignedFilterState.toggleType,
      toggleState: assignedFilterState.toggleState,
      toggleUser: assignedFilterState.toggleUser,
  });

  const filterSectionsUnassigned = useFilterSections({
    filters: unassignedFilterState.filters,
    availableUsers: availableUsers,
    availableCities: availableCities,
    toggleType: unassignedFilterState.toggleType,
    toggleState: unassignedFilterState.toggleState,
    toggleUser: unassignedFilterState.toggleUser,
    toggleCity: unassignedFilterState.toggleCity,
  });

  const activeFiltersAssigned = useActiveFilters(assignedFilterState.filters, availableUsers);
  const activeFiltersUnassigned = useActiveFilters(unassignedFilterState.filters, availableUsers);

  useEffect(() => {  
    if (!hasInitialized.current){
      hasInitialized.current = true;
    }
  }, []);

  useEffect(() => {  
    if (preselectedDate) {
      try{
        setSelectedDate(parseISO(JSON.parse(preselectedDate as string)));
      }
      catch (error: any) {
        console.error("Error parsing preselected date:", error);
      }
    }
  }, [preselectedDate]);

  // change states of assigned projects when leaving the screen
  useFocusEffect(
    useCallback(() => {
      return () => {
        const assignments = currentAssingmentsRef.current;
  
        if (Object.keys(assignments).length > 0) {
          Promise.all(
            Object.entries(assignments).map(async ([projectId, assignedDate]) => 
              await changeStateOfAssignedProject(projectId, assignedDate)
            )
          ).catch(error => console.error("Error updating project states:", error));
        }
        
        currentAssingmentsRef.current = {};
        assignedFilterState.clearFilters();
        unassignedFilterState.clearFilters();
      };
    }, [
      changeStateOfAssignedProject, 
      unassignedFilterState.clearFilters,
      assignedFilterState.clearFilters
    ])
  );
  
  useEffect(() => {
    const unassigned = getUnassignedProjects(unassignedDaysAhead);
    setAvailableCities(extractCitiesFromProjects(unassigned));
  }, [getUnassignedProjects, unassignedDaysAhead]);


  const assignedRaw = getAssignedProjects();
  const unassignedRaw = getUnassignedProjects(unassignedDaysAhead);
  //const assignedProjects = applyFilters(assignedRaw, assignedFilterState.filters);
//
  //const unassignedProjects = applyFilters(unassignedRaw, unassignedFilterState.filters);

  const assignedForDate = useMemo(() => {
    const dateString = format(selectedDate, "yyyy-MM-dd");
    return assignedRaw.filter(p => p.project.start_date === dateString);
  }, [assignedRaw, selectedDate]);
  
  // Apply user filters
  const assignedProjects = useMemo(() => 
    applyFilters(assignedForDate, assignedFilterState.filters),
    [assignedForDate, assignedFilterState.filters]
  );
  
  const unassignedProjects = useMemo(() => 
    applyFilters(unassignedRaw, unassignedFilterState.filters),
    [unassignedRaw, unassignedFilterState.filters]
  );

  //const handleLoadMoreUnassigned = useCallback(() => {
  //  if (backgroundLoading || !metadata.unassigned.hasMore) return;
  //  loadMoreUnassigned(unassignedFilterState.filters);
  //}, [
  //  backgroundLoading,
  //  metadata.unassigned.hasMore,
  //  loadMoreUnassigned,
  //  selectedDate,
  //  unassignedFilterState.filters
  //]);



  const handleDateSelect = useCallback((date: Date) => {
    setSelectedDate(date);
    
    // Check if we need to load more assigned projects for future dates
  //  const dateStr = format(date, 'yyyy-MM-dd');
  //  if (metadata.assigned.cursor && dateStr > metadata.assigned.cursor) {
  //    loadMoreAssigned(date);
  //  }
  }, []); //[metadata.assigned.cursor, loadMoreAssigned]);

  const handleAssignProject = useCallback(async (projectId: string) => {
    try {
      assignProjectToDate(projectId, selectedDate);
      currentAssingmentsRef.current = {
        ...currentAssingmentsRef.current,
        [projectId]: selectedDate
      };
      Vibration.vibrate(50);
    }
    catch(error: any){
      console.error("Error assigning project to date:", error);
      Alert.alert('Chyba', error.message || "Nastal problém pri priradení projektu k dátumu");
    }
  }, [selectedDate, assignProjectToDate]);

  const handleUnassignProject = useCallback(async (projectId: string) => {
    try{
      await unassignProject(projectId);
      delete currentAssingmentsRef.current[projectId];
      getAssignedProjects();
      getUnassignedProjects(unassignedDaysAhead);
      Vibration.vibrate(50);
    }
    catch(error: any){
      console.error("Error unassigning project:", error);
      Alert.alert('Chyba', error.message || "Nastal problém pri presune projektu");
    }
  },[selectedDate, unassignProject]);

  const handleModalVisibility = useCallback((projectData: ProjectWithRelations, value: boolean) => {
    setSelectedProject(projectData);
    setShowDetails(value);
  }, []);

  const handleCloseWithUnlock = useCallback(() => {
      setShowDetails(false);
      if (selectedProject?.project && user){
          unlockProject(selectedProject.project.id, user.id);
      }
      setSelectedProject(null);
  }, [selectedProject, user, unlockProject]);

  const handleRefresh = useCallback(() => {
    syncProjects();
  }, [syncProjects]);  
  
  const renderAssignedItem = useCallback(({ item }: { item: ProjectWithRelations }) => (
    <SwipeableProjectCard 
      key={item.project.id} 
      project={item}
      swipeDirection="left"
      onSwipe={() => handleUnassignProject(item.project.id)}
      onPress={() => handleModalVisibility(item, true)}
    />
  ), [handleUnassignProject, handleModalVisibility]);

  const renderUnassignedItem = useCallback(({ item }: { item: ProjectWithRelations }) => (
    <SwipeableProjectCard 
      key={item.project.id} 
      project={item}
      swipeDirection="right"
      onSwipe={() => handleAssignProject(item.project.id)}
      onPress={() => handleModalVisibility(item, true)}
    />
  ), [handleAssignProject, handleModalVisibility]);

  const keyExtractor = useCallback((item: ProjectWithRelations) => item.project.id, []);

  return (
    <View
      style={{
        paddingTop: insets.top,
        paddingHorizontal: 16,
        paddingBottom: insets.bottom,
        flex: 1,
        backgroundColor: "#0c1026",
      }}
    > 
      {/* Fixed Header Section */}
      <View>
        {/* Header */}
        <View className="flex-row justify-between items-center mb-2">
          <TouchableOpacity
            onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
            activeOpacity={0.8}
            className="items-center justify-center"
          >
            <EvilIcons name="navicon" size={36} color="white" />
          </TouchableOpacity>
          <View className='items-center justify-center ml-6'>
            <Heading1 allowFontScaling={false} className="text-dark-text_color mb-1">
              Plánovanie projektov
            </Heading1>
            <BodyLarge className="text-dark-text_color mb-4">
              {format(selectedDate, "EEE, d. MMMM yyyy", { locale: sk })}
            </BodyLarge>
          </View>
          <Body className="text-xl text-green-500">ONLINE</Body>
        </View>
       
        {/* Calendar */}
        <View className="mb-6">
          <WeekCalendar
            selectedDay={selectedDate}
            onDateSelect={handleDateSelect}
            initialWeekStart={selectedDate}
          />
        </View>
      </View>
  
      <View>
      <View className="mb-4">
          <View className='flex-row justify-between items-center mb-3'>
            <BodyLarge className="text-dark-text_color text-xl font-bold">
              Naplánované projekty ({assignedProjects.length})
            </BodyLarge>
            {assignedProjects.length > 0 && (
              <TouchableOpacity
                onPress={() => setShowFilterModalAssigned(true)}
                activeOpacity={0.8}
                className="ml-4 items-center justify-center"
              >
                <Feather name="filter" size={20} color="white" />
              </TouchableOpacity>  
            )}
          </View>
  
          <FilterPills 
            filters={activeFiltersAssigned} 
            onRemove={assignedFilterState.removeFilter}
          />
  
          {assignedProjects.length === 0 && backgroundLoading ? (
            <PlanningListSkeleton/>
          ) : (
            <View style={{ height: assignedProjects.length === 0 ? 0 : SCREEN_HEIGHT/3}}>
              <FlashList
                data={assignedProjects}
                keyExtractor={keyExtractor}
                renderItem={renderAssignedItem}
                showsVerticalScrollIndicator={false}
                // refreshing={metadata.assigned.isLoading}
                // onRefresh={handleRefresh}
                // onEndReached={handleLoadMoreAssigned}
                onEndReachedThreshold={0.5}          
              />
              </View>
          )}
          {assignedProjects.length === 0 && !backgroundLoading && (
            <View>
              <Body className="text-dark-text_color text-center opacity-50 mt-4">
                Žiadne priradené projekty
              </Body>
            </View>
          )}
        </View>
      </View>
      <View className='"flex-1'>
        {/* Unassigned Projects List - 60% of available space */}
          <View className='flex-row justify-between items-center mb-3'>
            <BodyLarge className="text-dark-text_color text-xl font-bold">
              Nepriradené projekty ({unassignedProjects.length})
            </BodyLarge>
            {unassignedProjects.length > 0 && (
              <TouchableOpacity
                onPress={() => setShowFilterModalUnassigned(true)}
                activeOpacity={0.8}
                className="ml-4 items-center justify-center"
              >
                <Feather name="filter" size={20} color="white" />
              </TouchableOpacity>   
            )}
          </View>
  
          <FilterPills 
            filters={activeFiltersUnassigned} 
            onRemove={unassignedFilterState.removeFilter} 
          />
          
          <View className='flex-1'>
          {unassignedProjects.length === 0 && backgroundLoading ? (
            <PlanningListSkeleton/>
          ) : (
            <View style={{ height: unassignedProjects.length === 0 ? 0 : SCREEN_HEIGHT/3}}>
              <FlashList
                data={unassignedProjects}
                keyExtractor={keyExtractor}
                renderItem={renderUnassignedItem}
                showsVerticalScrollIndicator={false}
                // refreshing={metadata.unassigned.isLoading}  // style={{ height: unassignedProjects.length === 0 ? 0 : SCREEN_HEIGHT/3}}>
                onRefresh={handleRefresh}
                // onEndReached={handleLoadMoreUnassigned}
                onEndReachedThreshold={0.5}
                ListEmptyComponent={
                  <Body className="text-dark-text_color text-center opacity-50 mt-4">
                    Žiadne nepriradené projekty
                  </Body>
                }
              />
               </View>
          )}
          </View>
      </View>
  
      {/* Modals remain the same */}
      <FilterModal
        visible={showFilterModalUnassigned}
        onClose={() => setShowFilterModalUnassigned(false)}
        sections={filterSectionsUnassigned}
        onClearAll={unassignedFilterState.clearFilters}
      />
  
      <FilterModal
        visible={showFilterModalAssigned}
        onClose={() => setShowFilterModalAssigned(false)}
        sections={filterSectionsAssigned}
        onClearAll={assignedFilterState.clearFilters}
      />
  
      {selectedProject && (
        <ProjectDetails 
          key={selectedProject.project.id}
          projectWithRelationsID={selectedProject.project.id}
          visible={showDetails}
          onClose={() => {
            setShowDetails(false);
            setSelectedProject(null);
          }}
          onCloseWithUnlock={handleCloseWithUnlock}
        />
      )}
    </View>
  );
}