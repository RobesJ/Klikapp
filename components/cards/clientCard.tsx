import { Client } from "@/types/generics";
import { Feather } from "@expo/vector-icons";
import { TouchableOpacity, View } from "react-native";
import { Body, BodyLarge } from "../typography";

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
            className="rounded-2xl mb-3 border-2 border-dark-card-border_color p-3 bg-dark-card-bg"
        >   
        <View className="flex-row items-center">
            <View className="flex-row">
                <View>
                    <Feather name="user" size={32} color={"#d6d3d1"}/>
                </View>
                <View className="flex-1 ml-4">
                    <View className="mb-1">
                        <BodyLarge className="font-bold text-dark-text_color">
                            {client.name}
                        </BodyLarge> 
                    </View>
                    <View>
                        <BodyLarge className="text-dark-text_color">
                            {client.phone}
                        </BodyLarge> 
                    </View>
                </View>  
                <View className="flex-1 items-end justify-center mr-6">

                    {client.projectsCount !== undefined && client.projectsCount > 0 && (
                        <View className="mb-2">
                            <Body className="text-dark-text_color">
                                {client.projectsCount} 
                                {client.projectsCount=== 1
                                ? " projekt" 
                                : (client.projectsCount === 2 || client.projectsCount === 3 || client.projectsCount === 4
                                    ? " projekty":
                                    " projektov"
                                )}
                            </Body>
                        </View>
                    )}

                    {client.objectsCount !== undefined && client.objectsCount > 0 && (
                        <View>
                            <Body className="text-dark-text_color">
                                {client.objectsCount}
                                {client.objectsCount=== 1
                                ? " objekt" 
                                : (client.objectsCount === 2 || client.objectsCount === 3 || client.objectsCount === 4
                                    ? " objekty":
                                    " objektov"
                                )}
                            </Body>
                        </View>
                    )}
                </View>
            </View>
        </View>
    </TouchableOpacity>    
    )
}