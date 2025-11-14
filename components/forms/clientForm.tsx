import { supabase } from "@/lib/supabase";
import { Client } from "@/types/generics";
import { useEffect, useState } from "react";
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";


interface ClientFormProps{
    mode: "create" | "edit";
    initialData?: Client;
    onSuccess?: (client: Client) => void;
    onCancel?: () => void;
}

export default function ClientForm({ mode, initialData, onSuccess, onCancel} : ClientFormProps) {

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

    const [addressSearch, setAddressSearch] = useState('');
    const [addressSuggestions, setAddressSuggestions] =  useState<any[]>([]);
    const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
    const [searchingAddress, setSearchingAddress] = useState(false);
    const API_KEY = process.env.EXPO_PUBLIC_MAPS_API_KEY;
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

    const validate =() : boolean => {
        const newErrors : Record<string, string> = {};

        if(!formData.name){
            newErrors.name = "Meno je povinna polozka!";
        }

        if(!formData.address){
            newErrors.address = "Adresa je povinna polozka!";
        }

        if(!formData.phone){
            newErrors.phone = "Telefonne cislo je povinna polozka!";
        }

        if(!formData.type){
            newErrors.type = "Typ klienta je povinna polozka!";
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
                Alert.alert('Success', 'Client created successfully!');
                onSuccess?.(data);
            }
            else { 
                const {data, error} = await supabase
                .from('clients')
                .update(formData)
                .eq('id', initialData?.id)
                .select()
                .single();

                if (error) throw error;
                Alert.alert('Success', 'Client updated successfully!');
                onSuccess?.(data);
            }
        }
        catch (error: any){
            console.error("Error saving client: ", error);
            Alert.alert('Error', error.message || "Failed to save client's data");
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
            if (types.includes('sublocality')) {
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
        <ScrollView>
            <View className="flex-1 items-center p-20">
                <Text className="font-bold text-4xl">
                    {mode === "create" ? "Vytvoriť klienta" : "Upraviť klienta"}
                </Text>
            </View>
            <View className="flex-1 justify-center px-10">
                <View className="mb-3">
                    <Text className="mb-1 ml-1">Meno klienta</Text>
                    <TextInput
                    placeholder="Meno a priezvisko / Nazov firmy"
                    value={formData.name}
                    className="border-2 border-gray-300 rounded-xl p-4 bg-white"
                    onChangeText={(value) => handleChange("name", value)}
                    autoCapitalize="words"
                    />
                    {errors.name && (
                        <Text className='text-red-500 font-semibold ml-2 mt-1'>
                            {errors.name}
                        </Text>
                    )}
                </View>
                <View className="mb-3">
                    <Text className="mb-1 ml-1">Email klienta</Text>
                    <TextInput
                    placeholder="Email"
                    value={formData.email || ''}
                    className="border-2 border-gray-300 rounded-xl p-4 bg-white"
                    onChangeText={(value) => handleChange("email", value)}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    ></TextInput>
                    {errors.email && (
                        <Text className='text-red-500 font-semibold ml-2 mt-1'>
                            {errors.email}
                        </Text>
                    )}
                </View>
                <View className="mb-3">
                    <Text className="mb-1 ml-1">Telefonne cislo</Text>
                    <TextInput
                    placeholder="Telefonne cislo"
                    value={formData.phone || ''}
                    className="border-2 border-gray-300 rounded-xl p-4 bg-white"
                    onChangeText={(value) => handleChange("phone", value)}
                    keyboardType="phone-pad"
                    ></TextInput>
                    {errors.phone && (
                        <Text className='text-red-500 font-semibold ml-2 mt-1'>
                            {errors.phone}
                        </Text>
                    )}
                </View>

                {/* address input*/}               
                <View className="mb-3">
                    <Text className="mb-1 ml-1 font-medium">Adresa objektu</Text>
                    <View>
                        <TextInput
                            placeholder="Začnite písať adresu..."
                            value={addressSearch || formData.address || ''}
                            onChangeText={searchGoogleAddress}
                            className="border-2 border-gray-300 rounded-xl p-4 bg-white"
                        />

                        {searchingAddress && (
                            <View className="absolute right-4 top-4">
                                <Text className="text-gray-400">🔍</Text>
                            </View>
                        )}

                        {showAddressSuggestions && addressSuggestions.length > 0 && (
                            <View className="border-2 border-gray-300 rounded-xl mt-2 bg-white max-h-60">
                                <ScrollView>
                                    {addressSuggestions.map((item) => (
                                        <TouchableOpacity
                                            key={item.place_id}
                                            onPress={() => selectAddress(item)}
                                            className="p-4 border-b border-gray-100"
                                        >
                                            <Text className="text-base">{item.description}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        )}
                    </View>
                </View>

                <View className="mb-3">
                    <Text className="mb-1 ml-1">Typ klienta</Text>
                    <View className="flex-row">
                        <TouchableOpacity
                            onPress={() => handleSelectedType("Fyzicka osoba")}
                            className={`border-2 ${selectedType === "Fyzicka osoba" ? "border-gray-900 bg-amber-500" : "border-gray-300 bg-white"} rounded-xl p-4 mr-3 w-36 items-center`}
                        >
                            <Text  className={`${selectedType === "Fyzicka osoba" ? "font-semibold" : "font-normal"}`}>Fyzicka osoba</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            className={`border-2 ${selectedType === "Pravnicka osoba" ? "border-gray-900 bg-amber-500" : "border-gray-300 bg-white"} rounded-xl p-4 w-36 items-center`}
                            onPress={() => handleSelectedType("Pravnicka osoba")}
                        >
                            <Text  className={`${selectedType === "Pravnicka osoba" ? "font-semibold" : "font-normal"}`}>Pravnicka osoba</Text>
                        </TouchableOpacity>  
                    </View>
                    {errors.type && (
                        <Text className='text-red-500 font-semibold ml-2 mt-1'>
                            {errors.type}
                        </Text>
                    )}
                </View>

                <View className="mb-3">
                    <Text className="mb-1 ml-1">Poznamka</Text>
                    <TextInput
                    placeholder="Poznamka"
                    value={formData.note || ''}
                    className="border-2 border-gray-300 rounded-xl p-4 bg-white"
                    onChangeText={(value) => handleChange("note", value)}
                    ></TextInput>
                </View>
            </View>

            <View className="flex-1 mt-16 border bg-slate-600 rounded-2xl items-center py-5 mx-24">
                <TouchableOpacity
                    onPress={handleSubmit}
                    disabled={loading}>
                    <Text className="color-primary font-bold">
                        {mode === "create" ? "Vytvoriť klienta" : "Upraviť klienta"}
                    </Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    )
}