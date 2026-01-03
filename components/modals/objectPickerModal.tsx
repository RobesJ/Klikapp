import { ObjectWithRelations } from "@/types/objectSpecific";
import { FlatList, Modal, TouchableOpacity, View } from "react-native";
import { Body, BodySmall, Caption, Heading3 } from "../typography";

interface ObjectPickerModalProps {
    visible: boolean;
    onClose: () => void;
    onToggleObject: (value: string) => void; 
    selectedObjectIds: string[];
    assignedObjects?: ObjectWithRelations[]
}

export default function ObjectPickerModal({
    visible,
    onClose,
    onToggleObject,
    selectedObjectIds,
    assignedObjects
}: ObjectPickerModalProps){

    const isObjectSelected = (objectId: string): boolean => {
        return selectedObjectIds.some(id => id === objectId);
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View className="flex-1 bg-black/50 justify-end">
                <View className="bg-dark-bg rounded-t-3xl h-3/4">
                    <View className="p-6 border-b border-gray-600">
                        <View className="flex-row items-center justify-between mb-4">
                            <View className="flex-1">
                                <Heading3 className="text-xl font-bold text-dark-text_color">Vyhľadajte objekty</Heading3>
                                <BodySmall className="text-sm text-gray-500">
                                    {selectedObjectIds.length} vybraných
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
                    {/*loadingObjects ? 
                    (
                        <View className="flex-1 items-center justify-center">
                            <Body className="text-gray-500">Vyhľadávám...</Body>
                        </View>
                    ) : 
                    */}
                    {assignedObjects ? (
                        <View className="flex-1 items-center justify-center">
                            <Body className="text-gray-500">Žiadne objekty neboli nájdene</Body>
                        </View>
                    ) : (
                        <FlatList
                            data={assignedObjects}
                            keyExtractor={(item) => item.object.id}
                            renderItem={({ item }) => {
                                const selected = isObjectSelected(item.object.id);
                                return (
                                    <TouchableOpacity
                                        onPress={() => onToggleObject(item.id)}
                                        className={`px-6 py-4 border-b border-gray-100 ${selected ? 'bg-blue-50' : ''}`}
                                    >
                                        <View className="flex-row items-center justify-between">
                                            <View className="flex-1">
                                                
                                                {item.object.address && (
                                                    <BodySmall className="text-sm text-gray-500 mt-1">
                                                        {item.object.address}
                                                    </BodySmall>
                                                )}
                                            </View>
                                            {selected && (
                                                <View className="w-6 h-6 bg-blue-600 rounded-full items-center justify-center">
                                                    <Caption className="text-white text-xs">✓</Caption>
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