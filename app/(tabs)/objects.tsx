import ObjectDetails from '@/components/cardDetails/objectDetails';
import ObjectCard from '@/components/objectCard';
import { useObjectStore } from '@/store/objectStore';
import { ObjectWithRelations } from '@/types/objectSpecific';
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';


export default function Objects() {
  const [showDetails, setShowDetails] = useState(false);
  const [selectedObject, setSelectedObject] = useState<ObjectWithRelations | null>(null);

  const {
    objects,
    loading,
    fetchObjects,
    filters,
    filteredObjects
  } = useObjectStore();

  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      fetchObjects(50);
    }, [])
  );
 
  const handleModalVisibility = (objectData: ObjectWithRelations, value: boolean) =>{
    setShowDetails(value);
    setSelectedObject(objectData);
  };

  const handleRefresh = () => {
    fetchObjects(50);
  };
  
  return (
    <SafeAreaView className="flex-1">
      <View className="flex-2 mt-4 px-6 mb-8">
        <View className="flex-row justify-between">
          <Text className="font-bold text-4xl">Objekty</Text>
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
        data={objects}
        keyExtractor={(item) => item.object.id}
        renderItem={({item}) =>(
        <ObjectCard
          object={item.object}
          chimneys={item.chimneys}
          client={item.client}
          onPress={() => handleModalVisibility(item, true)}
        />
        )}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100}}
        refreshing={loading}
        onRefresh={handleRefresh}
        ListEmptyComponent={
          loading ? (
            <Text className='text-center mt-10 text-gray-500'>
              Nacitavam...
            </Text>
          ): (
            <Text className='text-center mt-10 text-gray-500'>
              Ziadny klienti neboli najdeny
            </Text>
          )
        }>
      </FlatList>

      <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => router.push({
        pathname: "/addObjectScreen",
        params: { mode: "create" }
      })}
      style={{
        position: 'absolute',
        bottom: 130,
        right: 24,
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#000000',
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
      <Modal
        visible={showDetails}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDetails(false)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center">
          <View className="w-3/4 bg-white rounded-2xl overflow-hidden">
            {/* Header */}
            <View className="px-4 py-6 border-b border-gray-200">
              <View className="flex-row items-center justify-between">
                <Text className="text-xl font-bold">Detaily objektu</Text>

                <View className="flex-row gap-2">
                  <TouchableOpacity
                    onPress={() => {
                      setShowDetails(false);
                      router.push({
                        pathname: "/addObjectScreen",
                        params: { 
                          object: JSON.stringify(selectedObject), 
                          mode: "edit" 
                        }
                      });
                    }}
                    activeOpacity={0.8}
                    className="w-8 h-8 bg-blue-100 rounded-full items-center justify-center"
                  >
                    <Text className="text-blue-600 font-bold">✏️</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    onPress={() => setShowDetails(false)}
                    className="w-8 h-8 bg-gray-100 rounded-full items-center justify-center"
                  >
                    <Text className="text-gray-600 font-bold">✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
                  
            <ScrollView className="max-h-96 p-4">
              {selectedObject && (
                <ObjectDetails 
                  object={selectedObject.object}
                  client={selectedObject.client}
                  chimneys={selectedObject.chimneys} />
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}