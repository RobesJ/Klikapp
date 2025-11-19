import { Client } from "@/types/generics";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { icons } from "../../constants/icons";

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
        <View className="flex-row items-center">
            <View className="flex-row">
                <Image
                    source={icons.personIcon}
                    tintColor="#000000"
                    className="size-10"
                />
                <View className="flex-1 ml-5">
                    <View>
                        <Text className="text-lg font-bold">
                            {client.name}
                        </Text> 
                    </View>
                    <View>
                        <Text className="text-lg">
                            {client.phone}
                        </Text> 
                    </View>
                </View>  
                <View className="flex-1 items-end justify-center mr-6">

                    {client.projectsCount !== undefined && (
                        <View className="mb-2">
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
                </View>
            </View>
        </View>
    </TouchableOpacity>    
    )
}