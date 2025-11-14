import { Client } from "@/types/generics";
import { Text, TouchableOpacity, View } from "react-native";

interface ClientCardProps {
    client: Client,
    onPress? : () => void
}

export default function ClientCard({ client, onPress } : ClientCardProps) {

    const handlePress = () => {
        if (onPress){
            onPress();
        }
    };
   
    return (
        <TouchableOpacity
            activeOpacity={0.8}
            onPress={handlePress}
            className="rounded-2xl mb-3 border border-gray-800 p-3"
        >
            <View className="flex-row items-center justify-between mb-2">
                <View className="flex-1">
                <Text className="text-lg font-bold">
                    {client.name}
                </Text> 
                </View>

            </View>

            {client.projectsCount !== undefined && (
        <View className="flex-row items-center mb-2">
          <Text>
            {client.projectsCount} projektov
          </Text>
        </View>
      )}

      {client.objectsCount !== undefined && (
        <View>
          <Text>
            {client.objectsCount} objektov
          </Text>
        </View>
      )}
            {/*

            <View className="">
                    <Text>
                        {client.type}
                    </Text>
                </View>
            {client.email &&
                <View className="flex-row items-center mb-2">
                    <Text className="mr-2 text-sm">📧</Text>
                    <Text>
                        {client.email}
                    </Text>
                </View>
            }

            {client.phone &&
                 <View className="flex-row items-center mb-2">
                    <Text className="mr-2 text-sm">📱</Text>
                    <Text>
                        {client.phone}
                    </Text>
                </View>
            }

            {client.address &&
                <View className="flex-row items-center">
                    <Text className="mr-2">📍</Text>
                    <Text>
                        {client.address}
                    </Text>
                </View>
            }

            {client.note &&
                <View className="mt-2 text-xs">
                    <Text>
                        {client.note}
                    </Text>
                </View>
            }
            */}
        </TouchableOpacity>
        
    )
}