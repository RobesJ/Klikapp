import ClientDetails from "@/components/cardDetails/clientDetails";
import ClientCard from "@/components/cards/clientCard";
import { NotificationToast } from "@/components/notificationToast";
import { Body, Heading1, Heading2 } from "@/components/typography";
import { useAuth } from "@/context/authContext";
import { useClientStore } from "@/store/clientStore";
import { Client } from "@/types/generics";
import { FONT_SIZES } from "@/utils/responsive";
import { EvilIcons } from "@expo/vector-icons";
import { DrawerActions } from "@react-navigation/native";
import { useFocusEffect, useNavigation, useRouter } from "expo-router";
import debounce from "lodash.debounce";
import { useCallback, useMemo, useState } from 'react';
import { FlatList, PixelRatio, TextInput, TextStyle, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";

export default function Clients() {
  const [showDetails, setShowDetails] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [searchText, setSearchText] = useState('');
  const { user } = useAuth();
  const dpi = PixelRatio.get();

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

  useFocusEffect(useCallback(() => {
    return () => {
      clearFilters();
      setSearchText('');
    };
  }, [clearFilters]));

  useFocusEffect(
    useCallback(() => {
      fetchClients(50);
    }, [fetchClients]),
  );
  
  const handleModalVisibility = (client: Client, value: boolean) => {
    setShowDetails(value);
    setSelectedClient(client);
  };

  const handleRefresh = () => {
    fetchClients(50);
  };

  const debounceSearch = useMemo(() =>
    debounce((text: string) => setFilters({ searchQuery: text}), 300),
    []
  );

  const handleSearch = (text: string) => {
    setSearchText(text);
    debounceSearch(text);
  };
  
  const handleOnClose = () => {
    setShowDetails(false);
    setSelectedClient(null);
  };

  const handleOnCloseWithUnlocking = () => {
    setShowDetails(false);
    if (selectedClient && user){
      unlockClient(selectedClient.id, user.id);
    }
    setSelectedClient(null);
  };

  const inputStyle = useMemo((): TextStyle => {
    const size = FONT_SIZES["lg"];
    return {
      fontSize: size,
      lineHeight: size * 1.4,
    };
  },[]);

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
            <Heading1 allowFontScaling={false} className="font-bold text-4xl text-dark-text_color ml-4">Klienti</Heading1>

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

        {/* list of clients */}
        <FlatList
          data={searchText.length > 0 ? filteredClients : clients }
          keyExtractor={(item) => item.id}
          renderItem={({item}) =>(
            <ClientCard
                key={item.id}
                client={item}
                onPress={() => handleModalVisibility(item, true)}
            />
          )}
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

        { /* Action Button - add new client */}
        <TouchableOpacity
          onPress={() => router.push({
            pathname: "/addClientScreen",
            params: { mode: "create" }
          })}
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