import ClientDetails from "@/components/cardDetails/clientDetails";
import ClientCard from "@/components/cards/clientCard";
import { NotificationToast } from "@/components/notificationToast";
import { ClientsListSkeleton } from "@/components/skeletons/skeleton";
import { Body, Heading1, Heading2 } from "@/components/typography";
import { useAuth } from "@/context/authContext";
import { useClientStore } from "@/store/clientStore";
import { Client } from "@/types/generics";
import { FONT_SIZES } from "@/utils/responsive";
import { EvilIcons } from "@expo/vector-icons";
import { DrawerActions } from "@react-navigation/native";
import { useFocusEffect, useNavigation, useRouter } from "expo-router";
import debounce from "lodash.debounce";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Keyboard, PixelRatio, TextInput, TextStyle, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function Clients() {
  const router = useRouter();
  const dpi = PixelRatio.get();
  const { user } = useAuth();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [showDetails, setShowDetails] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [searchText, setSearchText] = useState('');

  const hasInitialized = useRef(false);

  const {
    filteredClients,
    hasMore,
    clients,
    loading,
    loadMore,
    fetchClients,
    setFilters, 
    clearFilters,
    unlockClient
  } = useClientStore();

  useEffect(() => {
    if (!hasInitialized.current){
      hasInitialized.current = true;
      fetchClients(50);
    }
  }, [fetchClients]);

  useFocusEffect(useCallback(() => {
    return () => {
      clearFilters();
      setSearchText('');
    };
  }, [clearFilters]));
  
  const handleModalVisibility = useCallback((client: Client, value: boolean) => {
    setShowDetails(value);
    setSelectedClient(client);
  },[]);

  const handleRefresh = useCallback(() => {
    fetchClients(50);
    setSearchText('');
    clearFilters();
  }, [fetchClients, clearFilters]);

  const debounceSearch = useMemo(
    () => debounce((text: string) => {setFilters({ searchQuery: text})}, 300), 
    [setFilters]
  );

  useEffect(() => {
    return () => {
      debounceSearch.cancel();
    }
  }, [debounceSearch]);

  const handleSearch = useCallback((text: string) => {
    setSearchText(text);
    debounceSearch(text);
  }, [debounceSearch]);
  
  const handleClearSearch = useCallback(() => {
    setSearchText('');
    clearFilters();
    Keyboard.dismiss();
  }, [clearFilters]);
  
  const handleOnClose = useCallback(() => {
    setShowDetails(false);
    setSelectedClient(null);
  }, []);

  const handleOnCloseWithUnlocking = useCallback(() => {
    setShowDetails(false);
    if (selectedClient && user){
      unlockClient(selectedClient.id, user.id);
    }
    setSelectedClient(null);
  }, [selectedClient, user, unlockClient]);

  const inputStyle = useMemo((): TextStyle => {
    const size = FONT_SIZES["lg"];
    return {
      fontSize: size,
      lineHeight: size * 1.4,
    };
  },[]);

  const handleAddClient = useCallback(() => {
    router.push({
      pathname: "/addClientScreen",
      params: {mode: "create"}
    });
  }, [router]);

  const renderItem = useCallback(({item}: {item: Client}) => {
    return (
        <ClientCard
          client={item}
          onPress={() => handleModalVisibility(item, true)}
        />
    );
  }, [handleModalVisibility]);

  const keyExtractor = useCallback((item: Client) => item.id, []);

  const handleLoadMore = useCallback(() =>{
    if(!searchText && hasMore && !loading){
      loadMore();
    }
  }, [loadMore, hasMore, loading, loadMore]);
   

  return (
    <View
      style={{
        paddingTop: insets.top,
        paddingHorizontal: 16,
        paddingBottom: insets.bottom,
        flex: 1,
        backgroundColor: "#0c1026",
      }}
    >
        {/* header */}
        <View className="mb-8">
          <View className="flex-row justify-between items-center">
            {/* Drawer toggle */}
            <TouchableOpacity
                onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
                activeOpacity={0.8}
                className="items-center justify-center"
              >
                <EvilIcons name="navicon" size={36} color="white" />
            </TouchableOpacity>
            <Heading1 className="text-dark-text_color">Klienti</Heading1>

            {/* online / offline indicator */}
            <Body className="text-xl text-green-500">ONLINE</Body>
          </View>

          {/* search option - search by client name or phone number */}
          <View className="flex-row items-center border-2 border-gray-500 rounded-xl px-4 py-1 mt-4">
            <EvilIcons name="search" size={20} color="gray" />
            <TextInput
              className="ml-2 text-dark-text_color py-3"
              style={inputStyle}
              placeholder='Vyhladajte klienta...'
              placeholderTextColor="#9CA3AF"
              value={searchText}
              onChangeText={handleSearch}
            />
          </View>
          <NotificationToast
            screen="clients"
          />
        </View>
        
        <View className="flex-1 pb-16">
        { loading && clients.length === 0 ? (
          <ClientsListSkeleton/>
        ) : (
        <FlatList
          data={searchText.length > 0 ? filteredClients : clients }
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          refreshing={loading}
          onRefresh={handleRefresh}
          ListEmptyComponent={
            loading ? (
              <Body className="text-center text-gray-500 mt-10">Načítavam...</Body>
            ) : (
              <Body className="text-center text-gray-500 mt-10">Žiadny klienti</Body>
            )
          }
          onEndReached={handleLoadMore}
        />
        )}
        </View>
        
        { /* Action Button - add new client */}
        <TouchableOpacity
          onPress={handleAddClient}
          activeOpacity={0.8}
          className={`absolute bottom-24 right-6 ${dpi > 2.5 ? "w-16 h-16" : "w-20 h-20" } justify-center items-center border border-white z-10 rounded-full bg-blue-600`}
        >
            <Heading2 className='text-white'>+</Heading2>
        </TouchableOpacity>
      
        {/* Client details modal */}
        {selectedClient && (
          <ClientDetails 
            key={selectedClient.id}
            client={selectedClient}
            visible={showDetails}
            onClose={handleOnClose} 
            onCloseWithUnlocking={handleOnCloseWithUnlocking}
          />
        )}
    </View>
  );
}

