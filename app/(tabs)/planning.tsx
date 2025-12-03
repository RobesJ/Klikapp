import ProjectDetails from '@/components/cardDetails/projectDetails';
import ProjectCard from '@/components/cards/projectCard';
import WeekCalendar from '@/components/weekCalendar';
import { useProjectStore } from '@/store/projectStore';
import { ProjectWithRelations } from '@/types/projectSpecific';
import { EvilIcons, Feather } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { sk } from 'date-fns/locale';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Dimensions, Modal, PanResponder, ScrollView, Text, TouchableOpacity, Vibration, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';


const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_TRESHOLD = SCREEN_WIDTH * 0.4;

export default function Planning() {
    const {
      assignedProjects,
      unassignedProjects,
      fetchAssignedProjects,
      fetchUnassignedProjects,
      backgroundLoading,
      assignProjectToDate,
      unassignProject
    } = useProjectStore();

    const [selectedDate, setSelectedDate] = useState(new Date());
    const [pendingAssignment, setPendingAssignment] = useState<string| null>(null);
    const { preselectedDate} = useLocalSearchParams();
  

    useEffect(() => {  
      if (preselectedDate){
        setSelectedDate(parseISO(JSON.parse(preselectedDate as string)))
      }
    }, [preselectedDate]);
  
    useEffect(() => {  
      fetchAssignedProjects(selectedDate);
      fetchUnassignedProjects(selectedDate);
    }, [selectedDate]);


    const handleDateSelect = (date: Date) => {
      setSelectedDate(date);
    };


    const handleAssignProject = async (projectId: string) => {
      try{
        await assignProjectToDate(projectId, selectedDate);
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

        await fetchAssignedProjects(selectedDate);
        await fetchUnassignedProjects(selectedDate);

        Vibration.vibrate(50);
      }
      catch(error: any){
        console.error("Error unassigning project:", error);
        Alert.alert('Chyba', error.message || "Nastal problém pri presune projektu");
      }
    };


  return (
    <SafeAreaView className="flex-1 bg-dark-bg">
      <ScrollView>
        <View className="flex-1 px-6 mt-4">
          {/* Header */}
          <View className="flex-row justify-between items-center mb-2">
            <TouchableOpacity
                onPress={() => {}}
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

          {/* Selected Date 
          <Text className="text-dark-text_color mb-4">
            {format(selectedDate, "EEE, d. MMMM yyyy", { locale: sk })}
          </Text>
        */}
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
              {assignedProjects.length > 0 && (
                <TouchableOpacity
                  onPress={() => {}}
                  activeOpacity={0.8}
                  className="ml-4 items-center justify-center"
                >
                  <Feather name="filter" size={20} color="white" />
                </TouchableOpacity>  
              )}
            </View>
            
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
                onPress={() => {}}
                activeOpacity={0.8}
                className="ml-4 items-center justify-center"
              >
                <Feather name="filter" size={20} color="white" />
              </TouchableOpacity>   
            </View>
            
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
    </View>
  );
}