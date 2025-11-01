import ClientCard from "@/components/ClientCard";
import { useRouter } from "expo-router";
import { useEffect, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from '../../lib/supabase.js';

export default function Clients() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const router = useRouter();

  useEffect(() => {
    fetchClients();
  }, []);

  async function fetchClients() {
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

  return (
    <SafeAreaView className="flex-1">
       <View className="flex-row items-start mt-4 ml-6">
        <Text className="font-bold text-4xl">Klienti</Text>
      </View>
      <ScrollView className="p-5">

        {loading ? (
          <Text className="text-cyan-500 mt-5">Loading...</Text>
        ) : (
          clients.map(client => (
            <ClientCard 
              key={client.id} 
              client={client}
            />
          ))
        )}
      </ScrollView>
      <TouchableOpacity
        onPress={() => router.push('/addClientScreen')}
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
    </SafeAreaView>
  );
}