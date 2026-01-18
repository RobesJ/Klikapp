import { useProjectStore } from "@/store/projectScreenStore";
import { FlatList, Modal, TouchableOpacity, View } from "react-native";
import { Body, BodySmall, Caption, Heading3 } from "../typography";

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
                            <Heading3 className="text-xl font-bold text-dark-text_color">Vyberte používateľa</Heading3>
                            <BodySmall className="text-sm text-gray-500">
                                {selectedUsers.length} vybraných
                            </BodySmall>
                        </View>
                        <TouchableOpacity
                            onPress={onClose}
                            className="w-8 h-8 bg-gray-700 rounded-full items-center justify-center active:bg-gray-600"
                        >
                            <Body className="text-white">✓</Body>
                        </TouchableOpacity>
                    </View>
                </View>
        
                {!availableUsers ? (
                    <View className="flex-1 items-center justify-center">
                        <Body className="text-gray-500">Načítavam používateľov..</Body>
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
                                            <Body className="text-base font-semibold text-dark-text_color">
                                                {item.name}
                                            </Body>
                                            {item.email && (
                                                <BodySmall className="text-sm text-gray-500 mt-1">
                                                    {item.email}
                                                </BodySmall>
                                            )}
                                        </View>
                                        {selected && (
                                            <View className="rounded-full items-center justify-center">
                                              <Caption className="text-green-600 text-xs font-semibold">
                                                Priradený
                                              </Caption>
                                              <Caption className="text-green-600 text-xs font-semibold">✓</Caption>
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