import { AnimatedScreen } from '@/components/animatedScreen';
import { STATE_OPTIONS, TYPE_OPTIONS } from '@/components/badge';
import ProjectDetails from '@/components/cardDetails/projectDetails';
import ProjectCard from '@/components/cards/projectCard';
import FilterModal from '@/components/filterModal';
import { useProjectStore } from '@/store/projectStore';
import { ProjectWithRelations } from "@/types/projectSpecific";
import { EvilIcons, Feather } from '@expo/vector-icons';
import { DrawerActions } from "@react-navigation/native";
import { useFocusEffect, useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Projects() {
  const router = useRouter();
  const navigation = useNavigation();
  const [showDetails, setShowDetails] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectWithRelations | null>(null);
  const [searchText, setSearchText] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);

  const {
    backgroundLoading,
    projects,
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
    removeFilter
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

  const filteredProjects = useMemo(() => {
    return getFilteredProjects(filters);
  }, [filters, getFilteredProjects, projects.size]);

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

  const handleClearFilters = () => {
    setSearchText('');
    clearFilters();
  };

  const hasActiveFilters = filters.searchQuery || (filters.state.length > 0 ) || (filters.type.length > 0) || (filters.users.length > 0);

  const handleModalVisibility = (projectData: ProjectWithRelations, value: boolean) => {
    setSelectedProject(projectData);
    setShowDetails(value);
  };

  async function loadMoreProjects() {
    loadMore(filters, 30);
  }

  return (
    <SafeAreaView className="flex-1 bg-dark-bg">
      <AnimatedScreen tabIndex={3}>
      {/* HEADER */}
      <View className="flex-2 mt-4 px-6 mb-4">
        <View className="flex-row justify-between">
        <TouchableOpacity
            onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
            activeOpacity={0.8}
            className="justify-center"
          >
            <EvilIcons name="navicon" size={32} color="white" />
          </TouchableOpacity>
          <Text allowFontScaling={false} className="font-bold text-4xl text-dark-text_color ml-4">Projekty</Text>
          
            <View className='flex-2 justify-between items-center '>
              <Text className="text-xl text-green-500">ONLINE</Text>
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
            className="flex-1 ml-2 text-dark-text_color"
            placeholder='Vyhladajte klienta alebo mesto...'
            placeholderTextColor="#9CA3AF"
            value={searchText}
            onChangeText={handleSearch}
          />
        </View>

        <View className='flex-row'>            

          {/* Clear filters button */}
          <View className='flex-1 items-end justify-center'>
          {hasActiveFilters && (
            <TouchableOpacity
              onPress={()=> handleClearFilters()}
              >
              <Text className='color-red-600'>
               Zrusit filtre
              </Text>
            </TouchableOpacity>
          )}
          </View>
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
                    <Text className={`${textColor} font-medium mr-1`}>{filter.value}</Text>
                    <Text className={`${textColor} font-bold`}>✕</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      </View>
        
      <FlatList
        data={filteredProjects}
        keyExtractor={(item) => item?.project?.id || Math.random().toString()}
        renderItem={({item}) =>(
          <ProjectCard
              project={item.project}
              client={item.client}
              users={item.users}
              objects={item.objects}
              onPress={() => handleModalVisibility(item, true)}
          />
        )}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
        refreshing={backgroundLoading}
        onRefresh={handleRefresh}
        onEndReached={loadMoreProjects}
        ListEmptyComponent={
          backgroundLoading ? (
            <Text className="text-center text-gray-500 mt-10">Načítavam...</Text>
          ) : (
            <Text className="text-center text-gray-500 mt-10">Žiadne projekty</Text>
          )
        }
      />
      
      {/* Add new project buton*/}
      <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => {router.push({
        pathname: "/addProjectScreen",
        params: { mode: "create" }
      })}}
      style={{
        position: 'absolute',
        bottom: 110,
        right: 28,
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#1174EE',
        borderColor: '#FFFFFF',
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
      }}
    >
      <Text 
        className='text-white text-3xl'>
        +
      </Text>
      </TouchableOpacity>
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