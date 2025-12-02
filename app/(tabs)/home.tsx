import ProjectDetails from '@/components/cardDetails/projectDetails';
import ProjectCard from '@/components/cards/projectCard';
import WeekCalendar from '@/components/weekCalendar';
import { getFooterImageBase64, getWatermarkBase64 } from '@/constants/icons';
import { supabase } from '@/lib/supabase';
import { generateAllChimneyRecords } from "@/services/pdfService";
import { useClientStore } from '@/store/clientStore';
import { useObjectStore } from '@/store/objectStore';
import { useProjectStore } from '@/store/projectStore';
import { ProjectWithRelations } from '@/types/projectSpecific';
import { EvilIcons, Feather } from '@expo/vector-icons';
import { format, isBefore, isSameDay, parseISO, startOfDay } from 'date-fns';
import { sk } from 'date-fns/locale';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Home() {
  const [appReady, setAppReady] = useState(false);
  const {filteredProjects, deleteProject} = useProjectStore();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDetails, setShowDetails] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectWithRelations | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const router = useRouter();
  
  useEffect(() => {
    async function initApp() {
      await useProjectStore.getState().fetchActiveProjects(50);
      
      setAppReady(true);

      const timer = window.setTimeout(() => {
        loadRemamianinData();
      }, 500);
    }

    async function loadRemamianinData() {
      await Promise.all([
        useClientStore.getState().fetchClients(100),
        useProjectStore.getState().fetchProjects(50),
        useObjectStore.getState().fetchObjects(100),
      ]);
    }

    initApp();
  }, []);

  const projectsForSelectedDate = filteredProjects.filter((p) => {
    if (!p.project || !p.project.start_date) return false;
    if (p.project.completion_date) return false;
    try {
      const startDate = parseISO(p.project.start_date);
      const today = startOfDay(selectedDate);
      
      return isBefore(startDate, today) || isSameDay(startDate, today);
    }
    catch {
      return false;
    }
  });

  const handleDetailsVisibility = (projectData: ProjectWithRelations, value: boolean) => {
    setSelectedProject(projectData);
    setShowDetails(value);
  };

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

  return (
    <SafeAreaView className="flex-1 bg-dark-bg">
      {appReady && (
        <View>          
          <View className="flex-2 mt-4 px-6 mb-8">
            <View className="flex-row justify-between">
              <Text className="font-bold text-4xl text-dark-text_color">Aktuálne projekty</Text>
              <View className="flex-row justify-between items-center">
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
             <View>
                <Text className=' text-dark-text_color'>
                  {format(selectedDate, "EEE, d. MMMM yyyy", {locale: sk})}
                </Text>
             </View>
             <View className="mt-4">
                <WeekCalendar 
                  selectedDay={selectedDate}
                  onDateSelect={setSelectedDate}
                />
             </View>
          </View>
          {projectsForSelectedDate.length > 0 ? (
            <View >
              <FlatList
                data={projectsForSelectedDate}
                keyExtractor={(item) => item.project.id}
                renderItem={({item}) =>(
                  <ProjectCard
                      project={item.project}
                      client={item.client}
                      users={item.users}
                      objects={item.objects}
                      onPress={() => handleDetailsVisibility(item, true)}
                  />
                )}
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
              />
              <View className="items-center">
              <TouchableOpacity
                  activeOpacity={0.8}
                  className="rounded-xl bg-blue-600 py-4 px-8"
                  onPress={()=> router.push({
                    pathname: "/planning",
                    params: {preselectedDate: JSON.stringify(selectedDate)}
                  })}
                >
                  <Text className='text-white font-bold text-lg'>Plánovať ďalšie projekty na tento deň</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
              <View className="items-center justify-center mt-8">
                <Text className="text-dark-text_color mb-4 text-lg">
                  Žiadne bežiace projekty
                </Text>
                <TouchableOpacity
                  activeOpacity={0.8}
                  className="rounded-xl bg-blue-600 py-2 px-4"
                  onPress={()=> router.push("/planning")}
                >
                  <Text className='text-white font-bold text-lg'>Plánovať projekty</Text>
                </TouchableOpacity>
              </View>
            )
          }
        </View>
      )}

      {/* Project details modal */}
      <Modal
        visible={showDetails}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDetails(false)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center">
          <View className="w-3/4 bg-dark-bg rounded-2xl overflow-hidden">
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


    </SafeAreaView>
  );
}