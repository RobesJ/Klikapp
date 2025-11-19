import ObjectDetails from '@/components/cardDetails/objectDetails';
import ObjectCard from '@/components/cards/objectCard';
import { useObjectStore } from '@/store/objectStore';
import { Client } from '@/types/generics';
import { ObjectWithRelations } from '@/types/objectSpecific';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Modal, ScrollView, SectionList, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Objects() {
  const [showDetails, setShowDetails] = useState(false);
  const [selectedObject, setSelectedObject] = useState<ObjectWithRelations | null>(null);
  const [searchText, setSearchText] = useState('');

  const {
    loading,
    fetchObjects,
    setFilters,
    filters,
    deleteObject,
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

  const handleSearchText = (text: string) => {
    setSearchText(text);
    setFilters({searchQuery: text});
  };

  const objectsGroupedByClient = useMemo(() => {
    const groups: Record< string, {client: Client; objects: ObjectWithRelations[]}> ={};

    filteredObjects.forEach(o => {

      if (!o.client || !o.client.id){
        console.warn("Object missing client data:", o);
        return;
      }
      const clientId = o.client.id;

      if (!groups[clientId]){
        groups[clientId] ={
          client: o.client,
          objects: []
        };
      }
      groups[clientId].objects.push(o);
    });
    return Object.values(groups);
  }, [filteredObjects]);
  
  return (
    <SafeAreaView className="flex-1">

      {/* Header */}
      <View className="flex-2 mt-4 px-6 mb-8">
        <View className="flex-row justify-between">
          <Text className="font-bold text-4xl">Objekty</Text>
          <Text className="text-xl text-green-500">ONLINE</Text>
        </View>
        <View className="flex-row items-center border-2 border-gray-500 rounded-xl px-4 py-2 mt-4">
          <Ionicons name="search" size={20} color="gray" />
          <TextInput
            className="flex-1 ml-2"
            placeholder='Vyhladajte klienta...'
            value={searchText}
            onChangeText={handleSearchText}
          />
        </View>
      </View>

      <SectionList
          sections={objectsGroupedByClient.map(group => ({
            title: group.client.name,
            clientID: group.client.id,
            data: group.objects
          }))}
          
          keyExtractor={(item) => item.object.id}
          renderItem={({item})=> (
            
            <ObjectCard
              object={item.object}
              chimneys={item.chimneys}
              client={item.client}
              onPress={() => handleModalVisibility(item, true)}
            />
          )}
          renderSectionHeader={({section}) =>
            <Text className="px-4 py-2 mt-4 mb-2 font-bold text-lg bg-gray-200">
              {section.title} ({section.data.length})
            </Text>
          }
          contentContainerStyle={{paddingBottom:100, paddingHorizontal:20}}
          >
      </SectionList>
     
      <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => router.push({
        pathname: "/addObjectScreen",
        params: { mode: "create" }
      })}
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
                {selectedObject?.object.city ? (
                  <View className='flex-1'>
                  <Text className="text-xl font-bold">{selectedObject.object.streetNumber}</Text>
                  <Text className="text-xl font-bold">{selectedObject.object.city}</Text>
                  </View>
                ): (
                  <Text className="text-xl font-bold">{selectedObject?.object.address}</Text>
                )}
                
                {/* Object detail card action buttons*/}
                <View className="flex-row gap-2">
                  <TouchableOpacity
                    onPress={() => {
                      setShowDetails(false);
                      router.push({
                        pathname: "/addObjectScreen",
                        params: { 
                          object: JSON.stringify(selectedObject), 
                          mode: "edit",
                          preselectedClient: JSON.stringify(selectedObject?.client)
                        }
                      });
                    }}
                    activeOpacity={0.8}
                    className="w-8 h-8 bg-blue-100 rounded-full items-center justify-center"
                  >
                    <Text className="text-blue-600 font-bold">✏️</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    onPress={() => {
                      if(selectedObject){
                        try{
                          deleteObject(selectedObject?.object.id);
                          setShowDetails(false);

                        }
                        catch (error){
                          console.error("Delete failed:", error);
                        }
                        Alert.alert("Objekt bol uspesne odstraneny");
                        setSelectedObject(null);
                      }
                    }}
                    activeOpacity={0.8}
                    className="w-8 h-8 bg-blue-100 rounded-full items-center justify-center"
                  >
                    <Text className="text-blue-600 font-bold">🗑</Text>
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