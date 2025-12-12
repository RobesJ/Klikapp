import { STATE_OPTIONS, TYPE_OPTIONS } from '@/components/badge';
import ProjectDetails from '@/components/cardDetails/projectDetails';
import ProjectCard from '@/components/cards/projectCard';
import FilterModal from '@/components/filterModal';
import WeekCalendar from '@/components/weekCalendar';
import { ProjectFilters, useProjectStore } from '@/store/projectStore';
import { ProjectWithRelations } from '@/types/projectSpecific';
import { EvilIcons, Feather } from '@expo/vector-icons';
import { DrawerActions } from "@react-navigation/native";
import { format, parseISO } from 'date-fns';
import { sk } from 'date-fns/locale';
import { useFocusEffect, useLocalSearchParams, useNavigation } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Dimensions, Modal, PanResponder, ScrollView, Text, TouchableOpacity, Vibration, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_TRESHOLD = SCREEN_WIDTH * 0.4;

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
  const {
    backgroundLoading,
    availableUsers,
    //projects,
    clearFilters,
    //fetchPlannedProjects,
    assignProjectToDate,
    getAssignedProjects,
    getUnassignedProjects,
    changeStateOfAssignedProject,
    unassignProject
  } = useProjectStore();

  const navigation = useNavigation();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const selectedDateRef = useRef(selectedDate);
  const { preselectedDate } = useLocalSearchParams();
  const [showFilterModalAssigned,  setShowFilterModalAssigned] = useState(false);
  const [showFilterModalUnassigned,  setShowFilterModalUnassigned] = useState(false);
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [currentAssingments, setCurrentAssingments] = useState<Record<string, Date>>({});
  const currentAssingmentsRef = useRef(currentAssingments);

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

  useEffect(() => {  
    if (preselectedDate){
      setSelectedDate(parseISO(JSON.parse(preselectedDate as string)))
    }
  }, [preselectedDate]);

  useEffect(() => {
    selectedDateRef.current = selectedDate;
  }, [selectedDate]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        const assignments = currentAssingmentsRef.current;
  
        if (Object.keys(assignments).length > 0) {
          Promise.all(
            Object.entries(assignments).map(async ([projectId, assignedDate]) => {
              await changeStateOfAssignedProject(projectId, assignedDate);
            })
          );
          currentAssingmentsRef.current = {};
        }
  
        clearFilters();
        clearFiltersUnassigned();
        clearFiltersAssigned();
      };
    }, [changeStateOfAssignedProject])
  );
  
  useEffect(() => {
    const unassigned = getUnassignedProjects(selectedDate);
    const citiesSet = new Set<string>();
    unassigned.forEach(p => {
      p.objects.map(ob => {
        if(ob.object.city){
          citiesSet.add(ob.object.city);
        }
      });
    });
    setAvailableCities(Array.from(citiesSet).sort());
  }, [selectedDate]);
  
  const toggleTypeFilterAssigned = (type: string) => {
    setFiltersAssigned(prev => ({
      ...prev,
      type: prev.type.includes(type)
        ? prev.type.filter(t => t !== type)
        : [...prev.type, type]
    }));
  };


  const toggleTypeFilterUnassigned = (type: string) => {
    setFiltersUnassigned(prev => ({
      ...prev,
      type: prev.type.includes(type)
        ? prev.type.filter(t => t !== type)
        : [...prev.type, type]
    }));
  };

  const toggleStateFilterAssigned = (state: string) => {
    setFiltersAssigned(prev => ({
      ...prev,
      state: prev.state.includes(state)
        ? prev.state.filter(s => s !== state)
        : [...prev.state, state]
    }));
  };

  const toggleStateFilterUnassigned = (state: string) => {
    setFiltersUnassigned(prev => ({
      ...prev,
      state: prev.state.includes(state)
        ? prev.state.filter(t => t !== state)
        : [...prev.state, state]
    }));
  };

  const toggleUserFilterAssigned = (userId: string) => {
    setFiltersAssigned(prev => ({
      ...prev,
      users: prev.users.includes(userId)
        ? prev.users.filter(u => u !== userId)
        : [...prev.users, userId]
    }));
  };

  const toggleUserFilterUnassigned = (userId: string) => {
    setFiltersUnassigned(prev => ({
      ...prev,
      users: prev.users.includes(userId)
        ? prev.users.filter(u => u !== userId)
        : [...prev.users, userId]
    }));
  };

  const toggleCityFilterUnassigned = (city: string) => {
    setFiltersUnassigned(prev => {
      const cities = prev.cities ?? [];
      return {
        ...prev,
        cities: cities.includes(city)
          ? cities.filter(c => c !== city)
          : [...cities, city]
      }
    });
  };

  function removeFilterUnassigned(filterType: "type" | "state" | "users" | "cities", value: string){
    setFiltersUnassigned(prev => ({
      ...prev,
      [filterType]: (prev[filterType] || []).filter((v: string) => v !== value)
    }));
  };
  
  function removeFilterAssigned(filterType: "type" | "state" | "users", value: string){
    setFiltersAssigned(prev => ({
      ...prev,
      [filterType]: filtersAssigned[filterType].filter((v: string) => v !== value)
    }));
  };

  const filterSectionsUnassigned = [
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
  ];

  const filterSectionsAssigned = [
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
  ];
  
  const assignedRaw = getAssignedProjects(selectedDate);

  const assignedProjects = useMemo(() => {
    return applyFilters(assignedRaw, filtersAssigned);
  }, [assignedRaw, filtersAssigned]);

  const unassignedRaw = getUnassignedProjects(selectedDate);

  const unassignedProjects = useMemo(() => {
    return applyFilters(unassignedRaw, filtersUnassigned);
  }, [selectedDate, filtersUnassigned]);
  
  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
  };

  const handleAssignProject = async (projectId: string) => {
    try{
      const dateToAssign = selectedDateRef.current;
      assignProjectToDate(projectId, dateToAssign);
      console.log("setting current assignment with projectID", projectId);
      currentAssingmentsRef.current = {
        ...currentAssingmentsRef.current,
        [projectId]: dateToAssign
      };
      //setCurrentAssingments(prev => ({
      //  ...prev,
      //  [projectId]: dateToAssign
      //}));
      Vibration.vibrate(50);
    }
    catch(error: any){
      console.error("Error assigning project to date:", error);
      Alert.alert('Chyba', error.message || "Nastal problém pri priradení projektu k dátumu");
    }
  };

  const handleUnassignProject = async (projectId: string) => {
    try{
      await unassignProject(projectId);
      delete currentAssingmentsRef.current[projectId];
      //setCurrentAssingments(prev => {
      //  const copy = {...prev};
      //  delete copy[projectId];
      //  return copy;
      //});
      getAssignedProjects(selectedDate);
      getUnassignedProjects(selectedDate);
      Vibration.vibrate(50);
    }
    catch(error: any){
      console.error("Error unassigning project:", error);
      Alert.alert('Chyba', error.message || "Nastal problém pri presune projektu");
    }
  };
  
  const getActiveFiltersAssigned = () => {
    return [
      ...filtersAssigned.type.map(t => ({ type: "type" as const, value: t })),
      ...filtersAssigned.state.map(s => ({ type: "state" as const, value: s })),
      ...filtersAssigned.users.map(u => 
        ({ type: "users" as const, 
          value: u,
          label: availableUsers.find(user => user.id === u)?.name || u 
      }))
    ];
  };

  const getActiveFiltersUnassigned = () => {
    return [
      ...filtersUnassigned.type.map(t => ({ type: "type" as const, value: t })),
      ...filtersUnassigned.state.map(s => ({ type: "state" as const, value: s })),
      ...filtersUnassigned.users.map(u => 
        ({ type: "users" as const, 
          value: u,
          label: availableUsers.find(user => user.id === u)?.name || u 
      })),
      ...(filtersUnassigned.cities || []).map(c => ({ type: "cities" as const, value: c }))
    ];
  };

  function clearFiltersUnassigned(){
    setFiltersUnassigned({
      type: [],
      state: [],
      users: [],
      cities: []
    }); 
  };

  function clearFiltersAssigned(){
    setFiltersAssigned({
      type: [],
      state: [],
      users: []
    }); 
  };
  
  return (
    <SafeAreaView className="flex-1 bg-dark-bg">
      <ScrollView>
        <View className="flex-1 px-6 mt-4">
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
            <Text className="font-bold text-4xl text-dark-text_color">
              Plánovanie projektov
            </Text>
            <Text className="text-dark-text_color mb-4">
              {format(selectedDate, "EEE, d. MMMM yyyy", { locale: sk })}
            </Text>
            </View>
            <Text className="text-xl text-green-500">ONLINE</Text>
          </View>
         
          {/* Calendar */}
          <View className="mb-6">
            <WeekCalendar
              selectedDay={selectedDate}
              onDateSelect={handleDateSelect}
              initialWeekStart={selectedDate}
            />
          </View>

          {backgroundLoading && (
            <ActivityIndicator size="large" color="#3B82F6" />
          )}

          {/* Assigned Projects List */}
          <View className="mb-6">
            <View className='flex-row justify-between items-center'>
              <Text className="text-dark-text_color text-xl font-bold mb-3">
                Naplánované projekty ({assignedProjects.length})
              </Text>
              <TouchableOpacity
                onPress={() => {setShowFilterModalAssigned(true)}}
                activeOpacity={0.8}
                className="ml-4 items-center justify-center"
              >
                <Feather name="filter" size={20} color="white" />
              </TouchableOpacity>  
            </View>

            {/* Active filters indicator */}
            {getActiveFiltersAssigned().length > 0 && (
              <View className="px-6 mt-4">
                <View className="flex-row flex-wrap">
                  {getActiveFiltersAssigned().map((filter, index) => {
                    // Get color based on type/value
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
                        onPress={() => removeFilterAssigned(filter.type, filter.value)}
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

            {assignedProjects.length > 0 ? (
              <View className="bg-dark-secondary rounded-lg p-2">
                {assignedProjects.map((item) => (
                  <SwipeableProjectCard 
                      key={item.project.id} 
                      project={item}
                      onSwipeLeft={() => {handleUnassignProject(item.project.id)}}
                      swipeDirection="left"
                  />
                ))}
              </View>
            ) : (
              <View className="bg-dark-secondary rounded-lg p-6">
                <Text className="text-dark-text_color text-center opacity-50">
                  Žiadne priradené projekty
                </Text>
              </View>
            )}
          </View>

          {/* Unassigned Projects List */}
          <View className="mb-20">
            <View className='flex-row justify-between items-center'>
              <Text className="text-dark-text_color text-xl font-bold mb-3">
                Nepriradené projekty ({unassignedProjects.length})
              </Text>
              <TouchableOpacity
                onPress={() => {setShowFilterModalUnassigned(true)}}
                activeOpacity={0.8}
                className="ml-4 items-center justify-center"
              >
                <Feather name="filter" size={20} color="white" />
              </TouchableOpacity>   
              
            </View>
            {/* Active filters indicator */}
            {getActiveFiltersUnassigned().length > 0 && (
              <View className="px-6 mt-4">
                <View className="flex-row flex-wrap">
                  {getActiveFiltersUnassigned().map((filter, index) => {
                    // Get color based on type/value
                    let pillColor = "bg-blue-100";
                    let textColor = "text-blue-700";
                  
                    if (filter.type === 'type') {
                      pillColor = TYPE_OPTIONS.find(t => t.value === filter.value)?.colors[1] ?? "border-gray-500 bg-yellow-100";
                      textColor = TYPE_OPTIONS.find(t => t.value === filter.value)?.colors[0] ?? "border-gray-500 bg-yellow-100";
                    } 
                    else if (filter.type === "state") {
                      pillColor = STATE_OPTIONS.find(s => s.value === filter.value)?.colors[1] ?? "border-gray-500 bg-yellow-100";
                      textColor = STATE_OPTIONS.find(s => s.value === filter.value)?.colors[0] ?? "border-gray-500 bg-yellow-100";
                    }
                  
                    return (
                      <TouchableOpacity
                        key={`${filter.type}-${filter.value}-${index}`}
                        onPress={() => removeFilterUnassigned(filter.type, filter.value)}
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

            {unassignedProjects.length > 0 ? (
              <View className="bg-dark-secondary rounded-lg p-2">
                {unassignedProjects.map((item) => (
                  <SwipeableProjectCard 
                    key={item.project.id} 
                    project={item}
                    onSwipeRight={() => {handleAssignProject(item.project.id)}}
                    swipeDirection="right"
                  />
                ))}
              </View>
            ) : (
              <View className="bg-dark-secondary rounded-lg p-6">
                <Text className="text-dark-text_color text-center opacity-50">
                  Žiadne nepriradené projekty
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

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

    </SafeAreaView>
  );
}

// Draggable Project Card Component
interface SwipeableProjectCardProps {
  project: any;
  onSwipeRight?: () => void;
  onSwipeLeft?: () => void;
  swipeDirection: "left" | "right";
}

function SwipeableProjectCard({ 
  project,
  onSwipeRight,
  onSwipeLeft,
  swipeDirection
}: SwipeableProjectCardProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const [swiped, setSwiped] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectWithRelations | null>(null);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        if (swiped) return;

        if(swipeDirection === "right" && gestureState.dx > 0){
          translateX.setValue(gestureState.dx);
        }
        else if(swipeDirection === "left" && gestureState.dx < 0){
          translateX.setValue(gestureState.dx);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (swiped) return;

        const shouldTrigger = Math.abs(gestureState.dx) > SWIPE_TRESHOLD;

        if (shouldTrigger) {
          setSwiped(true);
          const toValue = swipeDirection === "right" ? SCREEN_WIDTH : -SCREEN_WIDTH;

          Animated.timing(translateX, {
            toValue,
            duration: 300,
            useNativeDriver: true,
          }).start(() => {

              if(swipeDirection === "right" && onSwipeRight) {
                onSwipeRight();
              }
              else if(swipeDirection === "left" && onSwipeLeft) {
                onSwipeLeft();
              }

              setTimeout(() => {
                translateX.setValue(0);
                setSwiped(false);
              }, 300);
          });
        }
        else {
          Animated.spring(translateX, {
            toValue:0,
            useNativeDriver: true,
            tension:40, 
            friction: 7,
          }).start();
        }
      },
    })
  ).current;

  const handleModalVisibility = (projectData: ProjectWithRelations, value: boolean) => {
    setSelectedProject(projectData);
    setShowDetails(value);
  };

  return (
    <View className='mb-2 overflow-hidden'>

      <Animated.View
        style={{
          transform: [{translateX}],
        }}
        {...panResponder.panHandlers}
      >
          <ProjectCard
            project={project.project}
            client={project.client}
            users={project.users}
            objects={project.objects}
            onPress={() => {handleModalVisibility(project, true)}}
          />
      </Animated.View>
    
    {/* Project details modal */}
    <Modal
        visible={showDetails}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDetails(false)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center">
          <View className="w-10/12 h-fit bg-dark-bg rounded-2xl overflow-hidden">
            {/* Header */}
            <View className="px-4 py-6 border-b border-gray-200">
              <View className="flex-row items-center justify-between">
                <Text className="text-xl font-bold text-dark-text_color">
                  {selectedProject?.project.type}
                </Text>

                  <TouchableOpacity
                    onPress={() => setShowDetails(false)}
                    className="w-8 h-8 bg-gray-600 rounded-full items-center justify-center"
                  >
                    <EvilIcons name="close" size={24} color="white" />
                  </TouchableOpacity>
               
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
    </View>
  );
}