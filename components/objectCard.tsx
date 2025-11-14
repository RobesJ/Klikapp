import { Client } from "@/types/generics";
import { Chimney, Object } from "@/types/objectSpecific";
import { FlatList, Text, TouchableOpacity, View } from "react-native";

interface ObjectCardProps {
    object: Object;
    client: Client;
    chimneys: Chimney[]
    onPress? : () => void;
}

export default function ObjectCard({ object, client, chimneys, onPress } : ObjectCardProps) {
   
    const handlePress = () => {
        if (onPress){
            onPress();
        }
    };
   
    return (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onPress}
          className="rounded-2xl mb-3 border border-gray-800 p-3"
        >
          <View className="flex-1 items-start justify-between mb-2">
            {client?.name && (
              <View className="mb-2">
                <Text className="text-lg font-bold">{client?.name}</Text>
              </View>
            )}
    
            <View>
              <Text className="font-normal">{object.address}</Text>
            </View>
            
          </View>
          {chimneys.length > 0 && (
          <Text className="mb-2 ml-1 font-semibold text-gray-700">
                  Komíny
            </Text>
            )}
          <FlatList
            data={chimneys}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View className="mb-4">
               
    
                {/* ✅ chimney_type is not an array */}
                {item.chimney_type && (
                  <View className="bg-blue-50 rounded-xl p-3 mb-2">
                    <Text className="font-semibold text-blue-900">
                      {item.chimney_type.type}
                    </Text>
    
                    {item.chimney_type.labelling && (
                      <Text className="text-sm text-blue-700">
                        {item.chimney_type.labelling}
                      </Text>
                    )}
                  </View>
                )}
    
                <View className="pl-3">
                  {item.placement && (
                    <Text className="text-sm text-gray-600">Umiestnenie: {item.placement}</Text>
                  )}
                  {item.appliance && (
                    <Text className="text-sm text-gray-600">Spotrebic: {item.appliance}</Text>
                  )}
                  {item.note && (
                    <Text className="text-sm text-gray-600">Poznamka: {item.note}</Text>
                  )}
                </View>
              </View>
            )}
          />
        </TouchableOpacity>
    );
}