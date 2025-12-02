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
            className="rounded-2xl mb-3 border border-dark-card-border_color p-3 bg-dark-card-bg"
        >   
        <View className="flex-row items-center">
            <View className="flex-row">
                <Image
                    source={icons.personIcon}
                    tintColor="#d6d3d1"
                    className="size-10"
                />
                <View className="flex-1 ml-5 ">
                    <View>
                        <Text className="text-lg font-bold text-dark-text_color">
                            {client.name}
                        </Text> 
                    </View>
                    <View>
                        <Text className="text-lg text-dark-text_color">
                            {client.phone}
                        </Text> 
                    </View>
                </View>  
                <View className="flex-1 items-end justify-center mr-6">

                    {client.projectsCount !== undefined && client.projectsCount > 0 && (
                        <View className="mb-2">
                            <Text className="text-dark-text_color">
                                {client.projectsCount} 
                                {client.projectsCount===1
                                ? " projekt" 
                                : (client.projectsCount ===2 || client.projectsCount ===3 || client.projectsCount === 4
                                    ? " projekty":
                                    " projektov"
                                )}
                            </Text>
                        </View>
                    )}

                    {client.objectsCount !== undefined && client.objectsCount > 0 && (
                        <View>
                            <Text className="text-dark-text_color">
                                {client.objectsCount}
                                {client.objectsCount===1
                                ? " objekt" 
                                : (client.objectsCount ===2 || client.objectsCount ===3 || client.objectsCount === 4
                                    ? " objekty":
                                    " objektov"
                                )}
                            </Text>
                        </View>
                    )}
                </View>
            </View>
        </View>
    </TouchableOpacity>    
    )
}