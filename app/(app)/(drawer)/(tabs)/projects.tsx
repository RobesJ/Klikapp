import { STATE_OPTIONS, TYPE_OPTIONS } from '@/components/badge';
import ProjectDetails from '@/components/cardDetails/projectDetails';
import ProjectCard from '@/components/cards/projectCard';
import FilterModal from '@/components/modals/filterModal';
import { NotificationToast } from '@/components/notificationToast';
import { ProjectsListSkeleton } from '@/components/skeletons/skeleton';
import { Body, Heading1, Heading2 } from '@/components/typography';
import { useAuth } from '@/context/authContext';
import { useProjectStore } from '@/store/projectStore';
import { FONT_SIZES } from '@/utils/responsive';
import { EvilIcons, Feather } from '@expo/vector-icons';
import { DrawerActions } from "@react-navigation/native";
import { useFocusEffect, useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, PixelRatio, TextInput, TextStyle, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

  const {
    backgroundLoading,
    //projects,
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
  
  const MINIMUM_RESULTS = 20;

  useFocusEffect(
    useCallback(() => {
      return () => {
        clearFilters();
        setFilters({searchQuery: ''});
      }
    }, [clearFilters, setFilters])
  );

  useEffect(() => {
    const shouldFetch = 
      filteredProjects.length < MINIMUM_RESULTS &&
      !backgroundLoading &&
      metadata.projects.hasMore && 
      (hasActiveFilters || filteredProjects.length === 0);
  
    if (shouldFetch) {
      const amountToFetch = MINIMUM_RESULTS - filteredProjects.length;
      applySmartFilters(filters, Math.max(amountToFetch, 30));
    }
  }, [filters, getFilteredProjects]);

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
  ];

  const filteredProjects = getFilteredProjects(filters);
    
  const handleRefresh = () => {
    fetchActiveProjects();
    fetchPlannedProjects();
  };

  const handleSearch = (text: string) => {
    setSearchText(text);
    setFilters({searchQuery: text});
  };

  const getActiveFilters = () => {
    return [
      ...filters.type.map(t => ({ type: "type" as const, value: t })),
      ...filters.state.map(s => ({ type: "state" as const, value: s })),
      ...filters.users.map(u => ({ type: "users" as const, value: u }))
    ];
  };

  const hasActiveFilters = filters.searchQuery || (filters.state.length > 0 ) || (filters.type.length > 0) || (filters.users.length > 0);

  const handleModalVisibility = (projectID: string, value: boolean) => {
    setSelectedProjectID(projectID);
    setShowDetails(value);
  };

  async function loadMoreProjects() {
    loadMore(filters, 30);
  };

  const handleCloseWithUnlock = () => {
      setShowDetails(false);
      if(selectedProjectID && user){
        unlockProject(selectedProjectID, user.id);
      }
      setSelectedProjectID(null);
  };

  const inputStyle = useMemo((): TextStyle => {
    const size = FONT_SIZES["lg"];
    return {
      fontSize: size,
      lineHeight: size * 1.4,
    };
  },[]);

  return (
    <View
      style={{
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
        flex: 1,
        backgroundColor: "#0c1026",
      }}
    >
      {/* HEADER */}
      <View className="mt-4 px-6 mb-4">
        <View className="flex-row justify-between">
        <TouchableOpacity
            onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
            activeOpacity={0.8}
            className="justify-center"
          >
            <EvilIcons name="navicon" size={32} color="white" />
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
            className="ml-2 text-dark-text_color py-3"
            style={inputStyle}
            placeholder='Vyhladajte klienta alebo mesto...'
            placeholderTextColor="#9CA3AF"
            value={searchText}
            onChangeText={handleSearch}
          />
        </View>

        {/* Active filters indicator */}
        {getActiveFilters().length > 0 && (
          <View className="px-6 mt-4">
            <View className="flex-row flex-wrap">
              {getActiveFilters().map((filter, index) => {
                let pillColor = "bg-blue-100";
                let textColor = "text-blue-700";

                if (filter.type === 'type') {
                  pillColor = TYPE_OPTIONS.find(s => s.value === filter.value)?.colors[1] ?? "border-gray-500 bg-yellow-100";
                  textColor = TYPE_OPTIONS.find(s => s.value === filter.value)?.colors[0] ?? "border-gray-500 bg-yellow-100";
                } 
                else {
                  pillColor = STATE_OPTIONS.find(s => s.value === filter.value)?.colors[1] ?? "border-gray-500 bg-yellow-100";
                  textColor = STATE_OPTIONS.find(s => s.value === filter.value)?.colors[0] ?? "border-gray-500 bg-yellow-100";
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
        )}
        <NotificationToast
          screen="projects"
        />
      </View>
      
      {filteredProjects.length === 0 ? (
          <ProjectsListSkeleton/>
      ) : (
          <FlatList
            data={filteredProjects}
            keyExtractor={(item) => item?.project?.id || Math.random().toString()}
            renderItem={({item}) =>(
              <ProjectCard
                  project={item.project}
                  client={item.client}
                  users={item.users}
                  objects={item.objects}
                  onPress={() => handleModalVisibility(item.project.id, true)}
              />
            )}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
            refreshing={backgroundLoading}
            onRefresh={handleRefresh}
            onEndReached={loadMoreProjects}
            ListEmptyComponent={
              backgroundLoading ? (
                <Body className="text-center text-gray-500 mt-10">Načítavam...</Body>
              ) : (
                <Body className="text-center text-gray-500 mt-10">Žiadne projekty</Body>
              )
            }
          />
      )}
      {/* Add new project buton*/}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => {router.push({
          pathname: "/addProjectScreen",
          params: { mode: "create" }
        })}}
        className={`absolute bottom-24 right-6 ${dpi > 2.5 ? "w-16 h-16" : "w-20 h-20" } justify-center items-center border border-white z-10 rounded-full bg-blue-600`}
      >
        <Heading2 className='text-white'> + </Heading2>
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