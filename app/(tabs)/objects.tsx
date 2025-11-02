import ObjectCard from '@/components/objectCard';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Objects() {
  const [objects, setObjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const router = useRouter();

  useEffect(() => {
    fetchObjects();
  }, []);

  async function fetchObjects() {
    try {
        const {data, error } = await supabase
          .from("objects")
          .select("*");

        if (error) throw error;

        setObjects(data);
    } catch (error: any){
      console.error("Error fetching objects: ", error.message)
    } finally{
      setLoading(false);
    }
  }

  return (
    <SafeAreaView className="flex-1">
      <View className="flex-row items-start mt-4 ml-6">
        <Text className="font-bold text-4xl">Objekty</Text>
      </View>
      <ScrollView className="p-5">
        {loading ?
          ( <Text>Loading...</Text>)
          : (
            objects.map(object => (
                <ObjectCard 
                  key={object.id} 
                  object={object}
                />
              ))
            )
        }
      </ScrollView>
      <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => {router.push("/addObjectScreen")}}
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
      <Text 
        className='text-white text-3xl'>
        +
      </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}