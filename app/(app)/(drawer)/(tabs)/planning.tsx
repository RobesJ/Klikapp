import { STATE_OPTIONS, TYPE_OPTIONS } from '@/components/badge';
import ProjectDetails from '@/components/cardDetails/projectDetails';
import ProjectCard from '@/components/cards/projectCard';
import FilterModal from '@/components/modals/filterModal';
import { PlanningListSkeleton } from '@/components/skeletons/skeleton';
import { Body, BodyLarge, Heading1 } from '@/components/typography';
import WeekCalendar from '@/components/weekCalendar';
import { useAuth } from '@/context/authContext';
import { ProjectFilters, useProjectStore } from '@/store/projectStore';
import { ProjectWithRelations } from '@/types/projectSpecific';
import { EvilIcons, Feather } from '@expo/vector-icons';
import { DrawerActions } from "@react-navigation/native";
import { FlashList } from '@shopify/flash-list';
import { format, parseISO } from 'date-fns';
import { sk } from 'date-fns/locale';
import { useFocusEffect, useLocalSearchParams, useNavigation } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Dimensions, TouchableOpacity, Vibration, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.4;

function applyFilters(projects: ProjectWithRelations[], filters: ProjectFilters) {
  let filtered = projects;
  
  if (filters.type.length > 0) {
    filtered = filtered.filter(p => filters.type.includes(p.project.type));
  }
  
  if (filters.state.length > 0) {
    filtered = filtered.filter(p => filters.state.includes(p.project.state));
  }
  
  if (filters.users.length > 0) {
    filtered = filtered.filter(p =>
      p.users.some(user => filters.users.includes(user.id))
    );
  }
  
  if (filters.cities && filters.cities.length > 0) {
    filtered = filtered.filter(p =>
      p.objects.some(obj =>
        obj.object.city && filters.cities!.includes(obj.object.city)
      )
    );
  }
  return filtered;
}

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
  const [filtersUnassigned, setFiltersUnassigned] = useState<ProjectFilters>({
    type: [],
    state: [],
    users: [],
    cities: []
  }); 
  const [filtersAssigned, setFiltersAssigned] = useState<ProjectFilters>({
    type: [],
    state: [],
    users: []
  }); 

  const hasInitialized = useRef(false);
  const currentAssingmentsRef = useRef<Record<string, Date>>({});

  const {
    backgroundLoading,
    availableUsers,
    clearFilters,
    fetchPlannedProjects,
    assignProjectToDate,
    getAssignedProjects,
    getUnassignedProjects,
    changeStateOfAssignedProject,
    unassignProject,
    unlockProject
  } = useProjectStore();

  useEffect(() => {  
    if (!hasInitialized.current){
      hasInitialized.current = true;
      fetchPlannedProjects();
    }
  }, [fetchPlannedProjects]);

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
        clearFilters();
        clearFiltersUnassigned();
        clearFiltersAssigned();
      };
    }, [changeStateOfAssignedProject, clearFilters])
  );
  
  useEffect(() => {
    const unassigned = getUnassignedProjects(selectedDate);
    const citiesSet = new Set<string>();

    unassigned.forEach(p => {
      p.objects.forEach(ob => {
        if(ob.object.city){
          citiesSet.add(ob.object.city);
        }
      });
    });
    setAvailableCities(Array.from(citiesSet).sort());
  }, [selectedDate, getUnassignedProjects]);
  

  const toggleTypeFilterAssigned = useCallback((type: string) => {
    setFiltersAssigned(prev => ({
      ...prev,
      type: prev.type.includes(type)
        ? prev.type.filter(t => t !== type)
        : [...prev.type, type]
    }));
  }, []);

  const toggleTypeFilterUnassigned = useCallback((type: string) => {
    setFiltersUnassigned(prev => ({
      ...prev,
      type: prev.type.includes(type)
        ? prev.type.filter(t => t !== type)
        : [...prev.type, type]
    }));
  }, []);

  const toggleStateFilterAssigned = useCallback((state: string) => {
    setFiltersAssigned(prev => ({
      ...prev,
      state: prev.state.includes(state)
        ? prev.state.filter(s => s !== state)
        : [...prev.state, state]
    }));
  }, []);

  const toggleStateFilterUnassigned = useCallback((state: string) => {
    setFiltersUnassigned(prev => ({
      ...prev,
      state: prev.state.includes(state)
        ? prev.state.filter(t => t !== state)
        : [...prev.state, state]
    }));
  }, []);

  const toggleUserFilterAssigned = useCallback((userId: string) => {
    setFiltersAssigned(prev => ({
      ...prev,
      users: prev.users.includes(userId)
        ? prev.users.filter(u => u !== userId)
        : [...prev.users, userId]
    }));
  }, []);

  const toggleUserFilterUnassigned = useCallback((userId: string) => {
    setFiltersUnassigned(prev => ({
      ...prev,
      users: prev.users.includes(userId)
        ? prev.users.filter(u => u !== userId)
        : [...prev.users, userId]
    }));
  }, []);

  const toggleCityFilterUnassigned = useCallback((city: string) => {
    setFiltersUnassigned(prev => {
      const cities = prev.cities ?? [];
      return {
        ...prev,
        cities: cities.includes(city)
          ? cities.filter(c => c !== city)
          : [...cities, city]
      }
    });
  },[]);

  const removeFilterUnassigned = useCallback((filterType: "type" | "state" | "users" | "cities", value: string) => {
    setFiltersUnassigned(prev => ({
      ...prev,
      [filterType]: (prev[filterType] || []).filter((v: string) => v !== value)
    }));
  },[]);
  
  const removeFilterAssigned = useCallback((filterType: "type" | "state" | "users", value: string) => {
    setFiltersAssigned(prev => ({
      ...prev,
      [filterType]: filtersAssigned[filterType].filter((v: string) => v !== value)
    }));
  },[]);

  const clearFiltersUnassigned= useCallback(() => {
    setFiltersUnassigned({
      type: [],
      state: [],
      users: [],
      cities: []
    }); 
  }, []);

  const clearFiltersAssigned = useCallback(() => {
    setFiltersAssigned({
      type: [],
      state: [],
      users: []
    }); 
  }, []);

  const filterSectionsUnassigned = useMemo(() => [
    {
      id: 'type',
      title: 'Typ',
      type: 'styled' as const,
      options: TYPE_OPTIONS.map(type => ({
        value: type.value,
        colors: type.colors,
      })),
      selectedValues: filtersUnassigned.type,
      onToggle: toggleTypeFilterUnassigned,
    },
    {
      id: 'state',
      title: 'Stav',
      type: 'styled' as const,
      options: STATE_OPTIONS.map(state => ({
        value: state.value,
        colors: state.colors,
      })),
      selectedValues: filtersUnassigned.state,
      onToggle: toggleStateFilterUnassigned,
    },
    {
      id: 'users',
      title: 'Priradení používatelia',
      type: 'simple' as const,
      options: availableUsers.map(user => ({
        value: user.id,
        label: user.name,
      })),
      selectedValues: filtersUnassigned.users,
      onToggle: toggleUserFilterUnassigned,
    },
    {
      id: 'cities',
      title: 'Mesto',
      type: 'simple' as const,
      options: availableCities.map(city => ({
        value: city,
        label: city,
      })),
      selectedValues: filtersUnassigned.cities ?? [],
      onToggle: toggleCityFilterUnassigned,
    }
  ], [
    filtersUnassigned, 
    availableCities, 
    availableUsers, 
    toggleCityFilterUnassigned,
    toggleStateFilterUnassigned, 
    toggleTypeFilterUnassigned, 
    toggleUserFilterUnassigned
  ]);

  const filterSectionsAssigned = useMemo(() =>[
    {
      id: 'type',
      title: 'Typ',
      type: 'styled' as const,
      options: TYPE_OPTIONS.map(type => ({
        value: type.value,
        colors: type.colors,
      })),
      selectedValues: filtersAssigned.type,
      onToggle: toggleTypeFilterAssigned,
    },
    {
      id: 'state',
      title: 'Stav',
      type: 'styled' as const,
      options: STATE_OPTIONS.map(state => ({
        value: state.value,
        colors: state.colors,
      })),
      selectedValues: filtersAssigned.state,
      onToggle: toggleStateFilterAssigned,
    },
    {
      id: 'users',
      title: 'Priradení používatelia',
      type: 'simple' as const,
      options: availableUsers.map(user => ({
        value: user.id,
        label: user.name,
      })),
      selectedValues: filtersAssigned.users,
      onToggle: toggleUserFilterAssigned,
    },
  ], [
    filtersAssigned,
    availableUsers,
    toggleTypeFilterAssigned,
    toggleStateFilterAssigned,
    toggleUserFilterAssigned
  ]);

  const activeFiltersAssigned = useMemo(() => [
    ...filtersAssigned.type.map(t => ({ type: "type" as const, value: t })),
    ...filtersAssigned.state.map(s => ({ type: "state" as const, value: s })),
    ...filtersAssigned.users.map(u => 
      ({ type: "users" as const, 
        value: u,
        label: availableUsers.find(user => user.id === u)?.name || u 
    }))
  ], [availableUsers, filtersAssigned]);


  const activeFiltersUnassigned = useMemo(() => [
    ...filtersUnassigned.type.map(t => ({ type: "type" as const, value: t })),
    ...filtersUnassigned.state.map(s => ({ type: "state" as const, value: s })),
    ...filtersUnassigned.users.map(u => 
      ({ type: "users" as const, 
        value: u,
        label: availableUsers.find(user => user.id === u)?.name || u 
    })),
    ...(filtersUnassigned.cities || []).map(c => ({ type: "cities" as const, value: c }))
  ], [availableUsers, filtersUnassigned]);
  
  const assignedRaw = getAssignedProjects(selectedDate);
  const assignedProjects = applyFilters(assignedRaw, filtersAssigned);
  const unassignedRaw = getUnassignedProjects(selectedDate);
  const unassignedProjects = applyFilters(unassignedRaw, filtersUnassigned);

  const handleDateSelect = useCallback((date: Date) => {
    setSelectedDate(date);
  }, []);

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
      getAssignedProjects(selectedDate);
      getUnassignedProjects(selectedDate);
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
  }, [selectedProject, user, unlockProject])
  

  const renderFilterPills = useCallback((
    filters: Array<{type: string, value: string, label?: string}>,
    onRemove: (type: any, value: string) => void
  ) => {
    if (filters.length === 0) return null;
    
    return (
        <View className="px-6 mt-4">
          <View className="flex-row flex-wrap">
            {filters.map((filter, index) => {
              let pillColor = "bg-blue-100";
              let textColor = "text-blue-700";
            
              if (filter.type === 'type') {
                pillColor = TYPE_OPTIONS.find(s => s.value === filter.value)?.colors[1] ?? "border-gray-500 bg-yellow-100";
                textColor = TYPE_OPTIONS.find(s => s.value === filter.value)?.colors[0] ?? "border-gray-500 bg-yellow-100";
              } 
              else if (filter.type === 'state') {
                pillColor = STATE_OPTIONS.find(s => s.value === filter.value)?.colors[1] ?? "border-gray-500 bg-yellow-100";
                textColor = STATE_OPTIONS.find(s => s.value === filter.value)?.colors[0] ?? "border-gray-500 bg-yellow-100";
              }
            
              return (
                <TouchableOpacity
                  key={`${filter.type}-${filter.value}-${index}`}
                  onPress={() => onRemove(filter.type, filter.value)}
                  className={`${pillColor} rounded-full px-3 py-2 mr-2 mb-2 flex-row items-center`}
                >
                  <Body className={`${textColor} font-medium mr-1`}>{filter.label || filter.value}</Body>
                  <Body className={`${textColor} font-bold`}>✕</Body>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
    );
  }, []);

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

          {/* Assigned Projects List */}
          <View className="mb-6">
            <View className='flex-row justify-between items-center'>
              <BodyLarge className="text-dark-text_color text-xl font-bold mb-3">
                Naplánované projekty ({assignedProjects.length})
              </BodyLarge>
              <TouchableOpacity
                onPress={() => {setShowFilterModalAssigned(true)}}
                activeOpacity={0.8}
                className="ml-4 items-center justify-center"
              >
                <Feather name="filter" size={20} color="white" />
              </TouchableOpacity>  
            </View>

            {/* Active filters indicator */}
            {renderFilterPills(activeFiltersAssigned, removeFilterAssigned)}

            {assignedProjects.length === 0 && backgroundLoading ? (
                <PlanningListSkeleton/>
              )
              :(
              <View className="pt-2" style={{ height: 300}}>
                <FlashList
                  data={assignedProjects}
                  keyExtractor={keyExtractor}
                  renderItem={renderAssignedItem}
                  showsVerticalScrollIndicator={false}
                />
              </View>
            )}
            {assignedProjects.length === 0 && !backgroundLoading && (
              <View className="bg-dark-secondary rounded-lg p-6">
                <Body className="text-dark-text_color text-center opacity-50">
                  Žiadne priradené projekty
                </Body>
              </View>
            )}
          </View>

          {/* Assigned Projects List */}
          <View className="mb-20">
            <View className='flex-row justify-between items-center'>
              <BodyLarge className="text-dark-text_color text-xl font-bold mb-3">
                Nepriradené projekty ({unassignedProjects.length})
              </BodyLarge>
              <TouchableOpacity
                onPress={() => {setShowFilterModalUnassigned(true)}}
                activeOpacity={0.8}
                className="ml-4 items-center justify-center"
              >
                <Feather name="filter" size={20} color="white" />
              </TouchableOpacity>   
              
            </View>

            {/* Active filters indicator */}
            {renderFilterPills(activeFiltersUnassigned, removeFilterUnassigned)}

            {unassignedProjects.length === 0 && backgroundLoading ? (
              <PlanningListSkeleton/>
            ) :
            (
              <View className="pt-2" style={{ height: 400 }}>
                <FlashList
                  data={unassignedProjects}
                  keyExtractor={keyExtractor}
                  renderItem={renderUnassignedItem}
                  showsVerticalScrollIndicator={false}
                />
              </View>
            )}
            
            {unassignedProjects.length === 0 && !backgroundLoading && (
              <View className="bg-dark-secondary rounded-lg p-6">
                  <Body className="text-dark-text_color text-center opacity-50">
                    Žiadne nepriradené projekty
                  </Body>
              </View>
            )}

          </View>
        </View>

      {/* Filters modal */}
      <FilterModal
        visible={showFilterModalUnassigned}
        onClose={() => setShowFilterModalUnassigned(false)}
        sections={filterSectionsUnassigned}
        onClearAll={clearFiltersUnassigned}
      />

      <FilterModal
        visible={showFilterModalAssigned}
        onClose={() => setShowFilterModalAssigned(false)}
        sections={filterSectionsAssigned}
        onClearAll={clearFiltersAssigned}
      />

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

    </View>
  );
}

// Draggable Project Card Component
interface SwipeableProjectCardProps {
    project: ProjectWithRelations;
    swipeDirection: "left" | "right";
    onSwipe: () => void;
    onPress: () => void
}

function SwipeableProjectCard({ 
    project,
    swipeDirection,
    onSwipe,
    onPress,
}: SwipeableProjectCardProps) {
  
    const translateX = useSharedValue(0);

    const panGesture = Gesture.Pan()
        .activeOffsetX([-20, 20])  
        .failOffsetY([-10, 10])  
        .onChange((e) => {
            const allowed = swipeDirection === "right"
              ? e.translationX > 0
              : e.translationX < 0;

            if (allowed) translateX.value = e.translationX;
        })
        .onEnd(e => {
            if (Math.abs(e.translationX) > SWIPE_THRESHOLD){  
              
                translateX.value = withTiming(
                  swipeDirection === "right" ? SCREEN_WIDTH : - SCREEN_WIDTH, 
                  { duration: 300 }, 
                  () => {
                      runOnJS(onSwipe)();
                  }
                );
            }
            else {
                translateX.value = withSpring(0);
            }
        });

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }]
    }));

    return (
        <View className='mb-2 overflow-hidden'>
            <GestureDetector gesture={panGesture}>
                <Animated.View style={animatedStyle}>
                    <ProjectCard
                      project={project.project}
                      client={project.client}
                      users={project.users}
                      objects={project.objects}
                      onPress={onPress}
                    />
                </Animated.View>
            </GestureDetector> 
        </View>
    );
}