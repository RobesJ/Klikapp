import { AnimatedScreen } from '@/components/animatedScreen';
import ObjectDetails from '@/components/cardDetails/objectDetails';
import ObjectCard from '@/components/cards/objectCard';
import { NotificationToast } from '@/components/notificationToast';
import { Body, BodyLarge, Heading1 } from '@/components/typography';
import { useAuth } from '@/context/authContext';
import { useObjectStore } from '@/store/objectStore';
import { Client } from '@/types/generics';
import { ObjectWithRelations } from '@/types/objectSpecific';
import { FONT_SIZES } from '@/utils/responsive';
import { EvilIcons } from '@expo/vector-icons';
import { DrawerActions } from "@react-navigation/native";
import { useFocusEffect, useNavigation, useRouter } from 'expo-router';
import debounce from 'lodash.debounce';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { SectionList, TextInput, TextStyle, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Objects() {
  const router = useRouter();
  const { user } = useAuth();
  const navigation = useNavigation();
  const [showDetails, setShowDetails] = useState(false);
  const [selectedObject, setSelectedObject] = useState<ObjectWithRelations | null>(null);
  const [searchText, setSearchText] = useState('');

  const {
    loading,
    objects,
    loadMore,
    fetchObjects,
    clearFilters,
    setFilters,
    filteredObjects,
    unlockObject
  } = useObjectStore();

  useFocusEffect(
    useCallback(() => {
      fetchObjects(50);
    }, [fetchObjects])
  );

  useFocusEffect(
    useCallback(() => {
      return () => {
        clearFilters();
        setFilters({searchQuery: ''});
      }
    }, [clearFilters, setFilters])
  );
  
  const sections = useMemo(() => {
    const source = filteredObjects.length > 0 ? filteredObjects : objects;
    const map = new Map<
      string,
      {
        client: Client;
        data: ObjectWithRelations[];
      }
    >();

    source.forEach(o => {
      if (!o.client.id) return;

      if(!map.has(o.client.id)) {
        map.set(o.client.id, {
          client: o.client,
          data: [],
        });
      }
      map.get(o.client.id)!.data.push(o);
    });

    return Array.from(map.values());
  },[objects, filteredObjects]);


  const handleModalVisibility = (objectData: ObjectWithRelations, value: boolean) =>{
    setShowDetails(value);
    setSelectedObject(objectData);
  };

  const handleRefresh = () => {
    fetchObjects(50);
  };

  const debounceSearch = useMemo(() => {
    const debouncedFn = debounce((text: string) => setFilters({searchQuery: text}), 300);
    return debouncedFn;
  }, [setFilters]);

  useEffect(() => {
    return () => {
      debounceSearch.cancel();
    };
  }, [debounceSearch]);

  const handleSearchText = (text: string) => {
    setSearchText(text);
    debounceSearch(text);
  };

  const handleClose = () => {
    setShowDetails(false);
    setSelectedObject(null);
  };

  const handleCloseWithUnlock = () => {
    setShowDetails(false);
    if (selectedObject && user){
      unlockObject(selectedObject.object.id, user.id);
    }
    setSelectedObject(null);
  };

  const objectsGroupedByClient = useMemo(() => {
    const groups: Record< string, {client: Client; objects: ObjectWithRelations[]}> ={};

    const objectsToGroup = filteredObjects.length > 0 ? filteredObjects : objects;
    objectsToGroup.forEach(o => {

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
  }, [filteredObjects, objects]);
  
  const inputStyle = useMemo((): TextStyle => {
    const size = FONT_SIZES["lg"];
    return {
      fontSize: size,
      lineHeight: size * 1.4,
    };
  },[]);
  
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
          <Heading1 allowFontScaling={false} className="font-bold text-4xl text-dark-text_color ml-4">Objekty</Heading1>
          <Body className="text-xl text-green-500">ONLINE</Body>
        </View>

        <View className="flex-row items-center border-2 border-gray-500 rounded-xl px-4 py-1 mt-4">
          <EvilIcons name="search" size={20} color="gray" />
          <TextInput
            className="ml-2 text-dark-text_color py-3"
            style={inputStyle}
            placeholder='Vyhladajte klienta alebo mesto...'
            placeholderTextColor="#9CA3AF"
            value={searchText}
            onChangeText={handleSearchText}
          />
        </View>
        <NotificationToast/>
      </View>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.object.id}
        contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 20 }}
        
        onEndReached={loadMore}
        onRefresh={handleRefresh}
        refreshing={loading}
        
        renderSectionHeader={({ section }) => (
          <View className="mb-3 pb-4 bg-dark-card-bg border-2 rounded-2xl border-dark-card-border_color">
            {/* Client Header */}
            <View className="rounded-t-xl px-4 py-2">
              <BodyLarge className="font-bold text-lg text-dark-text_color">
                {section.client.name} ({section.data.length})
              </BodyLarge>
            </View>
          </View>
        )}
      
        renderItem={({ item, section, index }) => {
          const isFirst = index === 0;
          const isLast = index === section.data.length - 1;
        
          return (
            <View
              className={`px-2 ${
                isLast ? 'mb-3' : ''
              }`}
            >
              <ObjectCard
                object={item.object}
                chimneys={item.chimneys}
                client={item.client}
                onPress={() => handleModalVisibility(item, true)}
              />
            </View>
          );
        }}
      
        ListEmptyComponent={
          loading ? (
            <Body className="text-center text-gray-500 mt-10">
              Načítavam...
            </Body>
          ) : (
            <Body className="text-center text-gray-500 mt-10">
              Žiadne objekty
            </Body>
          )
        }
      />
      {/*
      <FlatList
        data={objectsGroupedByClient}
        keyExtractor={(group) => group.client.id}
        //extraData={objects.length}
        renderItem={({ item: group }) => (
          <View className="mb-3 pb-4 bg-dark-card-bg border-2 rounded-2xl border-dark-card-border_color">
            {/* Section Header *
            <View className="rounded-t-xl px-4 py-2">
              <BodyLarge className="font-bold text-lg text-dark-text_color">
                {group.client.name} ({group.objects.length})
              </BodyLarge>
            </View>

            {/* Objects List *
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
          ? ( <Body className="text-center text-gray-500 mt-10">Načítavam...</Body>)
          : ( <Body className="text-center text-gray-500 mt-10">Žiadne objekty</Body>)
        }
      />
      */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => router.push({
          pathname: "/addObjectScreen",
          params: { mode: "create" }
        })}
        className="absolute bottom-20 right-8 w-20 h-20 justify-center items-center border border-white z-10 rounded-full bg-blue-600"
      >
        <Heading1 className='text-white text-3xl'>+</Heading1>
      </TouchableOpacity>
      
      {/* Object details modal */}
      {selectedObject && (
        <ObjectDetails 
          key={selectedObject.object.id}
          objectWithRelations={selectedObject}          
          visible={showDetails}
          onClose={handleClose}
          onCloseWithUnlock={handleCloseWithUnlock}
        />
      )}
      </AnimatedScreen>
    </SafeAreaView>
  );
}