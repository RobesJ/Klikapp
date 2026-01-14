import { useGoogleSearchAddress } from "@/hooks/useGoogleAddressSearch";
import { supabase } from "@/lib/supabase";
import { useNotificationStore } from "@/store/notificationStore";
import { Client } from "@/types/generics";
import { validateAndNormalizePhone } from "@/utils/phoneInputValidation";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { AsYouType } from "libphonenumber-js";
import { useCallback, useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, View } from "react-native";
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
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [selectedType, setSelectedType] = useState('');
    const [focusedField, setFocusedField] = useState<string | null>(null);
    
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
    } = useGoogleSearchAddress<Omit<Client,"id">>(handleChange);

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

    const validate = () : boolean => {
        const newErrors : Record<string, string> = {};
        const updates: Partial<typeof formData> = {};

        if(!formData.name.trim()){
            newErrors.name = "Meno je povinná položka!";
        }
        else {
            const normalizedName = formData.name
                .trim()
                .replace(/\s+/g, ' ')                           // Normalize spaces: "   " → " "            
                .replace(/\s*,\s*/g, ', ')                      // Normalize commas: "ABC,s.r.o." → "ABC, s.r.o."
                .replace(/\bs\.?\s*r\.?\s*o\.?\b/gi, 's.r.o.')  // Normalize s.r.o variations: "sro" → "s.r.o."
                .replace(/\ba\.?\s*s\.?\b/gi, 'a.s.');          // Normalize a.s. variations: "as" → "a.s."
            if (normalizedName !== formData.name){
                updates.name = normalizedName;
            }
        }

        if(formData.email && formData.email.trim() !== ''){
            const normalizedEmail = formData.email.trim().toLowerCase();
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
                newErrors.email = 'Neplatný formát emailu!';
            }
            else if (normalizedEmail !== formData.email){
                updates.email = normalizedEmail;
                updates.unformatted_email = formData.email.trim();
            }
        }

        if(!formData.address?.trim()){
            newErrors.address = "Adresa je povinná položka!";
        }

        if(!formData.phone || formData.phone.trim() === ' '){
            newErrors.phone = "Telefonné číslo je povinná položka!";
        }
        else {
            const phoneValidation = validateAndNormalizePhone(formData.phone);
            if (!phoneValidation.valid && phoneValidation.error ){
                newErrors.phone = phoneValidation.error;
            }
            else if (phoneValidation.valid && phoneValidation.normalized){
                updates.phone = phoneValidation.normalized;
            }
        }

        if(!formData.type){
            newErrors.type = "Typ klienta je povinná položka!";
        }

        if (Object.keys(updates).length > 0) {
           setFormData(prev => ({ ...prev, updates }));
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    async function checkDuplicateWithFuzzy(name: string, phone: string | null, email: string | null, place_id: string | null) {
        const { data, error } = await supabase.rpc('find_similar_clients', {
            p_name: name,
            p_phone: phone,
            p_place_id: place_id,
            p_email: email,
            similarity_threshold: 0.4
        });

        if (error) throw error;

        if (data && data.length > 0) {
            const duplicateInfoWarn: string [] = [];
            const duplicateInfoQuit: string [] = [];
            data.forEach((match: any) => {
                if(match.match_type === "exact_email"){
                    duplicateInfoQuit.push(`${match.name} (rovnaký email)`);
                }
                else if(match.match_type === "exact_phone"){
                    duplicateInfoQuit.push(`${match.name} (rovnaké číslo)`);
                }
                else if(match.match_type === "exact_address"){
                    duplicateInfoWarn.push(`${match.name} (rovnaká adresa)`);
                }
                else if(match.match_type === "name_similarity"){
                    duplicateInfoWarn.push(`${match.name} (podobné meno)`);
                }
            });
            return {
              isDuplicate: true,
              duplicateInfoQuit,
              duplicateInfoWarn
            };
        }
        return { isDuplicate: false, duplicateInfoQuit: [], duplicateInfoWarn: []};
    };

    const handleSubmit = useCallback(async () => {
        
        if(!validate()){
            return;
        }

        setLoading(true);
        try{
            if (mode === "create"){
                const result = await checkDuplicateWithFuzzy(formData.name, formData.phone, formData.email, formData.place_id);
                if (result.isDuplicate){
                    if(result.duplicateInfoQuit.length > 0){
                        const duplicateInfo = result.duplicateInfoQuit.join('\n'); 
                        Alert.alert(
                            "Klient existuje",
                            `V databáze existuje klient s rovnakým číslom alebo emailom:\n${duplicateInfo}`,
                            [
                                { 
                                    text: 'Zrusit', 
                                    style: "cancel",
                                    onPress:  () => {
                                        setLoading(false);
                                  }
                                }
                            ]
                        );
                        return;
                    }

                    else if (result.duplicateInfoWarn.length > 0){
                        const duplicateInfo = result.duplicateInfoWarn.join('\n'); 
                        Alert.alert(
                            "Nájdená duplicita v mene alebo adrese",
                            `Podobní klienti: ${duplicateInfo}\n\nChcete pokračovať?`,
                            [
                                { 
                                    text: 'Nie', 
                                    style: "cancel",
                                    onPress:  () => {
                                        setLoading(false);
                                  }
                                },
                                {
                                    text: 'Áno',
                                    style: 'default',
                                    onPress: async () => {
                                        try {
                                            const {data, error} = await supabase
                                            .from('clients')
                                            .insert([formData])
                                            .select()
                                            .single();

                                            if (error) throw error;
                                            onSuccess?.(data);
                                        }
                                        catch (error: any){
                                            console.error("Error creating client: ", error);
                                            useNotificationStore.getState().addNotification(
                                                "Nastala chyba pri vytváraní klienta",
                                                'error',
                                                "clientForm",
                                                3000
                                            );
                                        }
                                        finally {
                                            setLoading(false);
                                        }
                                    }
                                }
                            ]
                        );
                        return;
                    }
                }
                const {data, error} = await supabase
                    .from('clients')
                    .insert([formData])
                    .select()
                    .single();
                    
                if (error) throw error;
                onSuccess?.(data);
            }
            else { 
                if (initialData){
                    const {data, error} = await supabase
                    .from('clients')
                    .update(formData)
                    .eq('id', initialData?.id)
                    .select()
                    .single();

                    if (error) throw error;
                    onSuccess?.(data);
                }
            }
        }
        catch (error: any){
            console.error("Error saving client: ", error);
            let message: string = mode === "create" 
             ? "Nastala chyba pri vytváraní klienta"
             : "Nastala chyba pri úprave klienta";

            useNotificationStore.getState().addNotification(
                message,
                'error',
                "clientForm",
                3000
            );
        }
        finally{
            setLoading(false);
        }
    },[initialData, formData, validate, checkDuplicateWithFuzzy]);

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