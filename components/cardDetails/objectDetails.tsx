import { Client } from "@/types/generics";
import { Chimney, Object } from "@/types/objectSpecific";
import { Text, View } from "react-native";

interface ObjectCardDetailsProps {
    object: Object;
    client: Client;
    chimneys: Chimney[];
}

export default function ObjectDetails({ object, chimneys, client } : ObjectCardDetailsProps) { 
    return (
        <View className="flex-1">
            {client &&
                <View className="flex-row items-center mb-2">
                    <Text className="text-dark-text_color">
                        {client.name} 
                    </Text>
                </View>
            }
            {chimneys.length > 0 && (
                chimneys.map(ch => (
                    <View
                        className="border rounded-lg bg-dark-details-o_p_bg px-4 py-2 mb-2"
                        key={ch.id}
                    >
                        <View className="flex-row mb-1">
                            <Text className="text-dark-text_color mr-2">
                                {ch.chimney_type?.type} {" -"}
                            </Text>
                            <Text className="text-dark-text_color"> 
                                {ch.chimney_type?.labelling}
                            </Text>
                        </View>
                        {ch.appliance && (
                            <View className="flex-row mb-1">
                                <Text className="text-dark-text_color mr-2"> 
                                    Druh spotrebica: 
                                </Text>
                                <Text className="text-dark-text_color"> 
                                    {ch.appliance}
                                </Text>
                            </View>
                        )}

                        {ch.placement && (
                            <View className="flex-row mb-1">
                                <Text className="text-dark-text_color mr-2"> 
                                    Umiestnenie: 
                                </Text>
                                <Text className="text-dark-text_color"> 
                                    {ch.placement}
                                </Text>
                            </View>
                        )}
                        
                        {ch.note && (
                            <View className="flex-row mb-1 max-w-64">
                                <Text className="text-dark-text_color mr-2"> 
                                    Poznamka: 
                                </Text>
                                <Text className="text-dark-text_color"> 
                                    {ch.note} 
                                </Text>
                            </View>
                        )}
                        
                    </View>
                ))
            )}
            
        </View>
    );
}