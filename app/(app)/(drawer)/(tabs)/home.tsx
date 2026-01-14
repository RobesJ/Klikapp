import { STATE_OPTIONS_HOME, TYPE_OPTIONS } from '@/components/badge';
import ProjectDetails from '@/components/cardDetails/projectDetails';
import ProjectCard from '@/components/cards/projectCard';
import FilterModal from '@/components/modals/filterModal';
import { ProjectsListSkeleton } from '@/components/skeletons/skeleton';
import { Body, BodyLarge, BodySmall, Heading1 } from '@/components/typography';
import WeekCalendar from '@/components/weekCalendar';
import { useAuth } from '@/context/authContext';
import { useProjectStore } from '@/store/projectStore';
import { ProjectWithRelations } from '@/types/projectSpecific';
import { EvilIcons, Feather } from '@expo/vector-icons';
import { DrawerActions } from '@react-navigation/native';
import { format, isBefore, isSameDay, parseISO, startOfDay } from 'date-fns';
import { sk } from 'date-fns/locale';
import { useFocusEffect, useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function Home() {
  const insets = useSafeAreaInsets();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDetails, setShowDetails] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectWithRelations | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);

  const router = useRouter();
  const { user } = useAuth();
  const navigation = useNavigation();
  const hasInitialized = useRef(false);
  
  const {
    initialLoading,
    backgroundLoading,
    fetchAvailableUsers,
    fetchActiveProjects,
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

  // fetch data on screen mount
  useEffect(() => {
      if (!hasInitialized.current){
        hasInitialized.current = true;
        fetchActiveProjects();
        fetchAvailableUsers();
      }
  }, []);
  
  // clear filters when leaving the screen
  useFocusEffect(
    useCallback(() => {
      return () => {
        clearFilters();
      }
    }, [clearFilters])
  );

  const filterSections = useMemo(() =>[
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
  ], [availableUsers, filters, toggleTypeFilter, toggleStateFilter, toggleUserFilter]);

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
  }, [filters, projects.size, selectedDate]);

  const handleDetailsVisibility = useCallback((projectData: ProjectWithRelations, value: boolean) => {
    setSelectedProject(projectData);
    setShowDetails(value);
  }, []);

  const activeFilters = useMemo(() => {
    return [
      ...filters.type.map(t => ({ type: "type" as const, value: t })),
      ...filters.state.map(s => ({ type: "state" as const, value: s })),
      ...filters.users.map(u => ({ type: "users" as const, value: u }))
    ];
  }, [filters]);

  const handleCloseWithUnlock = useCallback(() => {
    setShowDetails(false);
    if (selectedProject?.project && user){
      unlockProject(selectedProject.project.id, user.id);
    }
    setSelectedProject(null);
  }, [selectedProject, user, unlockProject]);

  //const hasActiveFilters = (filters.users.length > 0 ) || (filters.state.length > 0 ) || (filters.type.length > 0);

  const renderItem = useCallback(({item}: {item: ProjectWithRelations})  => (
    <ProjectCard
      project={item.project}
      client={item.client}
      users={item.users}
      objects={item.objects}
      onPress={() => handleDetailsVisibility(item, true)}
    />
  ), [handleDetailsVisibility]);

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

        {/* Active filters indicator */}
        {activeFilters.length > 0 && (
          <View className="px-6 mt-4">
            <View className="flex-row flex-wrap">
              {activeFilters.map((filter, index) => {
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

      {/* Content */}
      <View className="flex-1 pt-6 pb-16">
        {initialLoading ? (
          <ProjectsListSkeleton />
        ) : projectsForSelectedDate.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <Body className="text-red-500 mb-4">Žiadne bežiace projekty</Body>
            <TouchableOpacity
              activeOpacity={0.8}
              className="rounded-xl bg-blue-600 py-3 px-8"
              onPress={() => router.push("/planning")}
            >
              <Body className="text-white font-semibold">Plánovať projekty</Body>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={projectsForSelectedDate}
            keyExtractor={(item) => item.project.id}
            renderItem={renderItem}
            scrollEnabled
            
          />
        )}
      </View>

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
        onClearAll={clearFilters}
      />

    </View>
  );
}