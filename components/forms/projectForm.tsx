import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import {
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import ModernDatePicker from "../modernDatePicker";

interface Project {
    id?: string;
    client_id?: string;
    type: string | null;
    state: string | null;
    scheduled_date: string | null;
    start_date: string | null;
    completion_date: string | null;
    notes: string | null;
}

interface Client {
    id?: string;
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    type: string | null;
    notes: string | null;
}

interface ProjectFormProps{
    mode: "create" | "edit";
    initialData?: Project;
    onSuccess?: (project: Project) => void;
    onCancel?: () => void;
}

export default function ProjectForm({ mode, initialData, onSuccess, onCancel} : ProjectFormProps) {

    const [formData, setFormData] = useState<Project>({
        client_id: initialData?.client_id || '',
        type: initialData?.type || '',
        state: initialData?.state || '',
        scheduled_date: initialData?.scheduled_date || '',
        start_date: initialData?.start_date || '',
        completion_date: initialData?.completion_date || '',
        notes: initialData?.notes || '',
    });

    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const [clients, setClients] = useState<Client[]>([]);
    const [loadingClients, setLoadingClients] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showClientModal, setShowClientModal] = useState(false);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [timerId, setTimerId] = useState<number>();

    const [selectedType, setSelectedType] = useState("");
    const [selectedState, setSelectedState] = useState("");
    const [scheduledDate, setScheduledDate] = useState<Date | null>(null);
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [completionDate, setCompletionDate] = useState<Date | null>(null);

    useEffect(() => {
        if (initialData){
            setFormData({
                client_id: initialData?.client_id || '',
                type: initialData?.type || '',
                state: initialData?.state || '',
                scheduled_date: initialData?.scheduled_date || '',
                start_date: initialData?.start_date || '',
                completion_date: initialData?.completion_date || '',
                notes: initialData?.notes || '',
            });

            if (initialData.client_id){
                fetchClient(initialData.client_id);
            }
        }
    }, [initialData]);
    
    const handleChange = (field: keyof Project, value: string) => {
        setFormData(prev => ({...prev, [field]: value}));
        if(errors[field]){
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    async function fetchClient(clientId: string) {
        try{
            const {data, error} = await supabase
                .from("clients")
                .select("*")
                .eq("id", clientId)
                .single();

            if (error) throw error;
            if (data){
                setSelectedClient(data);
                setSearchQuery(data.name)
            }
        }
        catch (error: any){
            console.error("Error fetching client: ", error);
        }
    }
     

    const handleSearchClient = (text: string) => {
        setSearchQuery(text);
        
        if(timerId) {
            clearTimeout(timerId);
        }
        const timer = window.setTimeout(() => {
            searchClient(searchQuery);
        }, 300);

        setTimerId(timer);
    };

    async function searchClient(query: string) {
        if (query.trim().length < 2){
            setClients([]);
            return;
        }
        setLoadingClients(true);
        try{
            const { data, error } = await supabase
                .from("clients")
                .select("*")
                .or(`name.ilike.%${query}%`)
                .order("name")
                .limit(20);

            if (error) throw error;
            setClients(data || []);
        } 
        catch(error: any){
            console.error("Chyba: ", error.message);
            setClients([]);
        }
        finally{
            setLoadingClients(false);
        }
    }

    const handleSelectedClient = (client: Client) => {
        setSelectedClient(client);
        setSearchQuery(client.name);
        setShowClientModal(false);
        setFormData(prev => ({ ...prev, client_id: client.id}));

        if (errors.client_id){
            setErrors(prev => {
                const newErrors = {...prev};
                delete newErrors.client_id;
                return newErrors;
            });
        }
    };

    const handleSubmit = async () => {
        setLoading(true);
        try{
            if (mode === "create"){
                const {data: projectData, error: projectError} = await supabase
                .from('projects')
                .insert([formData])
                .select()
                .single();
                
                if (projectError) throw projectError;
               
                Alert.alert('Success', 'Client created successfully!');
                onSuccess?.(projectData);
            }
            else { 
                const {data: projectData, error: projectError} = await supabase
                .from('projects')
                .update(formData)
                .eq('id', initialData?.id)
                .select()
                .single()

                if (projectError) throw projectError;

                Alert.alert('Úspech', 'Objekt bol upravený!');
                onSuccess?.(projectData);
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
    };

    const handleSelectedState = (state: string) => {
        setSelectedState(state);
    };

    return (
        <KeyboardAvoidingView>
        <ScrollView>
            {/* header */}
            <View className="flex-1 items-center p-20">
                <Text className="font-bold text-4xl">
                    {mode === "create" ? "Vytvoriť projekt" : "Upraviť projekt"}
                </Text>
            </View>
            {/* form */}
            <View className="flex-1 justify-center px-10">
                {/* client input*/}
                <View className="mb-3">
                    <Text className="mb-1 ml-1 font-medium">Klient</Text>
                    <View className="border-2 border-gray-300 rounded-xl p-4 bg-white">
                        <TouchableOpacity
                            onPress={() => setShowClientModal(true)}
                            activeOpacity={0.8}
                            >
                            <Text className="color-slate-500">
                                {selectedClient ? selectedClient.name : "Vyberte klienta..."}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* State field*/}
                <View className="mb-3">
                    <Text className="mb-1 ml-1 font-medium">Stav projektu</Text>
                    <View className="flex-row">
                    <TouchableOpacity
                        className={`border-2 ${selectedState === "aktivny" ? "border-gray-900 bg-yellow-400" : "border-gray-300 bg-white"} rounded-xl p-4`}
                        onPress={()=> handleSelectedState("aktivny")}
                    >
                        <Text>Aktivny</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        className={`border-2 ${selectedState === "ukonceny" ? "border-gray-900 bg-yellow-400" : "border-gray-300 bg-white"} rounded-xl p-4`}
                        onPress={()=> handleSelectedState("ukonceny")}
                    >
                        <Text>Ukonceny</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        className={`border-2 ${selectedState === "prebieha" ? "border-gray-900 bg-yellow-400" : "border-gray-300 bg-white"} rounded-xl p-4`}
                        onPress={()=> handleSelectedState("prebieha")}
                    >
                        <Text>Prebieha</Text>
                    </TouchableOpacity>
                    </View>
                </View>

                {/* Type field*/}
                <View className="mb-3">
                    <Text className="mb-1 ml-1 font-medium">Typ projektu</Text>
                    <View className="flex-row">
                        <TouchableOpacity
                            className={`border-2 ${selectedType === "cistenie" ? "border-gray-900 bg-yellow-400" : "border-gray-300 bg-white"} rounded-xl p-4`}
                            onPress={() => handleSelectedType("cistenie")}
                        >
                            <Text
                                className={`${selectedType === "cistenie" ? "font-semibold" : "font-normal"}`}
                            >
                                Cistenie
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            className={`border-2 ${selectedType === "revizia" ? "border-gray-900 bg-amber-500" : "border-gray-300 bg-white"} rounded-xl p-4`}
                            onPress={() => handleSelectedType("revizia")}
                        >
                            <Text
                                className={`${selectedType === "revizia" ? "font-semibold" : "font-normal"}`}
                            >
                                Revizia
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            className={`border-2 ${selectedType === "obhliadka" ? "border-gray-900 bg-green-500" : "border-gray-300 bg-white"} rounded-xl p-4`}
                            onPress={() => handleSelectedType("obhliadka")}
                        >
                            <Text
                                className={`${selectedType === "obhliadka" ? "font-semibold" : "font-normal"}`}
                            >
                                Obhliadka
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            className={`border-2 ${selectedType === "montaz" ? "border-gray-900 bg-blue-400" : "border-gray-300 bg-white"} rounded-xl p-4`}
                            onPress={() => handleSelectedType("montaz")}
                        >
                            <Text
                                className={`${selectedType === "montaz" ? "font-semibold" : "font-normal"}`}
                            >
                                    Montaz
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* appliance input*/}
                <View className="mb-3">
                    <Text className="mb-1 ml-1 font-medium">Planovany den zacatia projektu</Text>
                    <ModernDatePicker
                        value={scheduledDate}
                        onChange={setScheduledDate}
                        error={errors.scheduledDate}
                    />
                </View>

                {/* appliance input*/}
                <View className="mb-3">
                    <Text className="mb-1 ml-1 font-medium">Den zacatia projektu</Text>
                    <ModernDatePicker
                        value={startDate}
                        onChange={setStartDate}
                        error={errors.startDate}
                    />
                </View>
                {/* appliance input*/}
                <View className="mb-3">
                    <Text className="mb-1 ml-1 font-medium">Den ukoncenia projektu</Text>
                    <ModernDatePicker
                        value={completionDate}
                        onChange={setCompletionDate}
                        error={errors.completionDate}
                    />
                </View>

                {/* note input*/}
                <View className="mb-3">
                    <Text className="mb-1 ml-1 font-medium">Poznámka</Text>
                    <TextInput
                    placeholder="Poznamka"
                    value={formData.notes || ''}
                    className="border-2 border-gray-300 rounded-xl p-4 bg-white"
                    onChangeText={(value) => handleChange("notes", value)}
                    ></TextInput>
                </View>
            </View>

            {/* submit button */}
            <View className="flex-1 mt-16 border bg-slate-600 rounded-2xl items-center py-5 mx-24">
                <TouchableOpacity
                    onPress={handleSubmit}
                    disabled={loading}>
                    <Text className="color-primary font-bold">
                        {mode === "create" ? "Vytvoriť projekt" : "Upraviť projekt"}
                    </Text>
                </TouchableOpacity>
            </View>
        </ScrollView>

        {/* client modal window, searchbar for clients */}
        <Modal
                visible={showClientModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowClientModal(false)}
            >
                <View className="flex-1 bg-black/50 justify-end">
                    <View className="bg-white rounded-t-3xl h-3/4">
                        {/* Header */}
                        <View className="p-6 border-b border-gray-200">
                            <View className="flex-row items-center justify-between mb-4">
                                <Text className="text-xl font-bold">Vyberte klienta</Text>
                                <TouchableOpacity
                                    onPress={() => setShowClientModal(false)}
                                    className="w-8 h-8 bg-gray-100 rounded-full items-center justify-center"
                                >
                                    <Text className="text-gray-600">✕</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Search Input */}
                            <TextInput
                                placeholder="Hľadať klienta..."
                                value={searchQuery}
                                onChangeText={handleSearchClient}
                                className="bg-gray-100 rounded-xl p-4"
                                autoFocus
                            />
                        </View>

                        {/* Results List */}
                        {loadingClients ? (
                            <View className="flex-1 items-center justify-center">
                                <Text className="text-gray-500">Vyhľadávám...</Text>
                            </View>
                        ) : searchQuery.length < 2 ? (
                            <View className="flex-1 items-center justify-center">
                                <Text className="text-6xl mb-4">🔍</Text>
                                <Text className="text-gray-500">
                                    Zadajte aspoň 2 znaky
                                </Text>
                            </View>
                        ) : clients.length === 0 ? (
                            <View className="flex-1 items-center justify-center">
                                <Text className="text-gray-500">
                                    Žiadni klienti nenájdení
                                </Text>
                            </View>
                        ) : (
                            <FlatList
                                data={clients}
                                keyExtractor={(item) => item.id ?? Math.random().toString()}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        onPress={() => handleSelectedClient(item)}
                                        className="px-6 py-4 border-b border-gray-100"
                                    >
                                        <Text className="text-base font-semibold text-gray-900">
                                            {item.name}
                                        </Text>
                                        {item.phone && (
                                            <Text className="text-sm text-gray-500 mt-1">
                                                📱 {item.phone}
                                            </Text>
                                        )}
                                    </TouchableOpacity>
                                )}
                            />
                        )}
                    </View>
                </View>
            </Modal>
        </KeyboardAvoidingView>
    )
}