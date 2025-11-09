import ObjectDetails from '@/components/cardDetails/objectDetails';
import ObjectCard from '@/components/objectCard';
import { supabase } from '@/lib/supabase';
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Object {
  id?: string;
  client_id?: string;
  address: string | null;
  placement: string | null;
  appliance: string | null;
  note: string | null;
}

interface Client {
  id?: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  type: string | null;
  notes: string | null;
}

interface Chimney {
  id: string;
  type: string;
  labelling: string | null;
}

interface ObjectWithRelations {
  object: Object;
  client: Client;
  chimneys: Chimney[];
}

export default function Objects() {
  const [objects, setObjects] = useState<ObjectWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedObject, setSelectedObject] = useState<ObjectWithRelations | null>(null);

  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      fetchObjects();
    }, [])
  );

  async function fetchObjects() {
    try {
        const {data: objectsData, error: objectsError } = await supabase
          .from("objects")
          .select(`
            *,
            clients(*)
            `);

        if (objectsError) throw objectsError;
        
        const objectWithRelations: ObjectWithRelations[] = await Promise.all(
          objectsData.map(async (objectItem: any) => {
            const { data: chimneysData, error: chimneysError } = await supabase
              .from("chimneys")
              .select(`
                chimney_types(
                  id,
                  type,
                  labelling
                )`
              )
              .eq("object_id", objectItem.id);
              
            if (chimneysError) throw chimneysError;
            
            const chimneys: Chimney[] = chimneysData.map((item: any) => item.chimney_types) ?? [];
            
            return {
              object : {...objectItem},
              client: objectItem.clients,
              chimneys: chimneys,
            };
      })
    );

        setObjects(objectWithRelations);
    } catch (error: any){
      console.error("Error fetching objects: ", error.message)
    } finally{
      setLoading(false);
    }
  }

  const handleModalVisibility = (objectData: ObjectWithRelations, value: boolean) =>{
    setShowDetails(value);
    setSelectedObject(objectData);
  };

  return (
    <SafeAreaView className="flex-1">
      <View className="flex-row items-start mt-4 ml-6 mb-3">
        <Text className="font-bold text-4xl">Objekty</Text>
      </View>
      <ScrollView className="px-5 mb-24">
        {loading ?
          ( <Text>Loading...</Text>)
          : (
            objects.map(objectData => (
                <ObjectCard 
                  key={objectData.object.id} 
                  object={objectData.object}
                  client={objectData.client}
                  chimneys={objectData.chimneys}
                  onPress={() => handleModalVisibility(objectData, true)}
                />
              ))
            )
        }
      </ScrollView>
      <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => router.push({
        pathname: "/addObjectScreen",
        params: { mode: "create" }
      })}
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
      <Modal
        visible={showDetails}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDetails(false)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center">
          <View className="w-3/4 bg-white rounded-2xl overflow-hidden">
            {/* Header */}
            <View className="px-4 py-6 border-b border-gray-200">
              <View className="flex-row items-center justify-between">
                <Text className="text-xl font-bold">Detaily objektu</Text>

                <View className="flex-row gap-2">
                  <TouchableOpacity
                    onPress={() => {
                      setShowDetails(false);
                      router.push({
                        pathname: "/addObjectScreen",
                        params: { 
                          object: JSON.stringify(selectedObject), 
                          mode: "edit" 
                        }
                      });
                    }}
                    activeOpacity={0.8}
                    className="w-8 h-8 bg-blue-100 rounded-full items-center justify-center"
                  >
                    <Text className="text-blue-600 font-bold">✏️</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    onPress={() => setShowDetails(false)}
                    className="w-8 h-8 bg-gray-100 rounded-full items-center justify-center"
                  >
                    <Text className="text-gray-600 font-bold">✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
                  
            <ScrollView className="max-h-96 p-4">
              {selectedObject && (
                <ObjectDetails 
                  object={selectedObject.object}
                  client={selectedObject.client}
                  chimneys={selectedObject.chimneys} />
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}