import { TouchableOpacity, View } from "react-native";
import { STATE_OPTIONS, TYPE_OPTIONS } from "./badge";
import { Body } from "./typography";

interface FilterPill {
    type: string;
    value: string;
    label?: string;
}

interface FilterPillsProps {
    filters: FilterPill[];
    onRemove: (type: any, value: string) => void;
}
export const FilterPills = ({filters,onRemove }: FilterPillsProps) => {
    if (filters.length === 0) return null;
    
    return (
        <View className="px-6 mt-4">
          <View className="flex-row flex-wrap">
            {filters.map((filter, index) => {
              let pillColor = "bg-blue-100";
              let textColor = "text-blue-700";
            
              if (filter.type === 'type') {
                const type_option =  TYPE_OPTIONS.find(s => s.value === filter.value)
                pillColor = type_option?.colors[1] ?? "border-gray-500 bg-yellow-100";
                textColor = type_option?.colors[0] ?? "border-gray-500 bg-yellow-100";
              } 
              else if (filter.type === 'state') {
                pillColor = STATE_OPTIONS.find(s => s.value === filter.value)?.colors[1] ?? "border-gray-500 bg-yellow-100";
                textColor = STATE_OPTIONS.find(s => s.value === filter.value)?.colors[0] ?? "border-gray-500 bg-yellow-100";
              }
            
              return (
                <TouchableOpacity
                  key={`${filter.type}-${filter.value}-${index}`}
                  onPress={() => onRemove(filter.type, filter.value)}
                  className={`${pillColor} rounded-full px-3 py-2 mr-2 mb-2 flex-row items-center`}
                >
                  <Body className={`${textColor} font-medium mr-1`}>{filter.label || filter.value}</Body>
                  <Body className={`${textColor} font-bold`}>✕</Body>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
    );
}