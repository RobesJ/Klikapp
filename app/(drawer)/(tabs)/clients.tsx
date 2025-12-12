import ClientDetails from "@/components/cardDetails/clientDetails";
import ClientCard from "@/components/cards/clientCard";
import { useClientStore } from "@/store/clientStore";
import { Client } from "@/types/generics";
import { EvilIcons } from "@expo/vector-icons";
import { DrawerActions } from "@react-navigation/native";
import { useNavigation, useRouter } from "expo-router";
import { useState } from 'react';
import { FlatList, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";

export default function Clients() {
  const [showDetails, setShowDetails] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [searchText, setSearchText] = useState('');

  const {
    filteredClients,
    clients,
    loading,
    loadMore,
    fetchClients,
    setFilters
  } = useClientStore();

  const router = useRouter();
  const navigation = useNavigation();
  
  //  useFocusEffect(
  //    useCallback(() => {
  //      fetchClients(100);
  //    }, [])
  //  );
  
  const handleModalVisibility = (client: Client, value: boolean) => {
    setShowDetails(value);
    setSelectedClient(client);
  };

  const handleRefresh = () => {
    fetchClients(50);
  };

  const handleSearch = (text: string) => {
    setSearchText(text);
    setFilters({ searchQuery: text});
  };

  return (
    <SafeAreaView className="flex-1 bg-dark-bg">
      {/* header */}
      <View className="flex-2 mt-4 px-6 mb-8 ">
        <View className="flex-row justify-between items-center">
          <TouchableOpacity
            onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
            activeOpacity={0.8}
            className="justify-center"
          >
            <EvilIcons name="navicon" size={32} color="white" />
          </TouchableOpacity>
          <Text className="font-bold text-4xl text-dark-text_color ml-4">Klienti</Text>

          {/* online / offline indicator */}
          <Text className="text-xl text-green-500">ONLINE</Text>
        </View>

        {/* search option - search by client name or phone number */}
        <View className="flex-row items-center border-2 border-gray-500 rounded-xl px-4 py-1 mt-4">
          <EvilIcons name="search" size={20} color="gray" />
          <TextInput
            className="flex-1 ml-2 text-dark-text_color"
            placeholder='Vyhladajte klienta...'
            placeholderTextColor="#9CA3AF"
            value={searchText}
            onChangeText={handleSearch}
          />
        </View>
      </View>
      
      {/* list of clients */}
      <FlatList
        data={searchText.length > 0 ? filteredClients : clients }
        keyExtractor={(item) => item.id}
        renderItem={({item}) =>(
          <ClientCard
              client={item}
              onPress={() => handleModalVisibility(item, true)}
          />
        )}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
        refreshing={loading}
        onRefresh={handleRefresh}
        ListEmptyComponent={
          loading ? (
            <Text className="text-center text-gray-500 mt-10">Načítavam...</Text>
          ) : (
            <Text className="text-center text-gray-500 mt-10">Žiadny klienti</Text>
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
      

      {/* Client details modal*/}
            {selectedClient && (
              <ClientDetails 
              client={selectedClient}
              visible={showDetails}
              onClose={()=>setShowDetails(false)} />
            )}
    </SafeAreaView>
  );
}