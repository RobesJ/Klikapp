import ProjectCard from '@/components/projectCard';
import { useClientStore } from '@/store/clientStore';
import { useObjectStore } from '@/store/objectStore';
import { useProjectStore } from '@/store/projectStore';
import { useEffect, useState } from 'react';
import { FlatList, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Home() {
  const [appReady, setAppReady] = useState(false);
  const {filteredProjects} = useProjectStore();

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

  return (
    <SafeAreaView className="flex-1">
      {appReady && (
        <View>          
          <View className="flex-2 mt-4 px-6 mb-8">
            <View className="flex-row justify-between">
              <Text className="font-bold text-4xl">Aktualne projekty</Text>
              <Text className="text-xl text-green-500">ONLINE</Text>
            </View>
            <View className='flex-2 w-full mt-4'> 
              <TextInput 
                className='border-2 rounded-xl border-gray-500 py-4 px-4'
                placeholder='Vyhladajte klienta...'
              />
           </View>
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
                  onPress={() => {}}
              />
            )}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
          />
        </View>
      )}
    </SafeAreaView>
  );
}