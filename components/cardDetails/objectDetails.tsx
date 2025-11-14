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
                    <Text>
                        {client.name}
                    </Text>
                </View>
            }
            
            {object.address &&
                <View className="flex-row items-center mb-2">
                    <Text>
                        {object.address}
                    </Text>
                </View>
            }
            {/*
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
            
            {object.placement &&
                 <View className="flex-row items-center mb-2">
                    <Text>
                        {object.placement}
                    </Text>
                </View>
            }

            {object.appliance &&
                <View className="flex-row items-center">
                    <Text>
                        {object.appliance}
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
            */}
        </View>
    );
}