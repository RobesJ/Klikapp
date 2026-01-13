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
import { FlatList, PixelRatio, TextInput, TextStyle, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";

export default function Clients() {
  const [showDetails, setShowDetails] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [searchText, setSearchText] = useState('');
  const { user } = useAuth();
  const dpi = PixelRatio.get();
  const hasInitialized = useRef(false);

  const {
    filteredClients,
    clients,
    loading,
    loadMore,
    fetchClients,
    setFilters, 
    clearFilters,
    unlockClient
  } = useClientStore();

  const router = useRouter();
  const navigation = useNavigation();

  useEffect(() => {
    if (!hasInitialized.current){
      hasInitialized.current = true;
      fetchClients(50);
    }
  }, []);

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
  }, [fetchClients]);

  const debounceSearch = useMemo(() => {
    const debouncedFn = debounce((text: string) => setFilters({ searchQuery: text}), 300);
    return debouncedFn;
  }, [setFilters]);

  const handleSearch = useCallback((text: string) => {
    setSearchText(text);
    debounceSearch(text);
  }, [debounceSearch]);
  
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
  },[selectedClient, user, unlockClient]);

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
   

  return (
    <SafeAreaView className="flex-1 bg-dark-bg">
        {/* header */}
        <View className="flex-2 mt-4 px-6 mb-8">
          <View className="flex-row justify-between items-center">
            <TouchableOpacity
              onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
              activeOpacity={0.8}
              className="justify-center"
            >
              <EvilIcons name="navicon" size={32} color="white" />
            </TouchableOpacity>
            <Heading1 className="font-bold text-4xl text-dark-text_color ml-4">Klienti</Heading1>

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

        { loading && clients.length === 0 ? (
          <ClientsListSkeleton/>
        ) : (
        <FlatList
          data={searchText.length > 0 ? filteredClients : clients }
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
          refreshing={loading}
          onRefresh={handleRefresh}
          ListEmptyComponent={
            loading ? (
              <Body className="text-center text-gray-500 mt-10">Načítavam...</Body>
            ) : (
              <Body className="text-center text-gray-500 mt-10">Žiadny klienti</Body>
            )
          }
          onEndReached={loadMore}
        />
        )}
        { /* Action Button - add new client */}
        <TouchableOpacity
          onPress={handleAddClient}
          activeOpacity={0.8}
          className={`absolute bottom-24 right-6 ${dpi > 2.5 ? "w-16 h-16" : "w-20 h-20" } justify-center items-center border border-white z-10 rounded-full bg-blue-600`}
        >
          <Heading2 className='text-white'>+</Heading2>
        </TouchableOpacity>
      
        {/* Client details modal*/}
        {selectedClient && (
          <ClientDetails 
            key={selectedClient.id}
            client={selectedClient}
            visible={showDetails}
            onClose={handleOnClose} 
            onCloseWithUnlocking={handleOnCloseWithUnlocking}
          />
        )}
    </SafeAreaView>
  );
}