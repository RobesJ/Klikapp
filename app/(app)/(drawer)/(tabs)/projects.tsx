import { STATE_OPTIONS, TYPE_OPTIONS } from '@/components/badge';
import ProjectDetails from '@/components/cardDetails/projectDetails';
import ProjectCard from '@/components/cards/projectCard';
import FilterModal from '@/components/modals/filterModal';
import { NotificationToast } from '@/components/notificationToast';
import { ProjectsListSkeleton } from '@/components/skeletons/skeleton';
import { Body, Heading1, Heading2 } from '@/components/typography';
import { useAuth } from '@/context/authContext';
import { useProjectStore } from '@/store/projectStore';
import { ProjectWithRelations } from '@/types/projectSpecific';
import { FONT_SIZES } from '@/utils/responsive';
import { EvilIcons, Feather } from '@expo/vector-icons';
import { DrawerActions } from "@react-navigation/native";
import { FlashList } from '@shopify/flash-list';
import { useFocusEffect, useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PixelRatio, TextInput, TextStyle, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const MINIMUM_RESULTS = 20;

export default function Projects() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const dpi = PixelRatio.get();
  const navigation = useNavigation();

  const [showDetails, setShowDetails] = useState(false);
  const [selectedProjectID, setSelectedProjectID] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);

  const isInitialMount = useRef(true);
  const lastFilterCheck = useRef(0);

  const {
    backgroundLoading,
    metadata,
    availableUsers,
    fetchActiveProjects,
    fetchPlannedProjects,
    getFilteredProjects,
    applySmartFilters,
    loadMore,
    filters,
    setFilters,
    clearFilters,
    toggleStateFilter,
    toggleTypeFilter,
    toggleUserFilter,
    removeFilter,
    unlockProject
  } = useProjectStore();

  // clear filters on screen blur
  useFocusEffect(
    useCallback(() => {
      return () => {
        clearFilters();
        setFilters({searchQuery: ''});
        setSearchText('');
      }
    }, [clearFilters, setFilters])
  );

  useEffect(() => {
    if(isInitialMount.current){
      isInitialMount.current = false;
      return;
    }

    const now = Date.now();
    if (now - lastFilterCheck.current < 300){
      return;
    }
    lastFilterCheck.current = now;

    const filteredProjects = getFilteredProjects(filters);
    const hasActiveFilters = 
      filters.searchQuery || 
      filters.state.length > 0 || 
      filters.type.length > 0 || 
      filters.users.length > 0;
  
    const shouldFetch = 
      filteredProjects.length < MINIMUM_RESULTS && !backgroundLoading &&
      metadata.projects.hasMore &&  (hasActiveFilters || filteredProjects.length === 0);
  
    if (shouldFetch) {
      const amountToFetch = MINIMUM_RESULTS - filteredProjects.length;
      applySmartFilters(filters, Math.max(amountToFetch, 30));
    }
  }, [filters, backgroundLoading, metadata.projects.hasMore, getFilteredProjects, applySmartFilters]);

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
      options: STATE_OPTIONS.map(state => ({
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
  ], [filters.type, filters.state, filters.users, availableUsers, toggleStateFilter, toggleTypeFilter, toggleUserFilter]);

  const filteredProjects = getFilteredProjects(filters);
    
  const handleRefresh = useCallback(() => {
    fetchActiveProjects();
    fetchPlannedProjects();
  },[fetchActiveProjects, fetchPlannedProjects]);

  const handleSearch = useCallback((text: string) => {
    setSearchText(text);
    setFilters({searchQuery: text});
  }, [setFilters]);

  const activeFilters = useMemo(() => [
      ...filters.type.map(t => ({ type: "type" as const, value: t })),
      ...filters.state.map(s => ({ type: "state" as const, value: s })),
      ...filters.users.map(u => ({ type: "users" as const, value: u }))
    ], [filters.type, filters.state, filters.users]);

  //const hasActiveFilters = useMemo(() =>
  //  !!(filters.searchQuery || (filters.state.length > 0 ) || (filters.type.length > 0) || (filters.users.length > 0)),
  //[filters.searchQuery, filters.state.length, filters.type.length, filters.users.length]);

  const handleModalVisibility = useCallback((projectID: string, value: boolean) => {
    setSelectedProjectID(projectID);
    setShowDetails(value);
  }, []);

  const loadMoreProjects = useCallback(() => {
    loadMore(filters, 30);
  },[loadMore, filters]);

  const handleCloseWithUnlock = useCallback(() => {
      setShowDetails(false);
      if(selectedProjectID && user){
        unlockProject(selectedProjectID, user.id);
      }
      setSelectedProjectID(null);
  }, [selectedProjectID, unlockProject]);

  const handleAddProject = useCallback(() => {
    router.push({
      pathname: "/addProjectScreen",
      params: {mode: "create"}
    });
  }, [router]);

  const inputStyle = useMemo((): TextStyle => {
    const size = FONT_SIZES["lg"];
    return {
      fontSize: size,
      lineHeight: size * 1.4,
    };
  },[]);

  const renderItem = useCallback(({item}: {item: ProjectWithRelations}) => {
    return(
        <ProjectCard
            project={item.project}
            client={item.client}
            users={item.users}
            objects={item.objects}
            onPress={() => handleModalVisibility(item.project.id, true)}
        />
    );
  }, [handleModalVisibility]);

  const keyExtractor = useCallback((item: ProjectWithRelations) => item.project.id, []);

  // TODO finish this
  const renderFilterPills = useCallback(() => {
    if (activeFilters.length === 0) return null;

    return (
  
      <View className="px-6 mt-4">
        <View className="flex-row flex-wrap">
          {activeFilters.map((filter, index) => {
            let pillColor = "bg-blue-100";
            let textColor = "text-blue-700";

            if (filter.type === 'type') {
              const typeOption = TYPE_OPTIONS.find(s => s.value === filter.value);
              pillColor = typeOption?.colors[1] ?? "bg-yellow-100";
              textColor = typeOption?.colors[0] ?? "bg-yellow-700";
            } 
            else if (filter.type === "state") {
              const stateOption = STATE_OPTIONS.find(s => s.value === filter.value);
              pillColor = stateOption?.colors[1] ?? "bg-yellow-100";
              textColor = stateOption?.colors[0] ?? "bg-yellow-700";
            }

            return (
              <TouchableOpacity
                key={`${filter.type}-${filter.value}-${index}`}
                onPress={() => removeFilter(filter.type, filter.value)}
                className={`${pillColor} rounded-full px-3 py-2 mr-2 mb-2 flex-row items-center`}
              >
                <Body className={`${textColor} font-medium mr-1`}>{filter.value}</Body>
                <Body className={`${textColor} font-bold`}>✕</Body>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    )
  }, [activeFilters, removeFilter]);


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
      {/* HEADER */}
      <View className=" mb-4">
        <View className="flex-row justify-between">
        <TouchableOpacity
            onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
            activeOpacity={0.8}
            className="justify-center"
          >
            <EvilIcons name="navicon" size={36} color="white" />
          </TouchableOpacity>
          <Heading1 allowFontScaling={false} className="font-bold text-4xl text-dark-text_color ml-4">Projekty</Heading1>
          
          <View className='justify-between items-center'>
              <Body className="text-xl text-green-500 mb-1">ONLINE</Body>
              <TouchableOpacity
                onPress={() => {setShowFilterModal(true)}}
                activeOpacity={0.8}
                className="ml-4 items-center justify-center"
              >
                <Feather name="filter" size={20} color="white" />
              </TouchableOpacity>
          </View>
        </View>

        {/* Search klient Input*/}
        <View className="flex-row items-center border-2 border-gray-500 rounded-xl px-4 py-1 mt-4 mb-4">
          <EvilIcons name="search" size={20} color="gray" />
          <TextInput
            className="flex-1 ml-2 text-dark-text_color py-3"
            style={inputStyle}
            placeholder='Vyhľadajte klienta alebo mesto...'
            placeholderTextColor="#9CA3AF"
            value={searchText}
            onChangeText={handleSearch}
          />
        </View>

        {/* Active filters indicator */}
        {renderFilterPills()}

        <NotificationToast screen="projects" />
      </View>
      
      <View className='flex-1 pb-16'>
          {filteredProjects.length === 0 ? (
              <ProjectsListSkeleton/>
          ) : (
              <FlashList
                data={filteredProjects}
                keyExtractor={keyExtractor}
                renderItem={renderItem}
                refreshing={backgroundLoading}
                onRefresh={handleRefresh}
                onEndReached={loadMoreProjects}
                onEndReachedThreshold={0.5}
                ListEmptyComponent={
                  backgroundLoading ? (
                    <Body className="text-center text-gray-500 mt-10">Načítavam...</Body>
                  ) : (
                    <Body className="text-center text-gray-500 mt-10">Žiadne projekty</Body>
                  )
                }
              />
          )}
      </View>
      {/* Add new project buton*/}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={handleAddProject}
        className={`absolute bottom-24 right-6 ${dpi > 2.5 ? "w-16 h-16" : "w-20 h-20" } justify-center items-center border border-white z-10 rounded-full bg-blue-600`}
      >
        <Heading2 className='text-white'>+</Heading2>
      </TouchableOpacity>
      
      {/* Project details modal */}
      {selectedProjectID && (
        <ProjectDetails 
          key={selectedProjectID}
          projectWithRelationsID={selectedProjectID}
          visible={showDetails}
          onClose={()=> {
            setShowDetails(false);
            setSelectedProjectID(null);
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