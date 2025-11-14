import ClientDetails from "@/components/cardDetails/clientDetails";
import ClientCard from "@/components/clientCard";
import { useClientStore } from "@/store/clientStore";
import { Client } from "@/types/generics";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useState } from 'react';
import { FlatList, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";

export default function Clients() {
 
  const [showDetails, setShowDetails] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const {
    filteredClients,
    loading,
    fetchClients,
    filters,
    setFilters,
    clearFilters

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

  return (
    <SafeAreaView className="flex-1">
      {/* header */}
      <View className="flex-2 mt-4 px-6 mb-8">
        <View className="flex-row justify-between">
          <Text className="font-bold text-4xl">Klienti</Text>
          <Text className="text-xl text-green-500">ONLINE</Text>
        </View>
        <View className='flex-2 w-full mt-4'> 
          <TextInput 
            className='border-2 rounded-xl border-gray-500 py-4 px-4'
            placeholder='Vyhladajte klienta...'
          />
        </View>
      </View>
      
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
            <Text className="text-center text-gray-500 mt-10">Žiadne projekty</Text>
          )
        }
      />
      <TouchableOpacity
        onPress={() => router.push({
          pathname: "/addClientScreen",
          params: { mode: "create" }
        })}
        activeOpacity={0.8}
        style={{
          position: 'absolute',
          bottom: 130,
          right: 24,
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: '#000000',
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
        }}
      >
        <Text className="text-white text-3xl">+</Text>
      </TouchableOpacity>
      <Modal
        visible={showDetails}
        transparent={true}
        animationType="fade"
        onRequestClose={()=> setShowDetails(false)}
        >
          <View className="flex-1 bg-black/50 justify-center items-center">
            <View className="w-3/4 bg-white rounded-2xl overflow-hidden">
              {/* header */}
              <View className="px-4 py-6 border-b border-gray-200">
              <View className="flex-row items-center justify-between">
                <Text className="text-xl font-bold">Detaily klienta</Text>

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
                        className="w-8 h-8 bg-gray-100 rounded-full items-center justify-center"
                    >
                        <Text className="text-gray-600">✏️</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => setShowDetails(false)}
                        className="w-8 h-8 bg-gray-100 rounded-full items-center justify-center"
                    >
                        <Text className="text-gray-600">x</Text>
                    </TouchableOpacity>
                  </View>
              </View>
          </View> 
          <ScrollView className="max-h-96 p-4">
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