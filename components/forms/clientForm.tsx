import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";

interface Client {
    id?: string;
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    type: string | null;
    notes: string | null;
}

interface ClientFormProps{
    mode: "create" | "edit";
    initialData?: Client;
    onSuccess?: (client: Client) => void;
    onCancel?: () => void;
}

export default function ClientForm({ mode, initialData, onSuccess, onCancel} : ClientFormProps) {

    const [formData, setFormData] = useState<Client>({
        name: initialData?.name || '',
        email: initialData?.email || '',
        phone: initialData?.phone || '',
        address: initialData?.address || '',
        type: initialData?.type || "",
        notes: initialData?.notes || '',
    });

    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [selectedType, setSelectedType] = useState('');

    useEffect(() => {
        if (initialData){
            setFormData({
                name: initialData.name || "",
                email: initialData?.email || '',
                phone: initialData?.phone || '',
                address: initialData?.address || '',
                type: initialData?.type || "",
                notes: initialData?.notes || '',
            });
            
            if(initialData.type != null){
                setSelectedType(initialData.type);
            }
        }
    }, [initialData]);
    
    const handleChange = (field: keyof Client, value: string) => {
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

        if(!formData.email){
            newErrors.email = "Email je povinna polozka!";
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
                .single()

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

                <View className="mb-3">
                    <Text className="mb-1 ml-1">Adresa</Text>
                    <TextInput
                    placeholder="Adresa"
                    value={formData.address || ''}
                    className="border-2 border-gray-300 rounded-xl p-4 bg-white"
                    onChangeText={(value) => handleChange("address", value)}
                    ></TextInput>
                    {errors.address && (
                        <Text className='text-red-500 font-semibold ml-2 mt-1'>
                            {errors.address}
                        </Text>
                    )}
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
                    value={formData.notes|| ''}
                    className="border-2 border-gray-300 rounded-xl p-4 bg-white"
                    onChangeText={(value) => handleChange("notes", value)}
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