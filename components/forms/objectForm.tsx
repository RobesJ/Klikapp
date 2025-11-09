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

interface Object {
    id?: string;
    client_id?: string,
    address: string | null;
    placement: string | null;
    appliance: string | null;
    note: string | null;
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

interface Chimney {
    id: string;
    type: string;
    labelling: string | null;
}

interface ObjectWithRelations {
    object: Object;
    client: Client;
    chimneys: Chimney[];
}

interface ObjectFormProps{
    mode: "create" | "edit";
    initialData?: ObjectWithRelations;
    onSuccess?: (object: Object) => void;
    preselectedClient?: Client;
}

export default function ObjectForm({ mode, initialData, onSuccess, preselectedClient} : ObjectFormProps) {

    const [formData, setFormData] = useState<Object>({
        client_id: initialData?.object.client_id || '',
        address: initialData?.object.address || '',
        placement: initialData?.object.placement || '',
        appliance: initialData?.object.appliance || '',
        note: initialData?.object.note || '',
    });

    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const [clients, setClients] = useState<Client[]>([]);
    const [loadingClients, setLoadingClients] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showClientModal, setShowClientModal] = useState(false);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [timerId, setTimerId] = useState<number>();

    const [searchQueryChimney, setSearchQueryChimney] = useState('');
    const [showChimneyModal, setShowChimneyModal] = useState(false);
    const [selectedChimneys, setSelectedChimneys] = useState<Chimney[]>([]);
    const [allChimneyTypes, setAllChimneyTypes] = useState<Chimney[]>([]);
    const [filteredChimneyTypes, setFilteredChimneyTypes] = useState<Chimney[]>([]);
   

    useEffect(() => {
        fetchChimneyTypes();
        if (initialData){
            setFormData({
                client_id: initialData?.object.client_id || '',
                address: initialData?.object.address || '',
                placement: initialData?.object.placement || '',
                appliance: initialData?.object.appliance || '',
                note: initialData?.object.note || '',
            });

            if (initialData.client){
                setSelectedClient(initialData.client);
            }

            if (preselectedClient){
                setSelectedClient(preselectedClient);
            }
            if (initialData.chimneys){
                setSelectedChimneys(initialData.chimneys);
            }
        }
        else if (preselectedClient){
            setSelectedClient(preselectedClient);
            setFormData(prev => ({...prev, client_id: preselectedClient.id}));
        }
    }, [initialData, preselectedClient]);
    
    const handleChange = (field: keyof Object, value: string) => {
        setFormData(prev => ({...prev, [field]: value}));
        if(errors[field]){
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    async function fetchChimneyTypes() {
        try{
            const {data, error} = await supabase
                .from("chimney_types")
                .select('*')
                .order("type");

            if (error) throw error;
            if (data) {
                setAllChimneyTypes(data);
                setFilteredChimneyTypes(data);
            }
        }
        catch (error: any){
            console.error("Error fetching chimneys: ", error);
        }
    }
    const clientIsPreselected = () : boolean => {
        if (preselectedClient)
            return true;
        return false;
    };

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
                .or(`name.ilike.%${query}%,phone.ilike.%${query}%`)
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

    const handleSearchChimney = (text: string) => {
        setSearchQueryChimney(text);
        
        if (text.trim().length === 0){
            setFilteredChimneyTypes(allChimneyTypes);
        }
        else{
            const filteredChimneyTypes = allChimneyTypes.filter(chimney =>
                chimney.type.toLowerCase().includes(text.toLowerCase()) ||
                (chimney.labelling && chimney.labelling.toLowerCase().includes(text.toLowerCase()) )
            );
            setFilteredChimneyTypes(filteredChimneyTypes);
        }
    
    };

    const handleToggleChimney = (chimney: Chimney) => {
        setSelectedChimneys(prev => {
            // Check if already selected
            const isSelected = prev.some(c => c.id === chimney.id);
            
            if (isSelected) {
                // Remove it
                return prev.filter(c => c.id !== chimney.id);
            } else {
                // Add it
                return [...prev, chimney];
            }
        });
    };

    // Check if a chimney is selected
    const isChimneySelected = (chimneyId: string): boolean => {
        return selectedChimneys.some(c => c.id === chimneyId);
    };

    // Remove a selected chimney
    const handleRemoveChimney = (chimneyId: string) => {
        setSelectedChimneys(prev => prev.filter(c => c.id !== chimneyId));
    };

    const handleAddChimney = () =>{
        setFilteredChimneyTypes(allChimneyTypes);
        setShowChimneyModal(true);
    }

    const handleSubmit = async () => {
        setLoading(true);
        try{
            let objectId: string;
    
            if (mode === "create"){
                const {data: objectData, error: objectError} = await supabase
                .from('objects')
                .insert([formData])
                .select()
                .single();
                
                if (objectError) throw objectError;
                objectId = objectData.id;
    
                // Only insert if there are chimneys selected
                if (selectedChimneys.length > 0) {
                    const chimneyRelations = selectedChimneys.map(chimney => ({
                        object_id: objectId,
                        chimney_type_id: chimney.id,
                    }));
    
                    const { error: chimneysError } = await supabase
                        .from('chimneys')
                        .insert(chimneyRelations);
    
                    if (chimneysError) throw chimneysError;
                }
    
                Alert.alert('Success', 'Objekt bol vytvorený!');
                onSuccess?.(objectData);
            }
            else { 
                const {data: objectData, error: objectError} = await supabase
                .from('objects')
                .update(formData)
                .eq('id', initialData?.object.id)
                .select()
                .single()
    
                if (objectError) throw objectError;
                objectId = objectData.id;
    
                // Delete ALL existing chimneys for this object
                const { error: deleteError } = await supabase
                    .from('chimneys')
                    .delete()
                    .eq('object_id', objectId);
    
                if (deleteError) throw deleteError;
    
                // Insert new chimneys ONLY if there are any selected
                if (selectedChimneys.length > 0) {
                    const chimneyRelations = selectedChimneys.map(chimney => ({
                        object_id: objectId,
                        chimney_type_id: chimney.id
                    }));
    
                    const { error: chimneysError } = await supabase
                        .from('chimneys')
                        .insert(chimneyRelations);
    
                    if (chimneysError) throw chimneysError;
                }
    
                Alert.alert('Úspech', 'Objekt bol upravený!');
                onSuccess?.(objectData);
            }
        }
        catch (error: any){
            console.error("Error saving object: ", error);
            Alert.alert('Error', error.message || "Failed to save object's data");
        }
        finally{
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView>
        <ScrollView>
            {/* header */}
            <View className="flex-1 items-center p-20">
                <Text className="font-bold text-4xl">
                    {mode === "create" ? "Vytvoriť objekt" : "Upraviť objekt"}
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
                            disabled={clientIsPreselected()}
                            >
                            <Text className="color-slate-500">
                                {selectedClient ? selectedClient.name : "Vyberte klienta..."}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* address input*/}
                <View className="mb-3">
                    <Text className="mb-1 ml-1 font-medium">Adresa objektu</Text>
                    <TextInput
                    placeholder="Adresa objektu"
                    value={formData.address || ''}
                     className="border-2 border-gray-300 rounded-xl p-4 bg-white"
                    onChangeText={(value) => handleChange("address", value)}
                    />
                </View>

                {/* Chimneys Field */}
                <View className="mb-4">
                    <Text className="mb-2 ml-1 font-semibold text-gray-700">
                        Komíny <Text className="text-red-500">*</Text>
                    </Text>
                    
                    {/* Selected Chimneys Display */}
                    {selectedChimneys.length > 0 && (
                        <View className="mb-3">
                            {selectedChimneys.map((chimney) => (
                                <View 
                                    key={chimney.id}
                                    className="flex-row items-center justify-between bg-blue-50 rounded-xl p-3 mb-2"
                                >
                                    <View className="flex-1">
                                        <Text className="font-semibold text-blue-900">
                                            {chimney.type}
                                        </Text>
                                        {chimney.labelling && (
                                            <Text className="text-sm text-blue-700">
                                                {chimney.labelling}
                                            </Text>
                                        )}
                                    </View>
                                    <TouchableOpacity
                                        onPress={() => handleRemoveChimney(chimney.id)}
                                        className="w-8 h-8 bg-red-100 rounded-full items-center justify-center ml-2"
                                    >
                                        <Text className="text-red-600 font-bold">✕</Text>
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>
                    )}
                    {/* Add Chimney Button */}
                    <TouchableOpacity
                        onPress={() => handleAddChimney()}
                        className={`border-2 ${errors.chimneys ? 'border-red-400' : 'border-gray-300'} bg-white rounded-xl p-4`}
                    >
                        <Text className="text-blue-600 font-semibold text-center">
                            + Pridať komín
                        </Text>
                    </TouchableOpacity>
                    {errors.chimneys && (
                        <Text className="text-red-500 text-xs mt-1 ml-1">
                            {errors.chimneys}
                        </Text>
                    )}
                </View>

                {/* placement input*/}
                <View className="mb-3">
                    <Text className="mb-1 ml-1 font-medium">Umiestnenie spotrebiča</Text>
                    <TextInput
                    placeholder="Email"
                    value={formData.placement || ''}
                    className="border-2 border-gray-300 rounded-xl p-4 bg-white"
                    onChangeText={(value) => handleChange("placement", value)}
                    ></TextInput>
                </View>

                {/* appliance input*/}
                <View className="mb-3">
                    <Text className="mb-1 ml-1 font-medium">Druh spotrebiča</Text>
                    <TextInput
                    placeholder="Telefonne cislo"
                    value={formData.appliance || ''}
                    className="border-2 border-gray-300 rounded-xl p-4 bg-white"
                    onChangeText={(value) => handleChange("appliance", value)}
                    ></TextInput>
                </View>

                {/* note input*/}
                <View className="mb-3">
                    <Text className="mb-1 ml-1 font-medium">Poznámka</Text>
                    <TextInput
                    placeholder="Poznamka"
                    value={formData.note || ''}
                    className="border-2 border-gray-300 rounded-xl p-4 bg-white"
                    onChangeText={(value) => handleChange("note", value)}
                    ></TextInput>
                </View>
            </View>

            {/* submit button */}
            <View className="flex-1 mt-16 border bg-slate-600 rounded-2xl items-center py-5 mx-24">
                <TouchableOpacity
                    onPress={handleSubmit}
                    disabled={loading}>
                    <Text className="color-primary font-bold">
                        {mode === "create" ? "Vytvoriť objekt" : "Upraviť objekt"}
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
        
            {/* Chimney Selection Modal */}
            <Modal
                visible={showChimneyModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowChimneyModal(false)}
            >
                <View className="flex-1 bg-black/50 justify-end">
                    <View className="bg-white rounded-t-3xl h-3/4">
                        <View className="p-6 border-b border-gray-200">
                            <View className="flex-row items-center justify-between mb-4">
                                <View className="flex-1">
                                    <Text className="text-xl font-bold">Vyberte komíny</Text>
                                    <Text className="text-sm text-gray-500">
                                        {selectedChimneys.length} vybraných
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    onPress={() => setShowChimneyModal(false)}
                                    className="w-8 h-8 bg-gray-100 rounded-full items-center justify-center"
                                >
                                    <Text className="text-gray-600">✓</Text>
                                </TouchableOpacity>
                            </View>
                            <TextInput
                                placeholder="Hľadať komín (ISO hodnota, typ...)..."
                                value={searchQueryChimney}
                                onChangeText={handleSearchChimney}
                                className="bg-gray-100 rounded-xl p-4"
                            />
                        </View>

                        {filteredChimneyTypes.length === 0 ? (
                            <View className="flex-1 items-center justify-center">
                                <Text className="text-6xl mb-4">🔍</Text>
                                <Text className="text-gray-500">Žiadne komíny nenájdené</Text>
                            </View>
                        ) : (
                            <FlatList
                                data={filteredChimneyTypes}
                                keyExtractor={(item) => item.id}
                                renderItem={({ item }) => {
                                    const selected = isChimneySelected(item.id);
                                    return (
                                        <TouchableOpacity
                                            onPress={() => handleToggleChimney(item)}
                                            className={`px-6 py-4 border-b border-gray-100 ${selected ? 'bg-blue-50' : ''}`}
                                        >
                                            <View className="flex-row items-center justify-between">
                                                <View className="flex-1">
                                                    <Text className="text-base font-semibold text-gray-900">
                                                        {item.type}
                                                    </Text>
                                                    {item.labelling && (
                                                        <Text className="text-sm text-gray-500 mt-1">
                                                            {item.labelling}
                                                        </Text>
                                                    )}
                                                </View>
                                                {selected && (
                                                    <View className="w-6 h-6 bg-blue-600 rounded-full items-center justify-center">
                                                        <Text className="text-white text-xs">✓</Text>
                                                    </View>
                                                )}
                                            </View>
                                        </TouchableOpacity>
                                    );
                                }}
                            />
                        )}
                    </View>
                </View>
            </Modal>
        </KeyboardAvoidingView>
    )
}