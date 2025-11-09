import ClientDetails from "@/components/cardDetails/clientDetails";
import ClientCard from "@/components/clientCard";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useState } from 'react';
import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from '../../lib/supabase.js';

interface Client {
  id?: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  type: string | null;
  notes: string | null;
}

export default function Clients() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      fetchClients();
    }, [])
  );

  async function fetchClients() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*');
      
      if (error) throw error;
      
      setClients(data);
    } catch (error : any) {
      console.error('Error fetching clients:', error.message);
    } finally {
      setLoading(false);
    }
  }

  const handleModalVisibility = (client: Client, value: boolean) => {
    setShowDetails(value);
    setSelectedClient(client);
  }

  return (
    <SafeAreaView className="flex-1">
       <View className="flex-row items-start mt-4 ml-6 mb-6">
        <Text className="font-bold text-4xl">Klienti</Text>
      </View>
      <ScrollView className="px-5 mb-24">

        {loading ? (
          <Text className="mt-5">Nacitavanie...</Text>
        ) : (
          clients.map(client => (
            <ClientCard 
              key={client.id} 
              client={client}
              onPress={() => handleModalVisibility(client, true)}
            />
          ))
        )}
      </ScrollView>
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
        >
          <View
            className="flex-1 w-3/4 bg-slate-400 rounded-2xl m-16"
          >
            {/* header */}
            <View className="px-4 py-6 border-b border-gray-200">
              <View className="flex-row items-center justify-between">
                <Text className="text-3xl font-bold">{selectedClient && selectedClient.name}</Text>
                  <View className="flex-row">
                    <TouchableOpacity
                        onPress={() => router.push({
                          pathname: "/addClientScreen",
                          params: { client: JSON.stringify(selectedClient), mode: "edit" }
                        })}
                        activeOpacity={0.8}
                        className="w-8 h-8 bg-gray-100 rounded-full items-center justify-center mr-2"
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
          {selectedClient && (
            <ClientDetails client={selectedClient} />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}