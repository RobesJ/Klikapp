import { ChimneyType } from "@/types/objectSpecific";
import { EvilIcons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { FlatList, Modal, TextInput, TouchableOpacity, View } from "react-native";
import { Body, BodySmall, Heading3 } from "../typography";

interface ChimneyTypeSelectionModalProp{
    visible: boolean;
    onClose: () => void;
    onSelectChimneyType: (chimneyType: ChimneyType) => void;
    onCreateNewType: () => void;
    chimney_types: ChimneyType[];
}

export const ChimneyTypeSelectionModal = ({ 
    visible, 
    onClose,
    onSelectChimneyType,
    onCreateNewType,
    chimney_types
}: ChimneyTypeSelectionModalProp) => {
    const [searchQueryChimney, setSearchQueryChimney] = useState('');
    const [filteredChimneyTypes, setFilteredChimneyTypes] = useState<ChimneyType[]>([]);
    
    useEffect(() => {
        if (!searchQueryChimney.trim()) {
            setFilteredChimneyTypes(chimney_types);
        } else {
            handleSearchChimney(searchQueryChimney);
        }
    }, [chimney_types]);

    const handleSearchChimney = (text: string) => {
        setSearchQueryChimney(text);
        
        if (text.trim().length === 0){
            setFilteredChimneyTypes(chimney_types);
        }
        else{
            const filteredChimneyTypes = chimney_types.filter(chimney =>
                chimney.type.toLowerCase().includes(text.toLowerCase()) ||
                (chimney.labelling && chimney.labelling.toLowerCase().includes(text.toLowerCase()) )
            );
            setFilteredChimneyTypes(filteredChimneyTypes);
        }
    };

    const handleSelect = (chimneyType: ChimneyType) => {
        setSearchQueryChimney(''); // Reset search
        onSelectChimneyType(chimneyType);
        onClose();
    };

    const handleClose = () => {
        setSearchQueryChimney('');
        onClose();
    };

    const handleCreateNew = () => {
        setSearchQueryChimney('');
        onClose();
        onCreateNewType();
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={handleClose}
        >
            <View className="flex-1 bg-black/50 justify-end">
                <View className="bg-dark-bg rounded-t-3xl border-2 border-gray-500" style={{height: "75%" }}>
                    {/* header */}
                    <View className="p-6 border-b border-gray-700">
                        <View className="flex-row items-center justify-between mb-4">
                            <Heading3 className="text-xl text-dark-text_color font-bold">Vyberte typ komína</Heading3>
                            <TouchableOpacity
                                onPress={handleClose}
                                className="items-center justify-cente"
                            >
                                <EvilIcons name="close" size={28} color="white" />
                            </TouchableOpacity>
                        </View>
                        <View className="flex-row items-center bg-gray-800 rounded-xl border-2 px-4 py-1 border-gray-700">
                            <EvilIcons name="search" size={20} color="gray" />
                            <TextInput
                                placeholder="Hľadať komín (typ, označenie)"
                                value={searchQueryChimney}
                                onChangeText={handleSearchChimney}
                                placeholderTextColor={"#ABABAB"}
                                className="text-white"
                            />
                        </View>
                    </View>
                    <View className="flex-1">
                        {filteredChimneyTypes.length === 0 ? (
                            <View className="flex-1 items-center justify-center">
                                <Heading3 className="mb-4">🔍</Heading3>
                                <Body className="text-gray-400 text-base">Žiadne komíny nenájdené</Body>
                            </View>
                        ) : (
                            <FlatList
                                data={filteredChimneyTypes}
                                keyExtractor={(item) => item.id}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        onPress={() => handleSelect(item)}
                                        className="px-6 py-4 border-b border-gray-600"
                                    >
                                        <Body className="text-base font-semibold text-dark-text_color">
                                            {item.type}
                                        </Body>
                                        {item.labelling && (
                                            <BodySmall className="text-sm text-gray-500 mt-1">
                                                {item.labelling}
                                            </BodySmall>
                                        )}
                                    </TouchableOpacity>
                                )}
                                contentContainerStyle={{ paddingBottom: 100}}
                            />
                        )}
                    </View>
                </View>
                
                {/* Create new chimney type button */}
                <View className="absolute bottom-10 left-0 right-0 bg-dark-bg items-center justify-center">
                    <TouchableOpacity
                      onPress={handleCreateNew}
                      className="rounded-xl bg-slate-500 py-4 px-12 active:bg-slate-800"
                    >
                        <Body className="text-white font-semibold">
                           + Vytvoriť nový typ komína
                        </Body>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
)
}