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

interface Object {
    id?: string;
    client_id?: string,
    address: string | null;
    placement: string | null,
    appliance: string | null,
    note: string | null;
}

interface Chimney {
    id: string;
    type: string;
    labelling: string | null;
}

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
            onPress={handlePress}
            className="rounded-2xl mb-3 border border-gray-800 p-3"
        >
            <View className="flex-row items-center justify-between mb-2">
                <View className="flex-1">
                <Text className="text-lg font-bold">
                    {object.address}
                </Text> 
                </View>

            </View>

            {client?.name &&
                <View className="flex-row items-center mb-2">
                    <Text>
                        {client?.name}
                    </Text>
                </View>
            }

            {chimneys.length > 0 && (
                <View className="flex-row items-center mb-2">
                    {chimneys.map((chimney) => (
                        <Text key={chimney.id}>
                            {chimney.type}
                            {chimney.labelling}
                        </Text>
                    ))}
                </View>
            )}
            
            {object.appliance &&
                <View className="flex-row items-center mb-2">
                    <Text>
                        {object.appliance}
                    </Text>
                </View>
            }

            {object.placement &&
                 <View className="flex-row items-center mb-2">
                    <Text>
                        {object.placement}
                    </Text>
                </View>
            }

            {object.note &&
                <View className="mt-2 text-xs">
                    <Text>
                        {object.note}
                    </Text>
                </View>
            }

        </TouchableOpacity>
    )
}