import { Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";

interface FilterOption {
    value: string;
    label: string;
    color: string;
    checkColor: string;
}
interface FilterModalProps {
    visible: boolean;
    onClose: () => void;
    title: string;
    options: FilterOption[];
    selectedValues: string[];
    onToggle: (value: string) => void;
    selectedCount: number;
    onClearSelection: () =>void;
}

export default function FilterModal({
    visible,
    onClose,
    title,
    options,
    selectedValues,
    onToggle,
    onClearSelection,
    selectedCount
} : FilterModalProps) { 

    const isSelected = (value: string) => selectedValues.includes(value);

    return (
        <Modal
        visible={visible}
        transparent={true}
        animationType="fade"
        onRequestClose={onClose}
      >
        <View className="flex-1 bg-black/50 justify-center items-center">
          <View className="w-3/4 bg-white rounded-2xl overflow-hidden">
            {/* Header */}
            <View className="px-4 py-6 border-b border-gray-200">
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-xl font-bold">{title}</Text>
                </View>
                <TouchableOpacity
                  onPress={onClose}
                  className="w-8 h-8 bg-gray-100 rounded-full items-center justify-center"
                >
                  <Text className="text-gray-600 font-bold">✕</Text>
                </TouchableOpacity>
              </View>
            </View>
                  
            <ScrollView className="max-h-96 p-4">
              {options.map((option) => {
                const selected = isSelected(option.value);
                          
                return (
                  <TouchableOpacity
                    key={option.value}
                    onPress={() => onToggle(option.value)}
                    className={`${option.color} rounded-xl p-4 mb-3 border-2 ${
                      selected ? "border-gray-400" : "border-transparent"
                    }`}
                  >
                    <View className='flex-row justify-between items-center'>
                      <Text className='text-base font-semibold'>{option.value}</Text>

                      <View className={`w-6 h-6 rounded-md items-center justify-center ${
                        selected
                        ? `${option.checkColor} border-transparent`
                        : "border-gray-300 bg-white"
                        }`}
                      >
                        {selected && (
                          <Text className='text-white font-bold'>✓</Text>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            {/* Footer */}
      <View className="px-4 py-4 border-t border-gray-200 flex-row justify-between">
        {selectedCount > 0 && (
          <TouchableOpacity
            onPress={onClearSelection}
            className="bg-red-50 rounded-xl px-4 py-2"
          >
            <Text className="text-red-600 font-semibold">Zrušiť výber</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          onPress={onClose}
          className="bg-blue-600 rounded-xl px-6 py-2 ml-auto"
        >
          <Text className="text-white font-semibold">Hotovo</Text>
        </TouchableOpacity>
      </View>
          </View>
        </View>  
      </Modal>
    );
};