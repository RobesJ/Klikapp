import { Client } from "@/types/generics";
import { Chimney, Object } from "@/types/objectSpecific";
import { Text, TouchableOpacity, View } from "react-native";

interface ObjectCardProps {
    object: Object;
    client: Client;
    chimneys: Chimney[]
    onPress? : () => void;
}

export default function ObjectCard({ object, chimneys, onPress } : ObjectCardProps) {
   
    return (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onPress}
          className="flex-1 ml-2"
        >
          <View className="flex-row items-center justify-between mb-1">
          {object.streetNumber && object.city &&
            <View>
              <Text className="font-semibold">{object.streetNumber}, {object.city}</Text>
            </View>
          } 

          {object.address && !object.streetNumber && !object.city &&
            <View>
              <Text>{object.address}</Text>
            </View>
          } 
          
          {chimneys.length > 0 && (
          <Text> {/*className="font-semibold text-gray-700">*/}
              Priradane {chimneys.length} komíny
            </Text>
            )}
          </View>
           
        </TouchableOpacity>
    );
}