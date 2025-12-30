import { Client } from "@/types/generics";
import { Chimney, Object } from "@/types/objectSpecific";
import { TouchableOpacity, View } from "react-native";
import { BodySmall } from "../typography";

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
          className="flex-1 ml-2 py-2 px-4 border-t border-gray-400 mr-2"
        >
          <View className="flex-row items-center justify-between mb-1">
            {object.streetNumber && object.city &&
              <View>
                <BodySmall className="text-dark-text_color text-sm">
                 📍 {object.streetNumber}, {object.city}
                </BodySmall>
              </View>
            } 

            {object.address && (!object.streetNumber || !object.city) &&
              <View className="max-w-64">
                <BodySmall className="text-dark-text_color text-sm">
                  📍 {object.address}
                </BodySmall>
              </View>
            } 

            {chimneys.length > 0 && (
              <BodySmall className="text-dark-text_color text-sm">
                  {chimneys.length} {chimneys.length === 1 ? "komín" : (chimneys.length > 4 ? "komínov" : "komíny")}
              </BodySmall>
            )}
          </View>
           
        </TouchableOpacity>
    );
}