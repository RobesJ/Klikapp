import ProjectDetails from '@/components/cardDetails/projectDetails';
import ProjectCard from '@/components/cards/projectCard';
import { FilterPills } from '@/components/FilterPills';
import FilterModal from '@/components/modals/filterModal';
import { NotificationToast } from '@/components/notificationToast';
import { ProjectsListSkeleton } from '@/components/skeletons/skeleton';
import { Body, Heading1, Heading2 } from '@/components/typography';
import { useAuth } from '@/context/authContext';
import { useActiveFilters } from '@/hooks/projectFilteringHooks/useActiveFilters';
import { useFilterSections } from '@/hooks/projectFilteringHooks/useFilterSections';
import { useProjectFilters } from '@/hooks/projectFilteringHooks/useProjectFilters';
import { useHomeScreenStore } from '@/store/homeScreenStore';
import { useProjectStore } from '@/store/projectScreenStore';
import { ProjectWithRelations } from '@/types/projectSpecific';
import { applyFilters } from '@/utils/projectFilteringUtils';
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
  const { availableUsers } = useHomeScreenStore();

  const {
    backgroundLoading,
    fetchProjects,
    refresh,
    projects,
    metadata,
    //applyFilters,
    // loadMore,
    unlockProject
  } = useProjectStore();

  const filterState = useProjectFilters({
    includeCities: false,
    includeSearch: true
  });

  const filterSections = useFilterSections({
    filters: filterState.filters,
    availableUsers: availableUsers,
    toggleType: filterState.toggleType,
    toggleState: filterState.toggleState,
    toggleUser: filterState.toggleUser,
  });

  const activeFilters = useActiveFilters(filterState.filters, availableUsers);

  // clear filters on screen blur
  useFocusEffect(
    useCallback(() => {
      return () => {
        filterState.clearFilters();
        setSearchText('');
      }
    }, [filterState.clearFilters])
  );

  // if initial mount and not planned was not fetch than fetch planned
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
        fetchProjects();
    }
  }, [fetchProjects]);


  const filteredProjects = applyFilters(Array.from(projects.values()), filterState.filters);
    
  const handleRefresh = useCallback(() => {
    refresh(filterState.filters);
  },[refresh, filterState.filters]);

  const handleSearch = useCallback((text: string) => {
    setSearchText(text);
    filterState.setSearchQuery(text);
  }, [filterState.setSearchQuery]);

  const handleModalVisibility = useCallback((projectID: string, value: boolean) => {
    setSelectedProjectID(projectID);
    setShowDetails(value);
  }, []);

  // const loadMoreProjects = useCallback(() => {
  //   if(backgroundLoading || !metadata.hasMore) {
  //     console.log("load more handler called but returned");
  //     return;
  //   }
  //   loadMore(filterState.filters);
  // },[
  //   backgroundLoading,
  //   metadata.hasMore,
  //   loadMore, 
  //   filterState.filters
  // ]);

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
        <FilterPills filters={activeFilters} onRemove={filterState.removeFilter}/>

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
                // onEndReached={loadMoreProjects}
                // onEndReachedThreshold={0.5}
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
        onClearAll={filterState.clearFilters}
      />
      
    </View>
  );
}