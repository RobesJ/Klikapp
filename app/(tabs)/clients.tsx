import ClientDetails from "@/components/cardDetails/clientDetails";
import ClientCard from "@/components/cards/clientCard";
import { useClientStore } from "@/store/clientStore";
import { Client } from "@/types/generics";
import { EvilIcons, Feather } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useState } from 'react';
import { Alert, FlatList, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";

export default function Clients() {
  const [showDetails, setShowDetails] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [searchText, setSearchText] = useState('');

  const {
    filteredClients,
    loading,
    fetchClients,
    setFilters,
    deleteClient
  } = useClientStore();

  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      fetchClients(100);
    }, [])
  );
  
  const handleModalVisibility = (client: Client, value: boolean) => {
    setShowDetails(value);
    setSelectedClient(client);
  };

  const handleRefresh = () => {
    fetchClients(50);
  };

  const handleSearch = (text: string ) => {
    setSearchText(text);
    setFilters({ searchQuery: text});
  };

  return (
    <SafeAreaView className="flex-1 bg-dark-bg">
      {/* header */}
      <View className="flex-2 mt-4 px-6 mb-8 ">
        <View className="flex-row justify-between items-center">
          <TouchableOpacity
            onPress={() => {}}
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
        data={filteredClients}
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
          bottom: 100,
          right: 20,
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: '#3182ce',
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#FFF',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
        }}
      >
        <Text className="text-dark-text_color text-4xl">+</Text>
      </TouchableOpacity>
      

      {/* Client details modal*/}
      <Modal
        visible={showDetails}
        transparent={true}
        animationType="slide"
        onRequestClose={()=> setShowDetails(false)}
        >
          <View className="flex-1 bg-black/50 justify-center items-center">
            <View className="w-3/4 bg-dark-bg rounded-2xl overflow-hidden">
              {/* header */}
              <View className="px-4 py-6 border-b border-gray-200">
              <View className="flex-row items-center justify-between">
                <Text className="text-xl font-bold text-dark-text_color">{selectedClient?.name}</Text>

                  {/* Edit selected client */}
                  <View className="flex-row gap-2">
                    <TouchableOpacity
                        onPress={() => {
                          setShowDetails(false);
                          router.push({
                          pathname: "/addClientScreen",
                          params: { 
                            client: JSON.stringify(selectedClient),
                            mode: "edit" 
                          }
                        });
                      }}
                        activeOpacity={0.8}
                        className="w-8 h-8 bg-gray-600 rounded-full items-center justify-center"
                    >
                        <Feather name="edit-2" size={16} color="white" />
                    </TouchableOpacity>

                    {/* Delete selected client */}
                    <TouchableOpacity
                      onPress={() => {
                        if(selectedClient){
                          try{
                            deleteClient(selectedClient?.id);
                            setShowDetails(false);

                          }
                          catch (error){
                            console.error("Delete failed:", error);
                          }
                          Alert.alert("Klient bol uspesne odstraneny");
                          setSelectedClient(null);
                        }
                      }}
                      activeOpacity={0.8}
                      className="w-8 h-8 bg-gray-600 rounded-full items-center justify-center"
                    >
                      <EvilIcons name="trash" size={24} color="white" />

                    </TouchableOpacity>
                    
                    {/* Close details modal */}
                    <TouchableOpacity
                        onPress={() => setShowDetails(false)}
                        className="w-8 h-8 bg-gray-600 rounded-full items-center justify-center"
                    >
                        <EvilIcons name="close" size={24} color="white" />
                    </TouchableOpacity>
                  </View>
              </View>
          </View> 

          {/* Details Card */}
          <ScrollView className="max-h-screen-safe-offset-12 p-4">
            {selectedClient && (
              <ClientDetails client={selectedClient} />
            )}
          </ScrollView>
        </View>
        </View>
      </Modal>
      
    </SafeAreaView>
  );
}