import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";

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

    const handleSubmit = async () => {
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

    return (
        <KeyboardAvoidingView>
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
                     className="border border-gray-400 rounded-lg p-3"
                    onChangeText={(value) => handleChange("name", value)}
                    />
                </View>
                <View className="mb-3">
                    <Text className="mb-1 ml-1">Email klienta</Text>
                    <TextInput
                    placeholder="Email"
                    value={formData.email || ''}
                    className="border border-gray-400 rounded-lg p-3"
                    onChangeText={(value) => handleChange("email", value)}
                    ></TextInput>
                </View>
                <View className="mb-3">
                    <Text className="mb-1 ml-1">Telefonne cislo</Text>
                    <TextInput
                    placeholder="Telefonne cislo"
                    value={formData.phone || ''}
                    className="border border-gray-400 rounded-lg p-3"
                    onChangeText={(value) => handleChange("phone", value)}
                    ></TextInput>

                </View>
                <View className="mb-3">
                    <Text className="mb-1 ml-1">Adresa</Text>
                    <TextInput
                    placeholder="Adresa"
                    value={formData.address || ''}
                    className="border border-gray-400 rounded-lg p-3"
                    onChangeText={(value) => handleChange("address", value)}
                    ></TextInput>
                </View>
                <View className="mb-3">
                    <Text className="mb-1 ml-1">Typ klienta</Text>
                    <TextInput
                    placeholder="Typ klienta"
                    value={formData.type || ''}
                    className="border border-gray-400 rounded-lg p-3"
                    onChangeText={(value) => handleChange("type", value)}
                    ></TextInput>
                </View>
                <View className="mb-3">
                    <Text className="mb-1 ml-1">Poznamka</Text>
                    <TextInput
                    placeholder="Poznamka"
                    value={formData.notes|| ''}
                    className="border border-gray-400 rounded-lg p-3"
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
        </KeyboardAvoidingView>
    )
}