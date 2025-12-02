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
          className="flex-1 ml-2 py-2 px-4 bg-slate-400 rounded-lg mr-2"
        >
          <View className="flex-row items-center justify-between mb-1">
            {object.streetNumber && object.city &&
              <View>
                <Text className="font-semibold text-slate-900">
                  {object.streetNumber}, {object.city}
                </Text>
              </View>
            } 

            {object.address && (!object.streetNumber || !object.city) &&
              <View className="max-w-64">
                <Text className="font-semibold text-slate-900">
                  {object.address}
                </Text>
              </View>
            } 

            {chimneys.length > 0 && (
              <Text className="text-slate-900 font-semibold">
                  {chimneys.length} {chimneys.length === 1 ? "komín" : (chimneys.length > 4 ? "komínov" : "komíny")}
                </Text>
            )}
          </View>
           
        </TouchableOpacity>
    );
}