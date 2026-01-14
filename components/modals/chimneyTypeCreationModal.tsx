import { supabase } from "@/lib/supabase";
import { useNotificationStore } from "@/store/notificationStore";
import { ChimneyType } from "@/types/objectSpecific";
import { EvilIcons } from "@expo/vector-icons";
import { useCallback, useState } from "react";
import { Modal, TouchableOpacity, View } from "react-native";
import { FormInput } from "../formInput";
import { Body, Heading3 } from "../typography";

interface ChimneyTypeCreationModalProp {
    visible: boolean;
    onClose: () => void;
    onChimneyTypeCreated: (chimneyType: ChimneyType) => void;
}

export const ChimneyTypeCreationModal = ({ 
    visible, 
    onClose,
    onChimneyTypeCreated
}: ChimneyTypeCreationModalProp) => {
    const [loading, setLoading] = useState(false);
    const [focusedField, setFocusedField] = useState<string | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [chimneyTypeFormData, setChimneyTypeFormData] = useState<{
        type: string;
        labelling: string;
    }>({
        type: '',
        labelling: ''
    });
    
    const handleChange = (field: "type" | "labelling", value: string) => {
        setChimneyTypeFormData( prev => ({ ...prev, [field]: value}));

        if (errors[field]) {
            setErrors( prev => {
                const newErrors = {...prev};
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    const validate = () : boolean => {
        const newErrors : Record<string, string> = {};

        if (!chimneyTypeFormData.type.trim()) {
            newErrors.type = "Typ komína je povinná položka!";
        }

        if (!chimneyTypeFormData.labelling.trim()) {
            newErrors.labelling = "Označenie komína je povinná položka!";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = useCallback(async () => {
        if(!validate()){
            return;
        }
    
        setLoading(true);

        try{
            const {data: chimneyTypeData, error: chimneyTypeError } = await supabase
                .from("chimney_types")
                .insert([chimneyTypeFormData])
                .select()
                .single();
            
            if (chimneyTypeError) throw chimneyTypeError;

            useNotificationStore.getState().addNotification(
                "Nový typ komina bol vytvorený!",
                "success",
                "chimneyForm",
                3000
            );
           
            setChimneyTypeFormData({ type: '', labelling: ''});
            setErrors({});
            onChimneyTypeCreated(chimneyTypeData);
            onClose();
        }
        catch (error: any){
            console.error("Error saving object: ", error);
            useNotificationStore.getState().addNotification(
                "Nastala chyba pri vytváraní nového typu komina!",
                "error",
                "chimneyForm",
                4000
            );
        }
        finally{
            setLoading(false);
        }
    }, [onClose, chimneyTypeFormData]);

    const handleClose = useCallback(() => {
        setChimneyTypeFormData({type: "", labelling: ""});
        setErrors({});
        onClose();
        setFocusedField(null);
    },[onClose, chimneyTypeFormData, focusedField]);

    return (
        <Modal
        visible={visible}
        animationType="fade"
        transparent={true}
        onRequestClose={handleClose}
        >
            <View className="flex-1 bg-black/50 justify-center items-center">
                <View className="w-3/4 bg-dark-bg rounded-2xl overflow-hidden border-2 border-gray-500">
                    {/* Header*/}
                    <View className="p-6 border-b border-gray-600">
                        <View className="flex-row items-center justify-between">
                            <Heading3 className="text-xl text-dark-text_color font-bold">Vytvorte typ komína</Heading3>
                            <TouchableOpacity
                                onPress={handleClose}
                                className="items-center justify-center"
                            >
                                <EvilIcons name="close" size={28} color="white"/>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Form */}
                    <View className="p-4 mb-4">
                        {/* Type field*/}
                        <FormInput
                          label="Typ"
                          placeholder="Napíšte typ komína"
                          value={chimneyTypeFormData.type}
                          onChange={(text) => handleChange("type", text)}
                          fieldName="chimney_type"
                          error={errors.type}
                          focusedField={focusedField}
                          setFocusedField={setFocusedField}
                        />

                        {/* Labelling field*/}
                        <FormInput
                          label="Označenie"
                          placeholder="Napíšte označenie komína"
                          value={chimneyTypeFormData.labelling}
                          onChange={(text) => handleChange("labelling", text)}
                          error={errors.type}
                          fieldName="chimney_labelling"
                          focusedField={focusedField}
                          setFocusedField={setFocusedField}
                        />
                    </View>

                    {/* Create button */}
                    <View className="items-center justify-center mb-6">
                        <TouchableOpacity
                          activeOpacity={0.8}
                          onPress={handleSubmit}
                          disabled={loading}
                          className="rounded-xl bg-slate-500 p-4 px-12 active:bg-slate-800"
                        >
                            <Body className="text-white font-bold">
                                {loading ? "Vytváram..." : "Vytvoriť"}
                            </Body>
                        </TouchableOpacity>
                    </View>   
                </View>
            </View>
        </Modal>
    );
}