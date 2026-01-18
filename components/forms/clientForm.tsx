import { useClientSubmit } from "@/hooks/submitHooks/useClientSubmit";
import { useGoogleSearchAddress } from "@/hooks/useGoogleAddressSearch";
import { Client } from "@/types/generics";
import { validateClient } from "@/utils/validation/clientValidation";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { AsYouType } from "libphonenumber-js";
import { useCallback, useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, View } from "react-native";
import { FormInput } from "../formInput";
import { NotificationToast } from "../notificationToast";
import { Body, Heading1 } from "../typography";

interface ClientFormProps{
    mode: "create" | "edit";
    initialData?: Client;
    onSuccess?: (client: Client) => void;
}

export default function ClientForm({ mode, initialData, onSuccess} : ClientFormProps) {

    const [formData, setFormData] = useState<Omit<Client, "id"> & {id?: string}>({
        name: initialData?.name || '',
        email: initialData?.email || '',
        unformatted_email: initialData?.unformatted_email || '',
        phone: initialData?.phone || '',
        address: initialData?.address || '',
        city: initialData?.city || '',
        streetNumber: initialData?.streetNumber || '',
        country: initialData?.country || '',
        place_id: initialData?.place_id || '',
        type: initialData?.type || "",
        note: initialData?.note || '',
    });

    const router = useRouter();
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [selectedType, setSelectedType] = useState('');
    const [focusedField, setFocusedField] = useState<string | null>(null);
    
    const { loading, submitClient } = useClientSubmit({ mode, initialData, onSuccess});
    const handleChange = (field: keyof Omit<Client,"id">, value: string) => {
        setFormData(prev => ({...prev, [field]: value}));
        if(errors[field]){
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    const handlePhoneChange = (value: string) => {
        const formatter = new AsYouType("SK");
        const formatted = formatter.input(value);
        handleChange("phone", formatted);
    };

    const {
        addressSearch,
        addressSuggestions,
        showAddressSuggestions,
        searchingAddress,
        searchGoogleAddress,
        selectAddress
    } = useGoogleSearchAddress<Omit<Client,"id">>(handleChange, {includePlaceId: true});

    useEffect(() => {
        if (initialData){
            setFormData({
                name: initialData.name || "",
                email: initialData?.email || '',
                unformatted_email: initialData?.unformatted_email || '',
                phone: initialData?.phone || '',
                address: initialData?.address || '',
                city: initialData?.city || '',
                streetNumber: initialData?.streetNumber || '',
                country: initialData?.country || '',
                place_id: initialData?.place_id || '',
                type: initialData?.type || "",
                note: initialData?.note || '',
            });
            
            if(initialData.type != null){
                setSelectedType(initialData.type);
            }
        }
    }, [initialData]);

    const handleSubmit = useCallback(async () => {
        const result = validateClient(formData);

        if(!result.valid){
            setErrors(result.errors);
            return;
        }

        if (result.normalized){
            setFormData(prev => ({...prev, ...result.normalized}));
        }

        submitClient(formData);
    }, [submitClient]);
                    
    const handleSelectedType = useCallback((type: string) => {
        setSelectedType(type);
        setFormData(prev => ({...prev, type: type}))
    }, [selectedType, formData]);

    return (
        <View className="flex-1">
            <KeyboardAvoidingView
              behavior={Platform.OS === "android" ? "padding" : "height"}
              className='flex-1'
            >
                {/* Header */}
                <View className="mb-12 relative">
                    <TouchableOpacity
                      onPress={() => router.back()}
                      className="absolute top-3 left-6 w-10 h-10 items-center justify-center z-10"
                    >
                        <MaterialIcons name="arrow-back" size={24} color="#d6d3d1"/>
                    </TouchableOpacity>

                    <Heading1 className="font-bold text-3xl text-dark-text_color top-3 text-center">
                        {mode === "create" ? "Vytvoriť klienta" : "Upraviť klienta"}
                    </Heading1>
                </View>
                
                {/* Form */}
                <View className="flex-1 px-10">
                        <NotificationToast
                          screen="clientForm"
                        />
                        {/* Name field */}
                        <FormInput
                            label="Meno"
                            value={formData.name}
                            onChange={(value) => handleChange("name", value)}
                            placeholder="Meno a priezvisko / Názov firmy"
                            error={errors.name}
                            fieldName="name"
                            focusedField={focusedField}
                            setFocusedField={setFocusedField}
                            autoCapitalize="words"
                        />

                        {/* Email field */}
                        <FormInput
                            label="Email"
                            value={formData.email || ''}
                            onChange={(value) => handleChange("email", value)}
                            placeholder="email.klienta@priklad.sk"
                            error={errors.email}
                            fieldName="email"
                            focusedField={focusedField}
                            setFocusedField={setFocusedField}
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />

                        {/* Phone field */}
                        <FormInput
                            label="Telefónne číslo"
                            value={formData.phone || ''}
                            onChange={handlePhoneChange}
                            placeholder="+XXX 901 234 567"
                            error={errors.phone}
                            fieldName="phone"
                            focusedField={focusedField}
                            setFocusedField={setFocusedField}            
                            keyboardType="phone-pad"
                        />


                        {/* Address field */}               
                        <View>
                            <FormInput
                                label="Adresa trvalého pobytu / Sídlo firmy"
                                value={addressSearch || formData.address || ''}
                                onChange={searchGoogleAddress}
                                placeholder="Začnite písať adresu..."
                                error={errors.address}
                                fieldName="address"
                                focusedField={focusedField}
                                setFocusedField={setFocusedField}            
                            />
                            
                            {searchingAddress && (
                                <View className="absolute right-4 top-4">
                                    <Body className="text-gray-400">🔍</Body>
                                </View>
                            )}
                                
                            {showAddressSuggestions && addressSuggestions.length > 0 && (
                                 <View className="border-2 border-gray-300 rounded-xl mt-1 bg-gray-300 max-h-60">
                                    <ScrollView className="border-b rounded-xl border-gray-300">
                                        {addressSuggestions.map((item) => (
                                            <TouchableOpacity
                                                key={item.place_id}
                                                onPress={() => selectAddress(item)}
                                                className="p-4 border-b border-gray-100"
                                            >
                                                <Body className="text-base">{item.description}</Body>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            )}
                        </View>
                        
                            
                        {/* Type field */}
                        <View className="mb-4">
                            <Body className="mb-1 ml-1 font-medium text-dark-text_color">Typ</Body>
                            <View className="flex-row">
                                <TouchableOpacity
                                    onPress={() => handleSelectedType("Fyzická osoba")}
                                    className={`border-2 ${selectedType === "Fyzická osoba" ? "border-gray-300" : "border-gray-500 bg-gray-800"} rounded-xl p-4 mr-2 items-center`}
                                    style={{width: "49%"}}
                                >
                                    <Body
                                      style={{ color: selectedType === "Fyzická osoba" ? '#FFFFFF' : '#ABABAB' }}
                                      className={`${selectedType === "Fyzická osoba" ? "font-semibold" : "font-normal"}`}
                                    >
                                        Fyzická osoba
                                    </Body>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    className={`border-2 ${selectedType === "Právnická osoba" ? "border-gray-300 " : "border-gray-500 bg-gray-800"} rounded-xl p-4 items-center`}
                                    onPress={() => handleSelectedType("Právnická osoba")}
                                    style={{width: "49%"}}
                                >
                                    <Body
                                      style={{ color: selectedType === "Právnická osoba" ? '#FFFFFF' : '#ABABAB' }}
                                      className={`${selectedType === "Právnická osoba" ? "font-semibold" : "font-normal"}`}
                                    >
                                        Právnická osoba
                                    </Body>
                                </TouchableOpacity>  
                            </View>
                            {errors.type && (
                                <Body className='text-red-500 font-semibold ml-2 mt-1'>
                                    {errors.type}
                                </Body>
                            )}
                        </View>
                        
                        {/* Note field */}
                        <FormInput
                            label="Poznámka"
                            value={formData.note || ''}
                            onChange={(value) => handleChange("note", value)}
                            placeholder="Ďalšie informácie..."
                            error={errors.note}
                            fieldName="note"
                            focusedField={focusedField}
                            setFocusedField={setFocusedField}            
                            multiline
                            numberOfLines={3}
                        />
                
                </View>
            </KeyboardAvoidingView>
            
            {/* Submit button */}
            <View className="absolute bottom-4 left-0 right-0 items-center">
                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={handleSubmit}
                    disabled={loading}
                    className="border bg-blue-600 rounded-2xl items-center py-5 px-12 ">
                    <Body className="color-primary font-bold">
                        {mode === "create" ? (loading ? "Vytvaram..." : "Vytvoriť klienta") : (loading ? "Upravujem..." : "Upraviť klienta")}
                    </Body>
                </TouchableOpacity>
            </View>
        </View>
    )
}