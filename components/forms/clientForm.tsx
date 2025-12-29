import { supabase } from "@/lib/supabase";
import { useNotificationStore } from "@/store/notificationStore";
import { Client } from "@/types/generics";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, View } from "react-native";
import { FormInput } from "../formInput";
import { Body, Heading1 } from "../typografy";

interface ClientFormProps{
    mode: "create" | "edit";
    initialData?: Client;
    onSuccess?: (client: Client) => void;
}

export default function ClientForm({ mode, initialData, onSuccess} : ClientFormProps) {

    const [formData, setFormData] = useState<Omit<Client, "id"> & {id?: string}>({
        name: initialData?.name || '',
        email: initialData?.email || '',
        phone: initialData?.phone || '',
        address: initialData?.address || '',
        city: initialData?.city || '',
        streetNumber: initialData?.streetNumber || '',
        country: initialData?.country || '',
        type: initialData?.type || "",
        note: initialData?.note || '',
    });

    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [selectedType, setSelectedType] = useState('');
    const [focusedField, setFocusedField] = useState<string | null>(null);

    const [addressSearch, setAddressSearch] = useState('');
    const [addressSuggestions, setAddressSuggestions] =  useState<any[]>([]);
    const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
    const [searchingAddress, setSearchingAddress] = useState(false);
    const API_KEY = process.env.EXPO_PUBLIC_MAPS_API_KEY;
    const router = useRouter();

    useEffect(() => {
        if (initialData){
            setFormData({
                name: initialData.name || "",
                email: initialData?.email || '',
                phone: initialData?.phone || '',
                address: initialData?.address || '',
                city: initialData?.city || '',
                streetNumber: initialData?.streetNumber || '',
                country: initialData?.country || '',
                type: initialData?.type || "",
                note: initialData?.note || '',
            });
            
            if(initialData.type != null){
                setSelectedType(initialData.type);
            }
        }
    }, [initialData]);
    
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

    const validate = () : boolean => {
        const newErrors : Record<string, string> = {};

        if(!formData.name.trim()){
            newErrors.name = "Meno je povinná položka!";
        }

        if(formData.email){
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
                newErrors.email = 'Neplatný formát emailu!';
            }
        }

        if(!formData.address?.trim()){
            newErrors.address = "Adresa je povinná položka!";
        }

        if(!formData.phone?.trim()){
            newErrors.phone = "Telefonné číslo je povinná položka!";
        }

        if(!formData.type){
            newErrors.type = "Typ klienta je povinná položka!";
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }

    const handleSubmit = async () => {
        
        if(!validate()){
            return;
        }

        setLoading(true);
        try{
            if (mode === "create"){
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
            if(mode === "create"){
                useNotificationStore.getState().addNotification(
                    'Nastala chyba pri vytváraní klienta',
                    'error',
                    3000
                );
            }
            else{
                useNotificationStore.getState().addNotification(
                    'Nastala chyba pri úprave klienta',
                    'error',
                    3000
                );
            }
        }
        finally{
            setLoading(false);
        }
    };

    const handleSelectedType = (type: string) => {
        setSelectedType(type);
        setFormData(prev => ({...prev, type: type}))
    };

    const searchGoogleAddress = async (text: string) => {
        handleChange("address", text);
        setAddressSearch(text);

        if (text.length < 3) {
            setAddressSuggestions([]);
            setShowAddressSuggestions(false);
            return;
        }

        setSearchingAddress(true);
        try{
        
            const response = await fetch(
               `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(text)}&key=${API_KEY}&components=country:sk&language=sk`
            );

            const data = await response.json();
            //console.log(data);
            if (data.predictions) {
                setAddressSuggestions(data.predictions);
                setShowAddressSuggestions(true);
            }
        }
        catch (error: any){
            console.error('Address search error:', error);
        }
        finally{
            setSearchingAddress(false);
        }
    };

    const selectAddress = async (suggestion: any) => {
        const fullAddress = suggestion.description;
        handleChange("address", fullAddress);
        setAddressSearch(fullAddress);
        setShowAddressSuggestions(false);
        
        try {
            const response = await fetch(
                `https://maps.googleapis.com/maps/api/place/details/json?place_id=${suggestion.place_id}&key=${API_KEY}&language=sk`
            );
            const data = await response.json();
            
            if (data.result && data.result.address_components) {
                const components = parseAddressComponents(data.result.address_components);
                console.log('Structured address:', components);
                
                // Update formData with structured data
                setFormData(prev => ({
                    ...prev,
                    address: fullAddress,
                }));
            }
        } catch (error) {
            console.error('Error fetching place details:', error);
        }
    };

    
    function parseAddressComponents(components: any[]) {
        let street: string | null = null;
        let number: string | null = null;

        const address: {
            streetNumber: string | null;
        } = {
            streetNumber: null
        };
    
        components.forEach((component: any) => {
            const types = component.types;
            
            if (types.includes('route')) {
                street = component.long_name;
            }
            if (types.includes('street_number')) {
                number = component.long_name;
            }
            if (types.includes('sublocality') || types.includes('locality')) {
                handleChange("city",component.long_name)
            }
            if (types.includes('country')) {
                handleChange("country",component.long_name)
            }
        });
        
        if (street && number) {
            handleChange("streetNumber",`${street} ${number}`);
        } else if (street) {
            handleChange("streetNumber",street);
        } else if (number) {
            handleChange("streetNumber",number);
        }
        return address;
    };

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
                <View className="flex-1 mb-24 justify-center px-10">
                    <ScrollView 
                      className="flex-1"
                      contentContainerStyle={{paddingHorizontal: 16, paddingTop: 16}}
                    >

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
                            onChange={(value) => handleChange("phone", value)}
                            placeholder="0901 234 567  |  +421 901 234 567"
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
                                    error={errors.phone}
                                    fieldName="address"
                                    focusedField={focusedField}
                                    setFocusedField={setFocusedField}            

                                />
                                {/*
                                <TextInput
                                    placeholder="Začnite písať adresu..."
                                    placeholderTextColor="#ABABAB"
                                    cursorColor="#FFFFFF"
                                    value={addressSearch || formData.address || ''}
                                    onChangeText={searchGoogleAddress}
                                    onFocus={() => setFocusedField('address')}
                                    onBlur={() => setFocusedField(null)}
                                    className={`flex-row items-center border-2 bg-gray-800 rounded-xl px-4 py-4 text-white 
                                        ${focusedField === 'address' ? 'border-blue-500' : 'border-gray-700'}
                                    `}
                                />
                                */}
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
                                    className={`border-2 ${selectedType === "Fyzická osoba" ? "border-gray-300" : "border-gray-700 bg-gray-800"} rounded-xl p-4 mr-3 w-36 items-center`}
                                >
                                    <Body
                                      style={{ color: selectedType === "Fyzická osoba" ? '#FFFFFF' : '#ABABAB' }}
                                      className={`${selectedType === "Fyzická osoba" ? "font-semibold" : "font-normal"}`}
                                    >
                                        Fyzická osoba
                                    </Body>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    className={`border-2 ${selectedType === "Právnická osoba" ? "border-gray-300 " : "border-gray-700 bg-gray-800"} rounded-xl p-4 w-36 items-center`}
                                    onPress={() => handleSelectedType("Právnická osoba")}
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
                    </ScrollView>
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