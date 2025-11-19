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
            {chimneys.length > 0 && (
                chimneys.map(ch => (
                    <View
                        key={ch.id}
                    >
                        <Text> {ch.appliance}</Text>
                        <Text> {ch.placement}</Text>
                        <Text> {ch.chimney_type?.labelling}</Text>
                        <Text> {ch.chimney_type?.type}</Text>
                        <Text> {ch.note} </Text>
                    </View>
                ))
            )}
            
        </View>
    );
}