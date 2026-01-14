import ObjectDetails from '@/components/cardDetails/objectDetails';
import ObjectCard from '@/components/cards/objectCard';
import { NotificationToast } from '@/components/notificationToast';
import { ObjectsListSkeleton } from '@/components/skeletons/skeleton';
import { Body, BodyLarge, Heading1, Heading2 } from '@/components/typography';
import { useAuth } from '@/context/authContext';
import { ObjectSection, useObjectStore } from '@/store/objectStore';
import { ObjectWithRelations } from '@/types/objectSpecific';
import { FONT_SIZES } from '@/utils/responsive';
import { EvilIcons } from '@expo/vector-icons';
import { DrawerActions } from "@react-navigation/native";
import { FlashList } from "@shopify/flash-list";
import { useFocusEffect, useNavigation, useRouter } from 'expo-router';
import debounce from 'lodash.debounce';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PixelRatio, TextInput, TextStyle, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function Objects() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const dpi = PixelRatio.get();
  const navigation = useNavigation();
  const [showDetails, setShowDetails] = useState(false);
  const [selectedObject, setSelectedObject] = useState<ObjectWithRelations | null>(null);
  const [searchText, setSearchText] = useState('');
  const hasInitialized = useRef(false);

  const {
    loading,
    groupedObjects,
    filteredGroupedObjects,
    loadMore,
    fetchObjects,
    clearFilters,
    setFilters,
    unlockObject
  } = useObjectStore();

  useEffect(()=> {
    if(!hasInitialized.current){
      hasInitialized.current = true;
      fetchObjects();
    }
  },[]);

  useFocusEffect(useCallback(() => {
    return () => {
      clearFilters();
      setSearchText('');
    };
  }, [clearFilters]));

  useFocusEffect(
    useCallback(() => {
      fetchObjects(30);
    }, [fetchObjects]),
  );

  const displayedGroups = useMemo(() => {
    return searchText.trim() ? filteredGroupedObjects : groupedObjects;
  }, [searchText, filteredGroupedObjects, groupedObjects]);


  const handleModalVisibility = useCallback((objectData: ObjectWithRelations, value: boolean) =>{
    setShowDetails(value);
    setSelectedObject(objectData);
  },[]);

  const handleRefresh = () => {
    fetchObjects(30);
  };

  const handleLoadMore = useCallback(() => {
    if (!loading) {
      loadMore();
    }
  }, [loading, loadMore]);

  const debounceSearch = useMemo(() => {
    const debouncedFn = debounce((text: string) => 
      setFilters({searchQuery: text}), 300);
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

  const handleClose = useCallback(() => {
    setShowDetails(false);
    setSelectedObject(null);
  },[]);

  const handleCloseWithUnlock = useCallback(() => {
    setShowDetails(false);
    if (selectedObject && user){
      unlockObject(selectedObject.object.id, user.id);
    }
    setSelectedObject(null);
  },[selectedObject, unlockObject]);
  
  const inputStyle = useMemo((): TextStyle => {
    const size = FONT_SIZES["lg"];
    return {
      fontSize: size,
      lineHeight: size * 1.4,
    };
  },[]);

  const renderItem = useCallback(({ item }: { 
    item: ObjectSection;
  }) => {
    return (
      <View className="bg-dark-card-bg rounded-2xl mb-4 overflow-hidden border border-dark-card-border_color">
          <View className="px-4 py-2 bg-dark-card-bg">
            <BodyLarge className="font-bold text-lg text-dark-text_color">
              {item.title}
            </BodyLarge>
          </View>
        {item.data.map(obj => (
         <View key={obj.object.id} className="bg-dark-card-bg px-4 pt-1 border-b border-dark-card-border_color last:border-b-0">
           <ObjectCard
              object={obj.object}
              chimneys={obj.chimneys}
              client={obj.client}
              onPress={() => handleModalVisibility(obj, true)}
            />
        </View>
        ))}
      </View>
    );
  }, []);
  
    return (
      <View
      style={{
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
        flex: 1,
        backgroundColor: "#0c1026",
      }}
    >
            {/* Header */}
            <View className="mt-4 px-6 mb-8">
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
                <NotificationToast screen='objects'/>
            </View>
            
            {displayedGroups.length === 0 ? (
                <ObjectsListSkeleton/>
            ) : (
                <FlashList
                  data={displayedGroups}
                  keyExtractor={(item) => item.id}
                  renderItem={renderItem}
                  onEndReached={handleLoadMore}
                  onEndReachedThreshold={0.5}
                  refreshing={loading}
                  onRefresh={handleRefresh}
                  contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 20 }}
                  ListEmptyComponent={
                      <Body className="text-center text-gray-500 mt-10">Žiadne objekty</Body>
                  }
                />
            )}

            {/* Create new Object button */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push({
                pathname: "/addObjectScreen",
                params: { mode: "create" }
              })}
              className={`absolute bottom-24 right-6 ${dpi > 2.5 ? "w-16 h-16" : "w-20 h-20" } justify-center items-center border border-white z-10 rounded-full bg-blue-600`}
            >
                <Heading2 className='text-white text-3xl'>+</Heading2>
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
        </View>
    );
}