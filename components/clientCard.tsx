import { Text, TouchableOpacity, View } from "react-native";

interface Client {
    id?: string;
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    type: string | null;
    notes: string | null;
  }

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

                <View className="">
                    <Text>
                        {client.type}
                    </Text>
                </View>
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

            {client.notes &&
                <View className="mt-2 text-xs">
                    <Text>
                        {client.address}
                    </Text>
                </View>
            }

        </TouchableOpacity>
        
    )
}