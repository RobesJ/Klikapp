import ObjectDetails from '@/components/cardDetails/objectDetails';
import ObjectCard from '@/components/cards/objectCard';
import { useObjectStore } from '@/store/objectStore';
import { Client } from '@/types/generics';
import { ObjectWithRelations } from '@/types/objectSpecific';
import { EvilIcons, Feather } from '@expo/vector-icons';
import { DrawerActions } from "@react-navigation/native";
import { useNavigation, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Objects() {
  const [showDetails, setShowDetails] = useState(false);
  const [selectedObject, setSelectedObject] = useState<ObjectWithRelations | null>(null);
  const [searchText, setSearchText] = useState('');

  const {
    loading,
    loadMore,
    fetchObjects,
    setFilters,
    //filters,
    deleteObject,
    filteredObjects
  } = useObjectStore();

  const router = useRouter();
  const navigation = useNavigation();

  //useFocusEffect(
  //  useCallback(() => {
  //    fetchObjects(50);
  //  }, [])
  //);
 
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
    <SafeAreaView className="flex-1 bg-dark-bg">
      {/* Header */}
      <View className="flex-2 mt-4 px-6 mb-8">
        <View className="flex-row justify-between items-center">
          <TouchableOpacity
            onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
            activeOpacity={0.8}
            className="justify-center"
          >
            <EvilIcons name="navicon" size={32} color="white" />
          </TouchableOpacity>
          <Text className="font-bold text-4xl text-dark-text_color ml-4">Objekty</Text>
          <Text className="text-xl text-green-500">ONLINE</Text>
        </View>

        <View className="flex-row items-center border-2 border-gray-500 rounded-xl px-4 py-1 mt-4">
          <EvilIcons name="search" size={20} color="gray" />
          <TextInput
            className="flex-1 ml-2 text-dark-text_color"
            placeholder='Vyhladajte klienta alebo mesto...'
            placeholderTextColor="#9CA3AF"
            value={searchText}
            onChangeText={handleSearchText}
          />
        </View>
      </View>

      <FlatList
        data={objectsGroupedByClient}
        keyExtractor={(group) => group.client.id}
        renderItem={({ item: group }) => (
          <View className="mb-3 pb-4 bg-dark-card-bg border-2 rounded-2xl border-dark-card-border_color">
            {/* Section Header */}
            <View className="rounded-t-xl px-4 py-2">
              <Text className="font-bold text-lg text-dark-text_color">
                {group.client.name} ({group.objects.length})
              </Text>
            </View>

            {/* Objects List */}
            <View className="mt-2 px-2">
              {group.objects.map((item) => (
                <View key={item.object.id} >
                  <ObjectCard
                    object={item.object}
                    chimneys={item.chimneys}
                    client={item.client}
                    onPress={() => handleModalVisibility(item, true)}
                  />
                </View>
              ))}
            </View>
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 20 }}
        onEndReached={loadMore}
        //onRefresh={handleRefresh}
      />

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
        <Text className='text-white text-3xl'>+</Text>
      </TouchableOpacity>

      <Modal
        visible={showDetails}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDetails(false)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center">
        <View className="w-10/12 h-fit bg-dark-bg border-2 border-gray-300 rounded-2xl overflow-hidden">
            {/* Header */}
            <View className="px-4 py-6 border-b border-gray-400">
              <View className="flex-row items-center justify-between">
                {selectedObject?.object.city ? (
                  <View className='flex-1'>
                    <Text className="text-xl font-bold text-dark-text_color">
                      {selectedObject.object.streetNumber}
                    </Text>
                    <Text className="text-xl font-bold text-dark-text_color">
                      {selectedObject.object.city}
                    </Text>
                  </View>
                ): (
                  <Text className="text-xl font-bold text-dark-text_color">
                    {selectedObject?.object.address}
                  </Text>
                )}
                <TouchableOpacity
                  onPress={() => setShowDetails(false)}
                  className="w-8 h-8 bg-gray-600 rounded-full items-center justify-center"
                >
                  <EvilIcons name="close" size={24} color="white" />
                </TouchableOpacity>
              </View>
            </View>
                  
            <ScrollView className="max-h-screen-safe-offset-12 p-4">
              {selectedObject && (
                <ObjectDetails 
                  object={selectedObject.object}
                  client={selectedObject.client}
                  chimneys={selectedObject.chimneys} />
              )}
            </ScrollView>

            <View className="flex-row justify-between px-4 py-6 border-t border-gray-400">
                
                {/* Object detail card action buttons*/}
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
                        setSelectedObject(null);
                      }
                    }}
                    activeOpacity={0.8}
                    className="flex-row gap-1 bg-red-700 rounded-full items-center justify-center pl-3 py-2 pr-4"
                >
                  <EvilIcons name="trash" size={24} color="white" />
                  <Text className='text-white'>Odstrániť</Text>
                </TouchableOpacity>

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
                    className="flex-row gap-1 bg-green-700 rounded-full items-center justify-center px-4 py-2"
                >
                  <Feather name="edit-2" size={16} color="white" />
                  <Text className='text-white'>Upraviť</Text>
                </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}