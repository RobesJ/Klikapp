import { useProjectStore } from "@/store/projectStore";
import { FlatList, Modal, Text, TouchableOpacity, View } from "react-native";

interface UserPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onToggle: (value: string) => void;
  selectedUsers: string[]; // string of user ids
}

export default function UserPickerModal({
    visible,
    onClose,
    onToggle,
    selectedUsers
  }: UserPickerModalProps) {

    const {availableUsers} = useProjectStore();

    return (
      <Modal
        visible={visible}
        animationType="slide"
        transparent={true}
        onRequestClose={onClose}
      >
        <View className="flex-1 bg-black/50 justify-end">
            <View className="bg-dark-bg rounded-t-3xl h-3/4">
                <View className="p-6 border-b border-gray-200">
                    <View className="flex-row items-center justify-between mb-4">
                        <View className="flex-1">
                            <Text className="text-xl font-bold text-dark-text_color">Vyberte používateľa</Text>
                            <Text className="text-sm text-gray-500">
                                {selectedUsers.length} vybraných
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={onClose}
                            className="w-8 h-8 bg-gray-700 rounded-full items-center justify-center active:bg-gray-600"
                        >
                            <Text className="text-white">✓</Text>
                        </TouchableOpacity>
                    </View>
                </View>
        
                {!availableUsers ? (
                    <View className="flex-1 items-center justify-center">
                        <Text className="text-gray-500">Načítavam používateľov..</Text>
                    </View>
                ) : 
                (
                    <FlatList
                        data={availableUsers}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => {
                            const selected = selectedUsers.includes(item.id);
                            return (
                                <TouchableOpacity
                                    onPress={() => onToggle(item.id)}
                                    className={'px-6 py-4 border-b border-gray-100 bg-dark-card-bg'}
                                >
                                    <View className="flex-row items-center justify-between">
                                        <View className="flex-1">
                                            <Text className="text-base font-semibold text-dark-text_color">
                                                {item.name}
                                            </Text>
                                            {item.email && (
                                                <Text className="text-sm text-gray-500 mt-1">
                                                    {item.email}
                                                </Text>
                                            )}
                                        </View>
                                        {selected && (
                                            <View className="rounded-full items-center justify-center">
                                              <Text className="text-green-600 text-xs font-semibold">
                                                Priradený
                                              </Text>
                                              <Text className="text-green-600 text-xs font-semibold">✓</Text>
                                            </View>
                                        )}
                                    </View>
                                </TouchableOpacity>
                            );
                        }}
                    />
                )}
            </View>
        </View>
    </Modal>    
  );
}