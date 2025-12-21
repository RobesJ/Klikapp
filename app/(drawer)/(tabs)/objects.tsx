import { AnimatedScreen } from '@/components/animatedScreen';
import ObjectDetails from '@/components/cardDetails/objectDetails';
import ObjectCard from '@/components/cards/objectCard';
import { NotificationToast } from '@/components/notificationToast';
import { useObjectStore } from '@/store/objectStore';
import { Client } from '@/types/generics';
import { ObjectWithRelations } from '@/types/objectSpecific';
import { EvilIcons } from '@expo/vector-icons';
import { DrawerActions } from "@react-navigation/native";
import { useFocusEffect, useNavigation, useRouter } from 'expo-router';
import debounce from 'lodash.debounce';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Text, TextInput, TouchableOpacity, View } from 'react-native';
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
    filteredObjects
  } = useObjectStore();

  const router = useRouter();
  const navigation = useNavigation();

  useFocusEffect(
    useCallback(() => {
      fetchObjects(50);
    }, [fetchObjects])
  );
 
  const handleModalVisibility = (objectData: ObjectWithRelations, value: boolean) =>{
    setShowDetails(value);
    setSelectedObject(objectData);
  };

  const handleRefresh = () => {
    fetchObjects(50);
  };

  const debounceSearch = useMemo(() =>
    debounce((text: string) => setFilters({searchQuery: text}),300),
    []
  );

  const handleSearchText = (text: string) => {
    setSearchText(text);
    debounceSearch(text);
  };

  const handleClose = () => {
    setShowDetails(false);
    setSelectedObject(null);
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
      <AnimatedScreen tabIndex={2}>
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
          <Text allowFontScaling={false} className="font-bold text-4xl text-dark-text_color ml-4">Objekty</Text>
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
        <NotificationToast/>
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
                    key={item.object.id}
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
        onRefresh={handleRefresh}
        refreshing={loading}
        ListEmptyComponent={
          loading 
          ? ( <Text className="text-center text-gray-500 mt-10">Načítavam...</Text>)
          : ( <Text className="text-center text-gray-500 mt-10">Žiadne objekty</Text>)
        }
      />

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => router.push({
          pathname: "/addObjectScreen",
          params: { mode: "create" }
        })}
        className="absolute bottom-20 right-8 w-20 h-20 justify-center items-center border border-white z-10 rounded-full bg-blue-600"
      >
        <Text className='text-white text-3xl'>+</Text>
      </TouchableOpacity>
      
      {/* Object details modal */}
      {selectedObject && (
        <ObjectDetails 
          key={selectedObject.object.id}
          object={selectedObject.object}
          client={selectedObject.client}
          chimneys={selectedObject.chimneys} 
          visible={showDetails}
          onClose={handleClose}
        />
      )}
      </AnimatedScreen>
    </SafeAreaView>
  );
}