import { ChimneyInput, ChimneyType } from "@/types/objectSpecific";
import { validateChimney } from "@/utils/validation/objectAndChimneyValidation";
import { EvilIcons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { Modal, TouchableOpacity, View } from "react-native";
import { FormInput } from "../formInput";
import { NotificationToast } from "../notificationToast";
import { Body, BodySmall, Heading3 } from "../typography";

interface ChimneyFormProps {
    visible: boolean;
    onClose: () => void;
    onSaveChimney: (chimney: ChimneyInput, isEdit: boolean, editIndex?: number) => void;
    chimneyType: ChimneyType;
    mode: "create" | "edit";
    chimneyToEdit?: ChimneyInput;
    editIndex?: number;
}

export default function ChimneyForm ({
    visible, 
    onClose, 
    onSaveChimney,
    chimneyType, 
    mode, 
    chimneyToEdit,
    editIndex
} : ChimneyFormProps) {
    
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [focusedField, setFocusedField] = useState<string | null>(null);
    const [chimneyFormData, setChimneyFormData] = useState<ChimneyInput>({
        chimney_type_id: chimneyType.id,
        chimney_type: chimneyType,
        appliance: '',
        placement: '',
        note: ''
    });

    useEffect(() => {
        if (visible) {
            if(chimneyToEdit){
                setChimneyFormData({
                    chimney_type_id: chimneyToEdit?.chimney_type_id,
                    chimney_type: chimneyToEdit?.chimney_type,
                    appliance: chimneyToEdit?.appliance || '',
                    placement: chimneyToEdit?.placement || '',
                    note: chimneyToEdit?.note || '',
                    ...(chimneyToEdit.id && { id: chimneyToEdit.id })
                });
            }
            else{
                setChimneyFormData({
                    chimney_type_id: chimneyType.id,
                    chimney_type: chimneyType,
                    appliance: '',
                    placement: '',
                    note: ''
                });
            }
            setErrors({});
        }
    }, [visible, chimneyType, chimneyToEdit]);
    
    const handleChange = (field: string, value: string) => {
        setChimneyFormData( prev => ({...prev, [field]: value}));
        if (errors[field]) {
            setErrors( prev => {
                const newErrors = {...prev};
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    const handleOnClose = useCallback(() => {
        setFocusedField(null);
        setChimneyFormData({
            chimney_type_id: '',
            chimney_type: undefined,
            appliance:  '',
            placement: '',
            note: '',
        });
        setErrors({});
        onClose();
    }, [onClose, chimneyFormData, focusedField]);

    const handleSubmit = useCallback(async () => {
        if (loading) return;
        const result = validateChimney(chimneyFormData)
        
        if(!result.valid){
            setErrors(result.errors);
            return;
        }

        setLoading(true);

        try{
            const chimneyToSave: ChimneyInput = {
                chimney_type_id: chimneyFormData.chimney_type_id,
                chimney_type: chimneyFormData.chimney_type,
                placement: chimneyFormData.placement,
                appliance: chimneyFormData.appliance,
                note: chimneyFormData.note,
                ... (chimneyToEdit?.id && {id: chimneyToEdit.id })
            };
            onSaveChimney(chimneyToSave, mode === "edit", editIndex);
            handleOnClose();
        }
        catch( error: any){
            console.error("Error in chimney form:", error);
        }
        finally{
            setLoading(false);
        }
    }, [chimneyFormData, handleOnClose]);

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View className="flex-1 bg-black/50 justify-end">
                <View className="bg-dark-bg rounded-t-3xl">

                    {/* Header */}
                    <View className="p-6 border-b border-gray-600">
                        <View className="flex-row items-center justify-between">
                            <Heading3 className="text-xl font-bold text-dark-text_color">Detail komína</Heading3>
                            <TouchableOpacity
                                onPress={() => handleOnClose()}
                                className="w-8 h-8 bg-gray-700 rounded-full items-center justify-center active:bg-gray-600"
                            >
                                <EvilIcons name="close" size={20} color="white" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Form */}
                    <View className="p-6">
                        <NotificationToast screen="chimneyForm"/>
                        {/* Chimney Type (read-only) */}
                        <View className="mb-4">
                            <Body className="mb-2 ml-1 font-semibold text-dark-text_color">Typ</Body>
                            <View className="bg-gray-800 rounded-xl border-2 px-4 py-3 border-gray-700 text-white">
                                <Body className="font-semibold text-white">{chimneyFormData.chimney_type?.type}</Body>
                                {chimneyFormData.chimney_type?.labelling && (
                                    <BodySmall className="text-sm text-gray-300">{chimneyFormData.chimney_type.labelling}</BodySmall>
                                )}
                            </View>
                        </View>
                            
                        {/* Placement */}
                        <FormInput
                          label= "Umiestnenie spotrebiča"
                          value={chimneyFormData.placement || ''}
                          placeholder= "Napr. Kuchyňa, Obývačka..."
                          onChange= {(text) => handleChange("placement", text)}
                          error={errors.placement}
                          fieldName= "placement"
                          focusedField= {focusedField}
                          setFocusedField= {setFocusedField}
                        />

                        {/* Appliance */}
                        <FormInput
                          label= "Druh spotrebiča"
                          value={chimneyFormData.appliance || ''}
                          placeholder="Napr. Plynový kotol, Krb..."
                          onChange= {(text) => handleChange("appliance", text)}
                          error={errors.appliance}
                          fieldName= "appliance"
                          focusedField= {focusedField}
                          setFocusedField= {setFocusedField}
                        />

                        {/* Note */}
                        <FormInput
                          label= "Poznámka"
                          value={chimneyFormData.note|| ''}
                          placeholder="Dodatočné informácie..."
                          onChange= {(text) => handleChange("note", text)}
                          error={errors.note}
                          fieldName= "note"
                          focusedField= {focusedField}
                          setFocusedField= {setFocusedField}
                          multiline
                        />

                    </View>
                            
                    {/* Submit Button */}
                    <View className="items-center justify-center mb-10">
                        <TouchableOpacity
                            onPress={handleSubmit}
                            className="rounded-xl bg-slate-500 p-4 px-12 active:bg-slate-800"
                        >
                            <Body className="text-white font-bold">Uložiť komín</Body>
                        </TouchableOpacity>
                    </View>
                            
                </View>
            </View>
        </Modal>
    )
}