import { STATE_OPTIONS, TYPE_OPTIONS } from '@/components/badge';
import ProjectDetails from '@/components/cardDetails/projectDetails';
import ProjectCard from '@/components/cards/projectCard';
import { getFooterImageBase64, getWatermarkBase64 } from '@/constants/icons';
import { supabase } from '@/lib/supabase';
import { generateAllChimneyRecords } from "@/services/pdfService";
import { useProjectStore } from '@/store/projectStore';
import { ProjectWithRelations } from "@/types/projectSpecific";
import { EvilIcons, Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Modal, ScrollView, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Projects() {
  const router = useRouter();
  const [showDetails, setShowDetails] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectWithRelations | null>(null);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showStateModal, setShowStateModal] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const {
    filteredProjects,
    backgroundLoading,
    fetchProjects,
    filters,
    setFilters,
    clearFilters,
    removeFilter,
    toggleTypeFilter,
    toggleStateFilter,
    deleteProject
  } = useProjectStore();

  useFocusEffect(
    useCallback(() => {
      fetchProjects(50);
      
    }, [])
  );

  // Inside your button handler
  const handleGeneratePDF = async (type: "cleaning" | "inspection") => {
    try {
      setIsGenerating(true);
      console.log('Starting PDF generation...');
      
      const watermarkBase64 = await getWatermarkBase64();
      const footerBase64 = await getFooterImageBase64();
      
      if(selectedProject){
        console.log('Generating records for project:', selectedProject.project.id);
        console.log('Number of objects:', selectedProject.objects.length);
        console.log('Number of chimneys in first object:', selectedProject.objects[0]?.chimneys.length);
        
        const uris = await generateAllChimneyRecords(
          selectedProject.project,
          selectedProject.users[0],
          selectedProject.client,
          selectedProject.objects,
          watermarkBase64,
          footerBase64,
          type
        );
        const uploadPromises = uris.map(async (uri, index) => {
          try {
            // Create unique filename for each PDF
            const timestamp = Date.now();
            const chimneyIndex = index + 1;
            let filename;
            if(type === "cleaning"){
              filename =`cleaning_${chimneyIndex}_${timestamp}.pdf`;
            }
            else{
              filename =`inspection_${chimneyIndex}_${timestamp}.pdf`;
            }
            
            const response = await fetch(uri);
            const blob = await response.blob();
            const arrayBuffer = await new Response(blob).arrayBuffer();
            
            // Upload to Supabase Storage
            const { error: uploadError } = await supabase
              .storage
              .from("pdf-reports")
              .upload(filename, arrayBuffer, {
                contentType: 'application/pdf',
                upsert: false,
              });
            
            if (uploadError) throw uploadError;
            
            // Get public URL
            const { data: urlData } = supabase.storage
              .from("pdf-reports")
              .getPublicUrl(filename);
            
            console.log(`PDF ${chimneyIndex} uploaded:`, urlData.publicUrl);
            
            return urlData.publicUrl;
          } catch (error) {
            console.error(`Error uploading PDF ${index + 1}:`, error);
            throw error;
          }
        });
        
        // Wait for all uploads to complete
        const publicUrls = await Promise.all(uploadPromises);
        
        console.log('All PDFs uploaded:', publicUrls);
        alert(`${uris.length} PDF(s) úspešne nahrané!`);
        
        console.log('Generated PDFs:', uris);
      }
    } catch (error) {
      console.error('PDF generation failed:', error);
      alert(`PDF generation failed: ${error}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRefresh = () => {
    fetchProjects(50);
  };

  const handleSearch = (text: string) => {
    setSearchText(text);
    setFilters({searchQuery: text});
  };

  const getActiveFilters = () => {
    return [
      ...filters.type.map(t => ({ type: "type" as const, value: t })),
      ...filters.state.map(s => ({ type: "state" as const, value: s }))
    ];
  };

  const activeTypeCount = filters.type.length;
  const activeStateCount = filters.state.length;

  const handleClearFilters = () => {
    setSearchText('');
    clearFilters();
  };

  const hasActiveFilters = filters.searchQuery || (filters.state.length > 0 ) || (filters.type.length > 0);

  const handleModalVisibility = (projectData: ProjectWithRelations, value: boolean) => {
    setSelectedProject(projectData);
    setShowDetails(value);
  };

  return (
    <SafeAreaView className="flex-1 bg-dark-bg">
      <View className="flex-2 mt-4 px-6 mb-4">
        <View className="flex-row justify-between">
        <TouchableOpacity
            onPress={() => {}}
            activeOpacity={0.8}
            className="justify-center"
          >
            <EvilIcons name="navicon" size={32} color="white" />
          </TouchableOpacity>
          <Text className="font-bold text-4xl text-dark-text_color ml-4">Projekty</Text>
          
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
                // Get color based on type/value
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
                    <Text className={`${textColor} font-medium mr-1`}>
                      {filter.value}
                    </Text>
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
        keyExtractor={(item) => item.project.id}
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
        backgroundColor: '#777777',
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
                
                <View className="flex-row gap-2">

                {selectedProject && selectedProject.project.type !== "Obhliadka" && (
                  <TouchableOpacity
                    onPress={() => {
                      if(selectedProject.project.type === "Čistenie"){
                        handleGeneratePDF("cleaning");
                      }
                      else{
                        handleGeneratePDF("inspection");
                      }
                    }}
                    disabled={isGenerating}
                    className={`px-4 py-2 rounded ${isGenerating ? 'bg-gray-400' : 'bg-blue-500'}`}
                  >
                    <Text className="text-white">
                      {isGenerating ? 'Generujem...' : 'Generovat zaznam'}
                    </Text>
                  </TouchableOpacity>
                )}
                  {/*
                      selectedProject.objects.map(ch => (
                        ch.chimneys.map(c => {
                          generateAllChimneyRecords(selectedProject.project, selectedProject.client, selectedProject.objects, c, "sgkshgksd", "ushgfukghsduidsu", "cleaning");
                          })
                        ));
                    }*/}
                  <TouchableOpacity
                    onPress={() => {
                      setShowDetails(false);
                      router.push({
                        pathname: "/addProjectScreen",
                        params: { 
                          project: JSON.stringify(selectedProject), 
                          mode: "edit", 
                          preselectedClient: JSON.stringify(selectedProject?.client)
                        }
                      });
                    }}
                    activeOpacity={0.8}
                    className="w-8 h-8 bg-gray-600 rounded-full items-center justify-center"
                  >
                    <Feather name="edit-2" size={16} color="white" />
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    onPress={() => {
                      if(selectedProject){
                        try{
                          deleteProject(selectedProject?.project.id);
                          setShowDetails(false);
                        }
                        catch (error){
                          console.error("Delete failed:", error);
                        }
                        setSelectedProject(null);
                      }
                    }}
                    activeOpacity={0.8}
                    className="w-8 h-8 bg-gray-600 rounded-full items-center justify-center"
                  >
                    <EvilIcons name="trash" size={24} color="white" />
                  </TouchableOpacity>


                  <TouchableOpacity
                    onPress={() => setShowDetails(false)}
                    className="w-8 h-8 bg-gray-600 rounded-full items-center justify-center"
                  >
                    <EvilIcons name="close" size={24} color="white" />
                  </TouchableOpacity>
                </View>
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
      
      {/* Filters modal */}
      <Modal
        visible={showFilterModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center">
        <View className="w-3/4 bg-dark-bg rounded-2xl overflow-hidden">
            {/* Header */}
            <View className="px-4 py-6 border-b border-gray-200">
              <View className="flex-row items-center justify-between">
                
                <Text className="text-xl font-bold text-dark-text_color">
                  Filtrovat
                </Text>

                <TouchableOpacity
                  onPress={() => setShowFilterModal(false)}
                  className="w-8 h-8 bg-gray-600 rounded-full items-center justify-center"
                >
                  <EvilIcons name="close" size={24} color="white" />
                </TouchableOpacity>
                
              </View>
            </View>

            <View className='flex-2 ml-4 mt-8 max-w-52'>
              <TouchableOpacity
                onPress={()=>{
                  if(showTypeModal){
                    setShowTypeModal(false);
                  }
                  else{
                    setShowTypeModal(true);
                  }
                }}
                activeOpacity={0.8}
                className="rounded-2xl border-2 border-gray-400 py-2 px-4 flex-row items-center justify-between"
                >
                  <View className='flex-row gap-2'>     
                    <Text className='text-dark-text_color'>
                      Typ
                    </Text>
                    {activeTypeCount > 0 && (
                        <View className="bg-blue-500 rounded-full w-5 h-5  items-center justify-center">
                          <Text className="text-white text-xs font-bold">{activeTypeCount}</Text>
                        </View>
                    )}
                  </View>
                  <View>
                    <Text className="text-dark-text_color">▼</Text>
                  </View>
              </TouchableOpacity>
              
              {showTypeModal && (
                <ScrollView className='mb-4 mt-1'>
                    {TYPE_OPTIONS.map((type) => (
                      <View key={type.value} 
                      className={`flex-row  items-center justify-between w-48`}>
                      <Text className={`${type.colors[1]} rounded-2xl px-4 py-1 ${type.colors[0]}`}>
                        {type.value}
                      </Text>
                      <Switch
                        value={filters.type.includes(type.value)}
                        onValueChange={() => toggleTypeFilter(type.value)}
                        trackColor={{ false: "#555", true: "#4ade80" }}  // optional
                        thumbColor={"white"}  // optional
                      />
                    </View>
                    ))
                    }
                </ScrollView>
              )}


              <TouchableOpacity
                onPress={()=>{
                if(showStateModal){
                  setShowStateModal(false);
                }
                else{
                  setShowStateModal(true);
                }
              }}
                activeOpacity={0.8}
                className="rounded-2xl border-2 border-gray-400 py-2 px-4 flex-row items-center justify-between"
                >
                  <View className='flex-row gap-2'>          
                    <Text className='text-dark-text_color'>
                      Stav
                    </Text>
                    {activeStateCount > 0 && (
                      <View className=" bg-blue-500 rounded-full w-5 h-5 items-center justify-center">
                        <Text className="text-white text-xs font-bold">{activeStateCount}</Text>
                      </View>
                    )}
                   </View>
                  <View>
                    <Text className="text-dark-text_color">▼</Text>
                  </View>
              </TouchableOpacity>
              
              {showStateModal && (
                <ScrollView className='mb-8 mt-1'>
                    {STATE_OPTIONS.map((state) => (
                      <View key={state.value} 
                        className={`flex-row items-center justify-between w-48`}>
                        <Text className={` ${state.colors[1]} rounded-2xl px-4 py-1 ${state.colors[0]}`}>{state.value}</Text>
                        <Switch
                          value={filters.state.includes(state.value)}
                          onValueChange={() => toggleStateFilter(state.value)}
                          trackColor={{ false: "#555", true: "#4ade80" }}  // optional
                          thumbColor={"white"}  // optional
                        />
                      </View>
                    ))
                    }
                </ScrollView>
              )}
            </View>
            
          </View>
        </View>  
      </Modal>    
    </SafeAreaView>
  );
}