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

import { Client } from "@/types/generics";
import { ChimneyInput, ChimneyType, Object, ObjectWithRelations } from "@/types/objectSpecific";

interface ObjectFormProps{
    mode: "create" | "edit";
    initialData?: ObjectWithRelations;
    onSuccess?: (object: any) => void;
    preselectedClient?: Client;
}

export default function ObjectForm({ mode, initialData, onSuccess, preselectedClient} : ObjectFormProps) {

    const [formData, setFormData] = useState<Omit<Object, "id"> & {id?: string}>({
        client_id: initialData?.object.client_id || '',
        address: initialData?.object.address || '',
        streetNumber: initialData?.object.streetNumber || '',
        city: initialData?.object.city || '',
        country: initialData?.object.country || ''
    });

    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const [clientSuggestions, setClientSuggetions] = useState<Client[]>([]);
    const [loadingClients, setLoadingClients] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [timerId, setTimerId] = useState<number>();

    const [searchQueryChimney, setSearchQueryChimney] = useState('');
    const [showChimneyModal, setShowChimneyModal] = useState(false);
    const [showChimneyDetailsModal, setShowChimneyDetailsModal] = useState(false);
    const [selectedChimneys, setSelectedChimneys] = useState<ChimneyInput[]>([]);
    const [allChimneyTypes, setAllChimneyTypes] = useState<ChimneyType[]>([]);
    const [filteredChimneyTypes, setFilteredChimneyTypes] = useState<ChimneyType[]>([]);
    const [editingChimney, setEditingChimney] = useState<ChimneyInput | null>(null);
    const [editingChimneyIndex, setEditingChimneyIndex] = useState<number | null>(null);
    
    const [addressSearch, setAddressSearch] = useState('');
    const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
    const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
    const [searchingAddress, setSearchingAddress] = useState(false);
    const API_KEY = process.env.EXPO_PUBLIC_MAPS_API_KEY;

    const [chimneyFormData, setChimneyTypeFormData] = useState<{
        type: string;
        labelling: string;
    }>({
        type: '',
        labelling: ''
    });
    const [showChimneyTypeModal, setshowChimneyTypeModal] = useState(false);

    
    const searchGoogleAddress = async (text: string) => {
        setAddressSearch(text);
        handleChange("address", text);

        if (text.length < 3) {
            setAddressSuggestions([]);
            setShowAddressSuggestions(false);
            return;
        }

        setSearchingAddress(true);
        try {
            const response = await fetch(
                `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(text)}&key=${API_KEY}&components=country:sk&language=sk`
            );
            const data = await response.json();

            if (data.predictions) {
                setAddressSuggestions(data.predictions);
                setShowAddressSuggestions(true);
            }
        } catch (error) {
            console.error('Address search error:', error);
        } finally {
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
               parseAddressComponents(data.result.address_components);
            }
        } catch (error) {
            console.error('Error fetching place details:', error);
        }
    };

    function parseAddressComponents(components: any[]) {
        let street: string | null = null;
        let number: string | null = null;
    
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
    };

    useEffect(() => {
        fetchChimneyTypes();
        if (initialData){
            setFormData({
                client_id: initialData?.object.client_id || '',
                address: initialData?.object.address || '',
                streetNumber: initialData?.object.streetNumber || '',
                city: initialData?.object.city || '',
                country: initialData?.object.country || ''
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
    
    const handleChange = (field: keyof Omit<Object, "id">, value: string) => {
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
            setClientSuggetions([]);
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
            setClientSuggetions(data || []);
        } 
        catch(error: any){
            console.error("Chyba: ", error.message);
            setClientSuggetions([]);
        }
        finally{
            setLoadingClients(false);
        }
    }

    const handleSelectedClient = (client: Client) => {
        setSelectedClient(client);
        setSearchQuery(client.name);
        setClientSuggetions([]);
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

    const handleSelectChimneyType = (chimneyType: ChimneyType) => {
        setEditingChimney({
            chimney_type_id: chimneyType.id,
            placement: '',
            appliance: '',
            note: '',
            chimney_type: chimneyType
        });
        setEditingChimneyIndex(null);
        setShowChimneyModal(false);
        setShowChimneyDetailsModal(true);
    };

    const handleEditChimney = (chimney: ChimneyInput, index: number) => {
        setEditingChimney(chimney);
        setEditingChimneyIndex(index);
        setShowChimneyDetailsModal(true);
    };

    const handleSaveChimneyDetails = () => {
        if (!editingChimney) return;

        if (editingChimneyIndex !== null) {
            // Update existing chimney
            setSelectedChimneys(prev => 
                prev.map((c, i) => i === editingChimneyIndex ? editingChimney : c)
            );
        } else {
            // Add new chimney
            setSelectedChimneys(prev => [...prev, editingChimney]);
        }

        setShowChimneyDetailsModal(false);
        setEditingChimney(null);
        setEditingChimneyIndex(null);
    };

    const handleRemoveChimney = (index: number) => {
        setSelectedChimneys(prev => prev.filter((_, i) => i !== index));
    };

    const handleAddChimney = () => {
        setFilteredChimneyTypes(allChimneyTypes);
        setSearchQueryChimney('');
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
    
                // Insert chimneys with all fields
                if (selectedChimneys.length > 0) {
                    const chimneyData = selectedChimneys.map(chimney => ({
                        object_id: objectId,
                        chimney_type_id: chimney.chimney_type_id,
                        placement: chimney.placement,
                        appliance: chimney.appliance,
                        note: chimney.note
                    }));
    
                    const { error: chimneysError } = await supabase
                        .from('chimneys')
                        .insert(chimneyData);
    
                    if (chimneysError) throw chimneysError;
                }
    
                Alert.alert('Success', 'Objekt bol vytvorený!');
                
                // Fetch complete object with relations for store update
                const { data: completeObject, error: fetchError } = await supabase
                    .from('objects')
                    .select(`
                        *,
                        clients (*),
                        chimneys (
                            id,
                            object_id,
                            chimney_type_id,
                            placement,
                            appliance,
                            note,
                            chimney_types (
                                id,
                                type,
                                labelling
                            )
                        )
                    `)
                    .eq('id', objectId)
                    .single();
                
                const transformedObject = {
                    object: {
                      id: completeObject.id,
                      client_id: completeObject.client_id,
                      address: completeObject.address,
                      streetNumber: completeObject.streetNumber,
                      city: completeObject.city,
                      country: completeObject.country
                    },
                    client: completeObject.clients,  // Rename 'clients' to 'client'
                    chimneys: completeObject.chimneys || []
                };

                if (fetchError) throw fetchError;
                
                onSuccess?.(transformedObject);
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
    
                // Insert new chimneys with all fields
                if (selectedChimneys.length > 0) {
                    const chimneyData = selectedChimneys.map(chimney => ({
                        object_id: objectId,
                        chimney_type_id: chimney.chimney_type_id,
                        placement: chimney.placement,
                        appliance: chimney.appliance,
                        note: chimney.note
                    }));
    
                    const { error: chimneysError } = await supabase
                        .from('chimneys')
                        .insert(chimneyData);
    
                    if (chimneysError) throw chimneysError;
                }
    
                Alert.alert('Úspech', 'Objekt bol upravený!');
                
                // Fetch complete object with relations for store update
                const { data: completeObject, error: fetchError } = await supabase
                    .from('objects')
                    .select(`
                        *,
                        clients (*),
                        chimneys (
                            id,
                            object_id,
                            chimney_type_id,
                            placement,
                            appliance,
                            note,
                            chimney_types (
                                id,
                                type,
                                labelling
                            )
                        )
                    `)
                    .eq('id', objectId)
                    .single();
                const transformedObject = {
                    object: {
                      id: completeObject.id,
                      client_id: completeObject.client_id,
                      address: completeObject.address,
                      streetNumber: completeObject.streetNumber,
                      city: completeObject.city,
                      country: completeObject.country
                    },
                    client: completeObject.clients,  // Rename 'clients' to 'client'
                    chimneys: completeObject.chimneys || []
                };
                if (fetchError) throw fetchError;
                
                onSuccess?.(transformedObject);
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

    const handleSubmitNewChimneyType = async () => {

        if (!chimneyFormData.type.trim()) {
            Alert.alert("Chyba", "Typ komina je povinny!");
            return;
        }
        if (!chimneyFormData.labelling.trim()) {
            Alert.alert("Chyba", "Oznacenie komina je povinne!");
            return;
        }
        setLoading(true);
        try{
            const {data: chimneyTypeData, error: chimneyTypeError } = await supabase
                .from("chimney_types")
                .insert([chimneyFormData])
                .select()
                .single();
            
            if (chimneyTypeError) throw chimneyTypeError;
            Alert.alert('Success', 'Novy typ komina bol vytvorený!');

            // append new chimney type to all types and clear form
            setAllChimneyTypes(prev => [...prev, chimneyTypeData]);
            setFilteredChimneyTypes(prev => [...prev, chimneyTypeData]);
            setChimneyTypeFormData({ type: '', labelling: ''});
            setshowChimneyTypeModal(false);
        }
        catch (error: any){
            console.error("Error saving object: ", error);
            Alert.alert('Error', error.message || "Failed to save object's data");
        }
        finally{
            setLoading(false);
        }
    };

    const handleChimneyTypeChange = (field: "type" | "labelling", value: string) => {
        setChimneyTypeFormData(prev => ({...prev, [field]: value}));
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
                    <View>
                        
                        {clientIsPreselected() &&
                            <Text
                                className="border-2 border-gray-300 rounded-xl p-4 bg-white">
                                {selectedClient?.name}
                            </Text>
                        }
                        {!clientIsPreselected() && (
                            <TextInput
                            placeholder="Začnite písať meno klienta..."
                            value={searchQuery}
                            onChangeText={handleSearchClient}
                            className="border-2 border-gray-300 rounded-xl p-4 bg-white"
                            />
                        )}
                        
                        {loadingClients && (!clientIsPreselected()) && (
                            <View className="absolute right-4 top-4">
                                <Text className="text-gray-400">🔍</Text>
                            </View>
                        )}

                        {clientSuggestions && (!clientIsPreselected()) && clientSuggestions.length > 0 && (
                            <View className="border-2 border-gray-300 rounded-xl mt-2 bg-white max-h-60">
                                <ScrollView>
                                    {clientSuggestions.map((item) => (
                                        <TouchableOpacity
                                            key={item.id}
                                            onPress={() => handleSelectedClient(item)}
                                            className="p-4 border-b border-gray-100"
                                        >
                                            <Text className="text-base">{item.name}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        )}
                    </View>
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

                {/* Chimneys Field */}
                <View className="mb-4">
                    <Text className="mb-2 ml-1 font-semibold text-gray-700">
                        Komíny
                    </Text>
                    
                    {/* Selected Chimneys Display */}
                    {selectedChimneys.length > 0 && (
                        <View className="mb-3">
                            {selectedChimneys.map((chimney, index) => (
                                <View 
                                    key={index}
                                    className="bg-blue-50 rounded-xl p-3 mb-2"
                                >
                                    <View className="flex-row items-start justify-between">
                                        <View className="flex-1">
                                            <Text className="font-semibold text-blue-900">
                                                {chimney.chimney_type?.type || 'Unknown Type'}
                                            </Text>
                                            {chimney.chimney_type?.labelling && (
                                                <Text className="text-sm text-blue-700">
                                                    {chimney.chimney_type.labelling}
                                                </Text>
                                            )}
                                            {chimney.placement && (
                                                <Text className="text-sm text-gray-600 mt-1">
                                                    📍 {chimney.placement}
                                                </Text>
                                            )}
                                            {chimney.appliance && (
                                                <Text className="text-sm text-gray-600">
                                                    🔥 {chimney.appliance}
                                                </Text>
                                            )}
                                            {chimney.note && (
                                                <Text className="text-sm text-gray-600">
                                                    📝 {chimney.note}
                                                </Text>
                                            )}
                                        </View>
                                        <View className="flex-row">
                                            <TouchableOpacity
                                                onPress={() => handleEditChimney(chimney, index)}
                                                className="w-8 h-8 bg-blue-100 rounded-full items-center justify-center ml-2"
                                            >
                                                <Text className="text-blue-600 font-bold">✏️</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                onPress={() => handleRemoveChimney(index)}
                                                className="w-8 h-8 bg-red-100 rounded-full items-center justify-center ml-2"
                                            >
                                                <Text className="text-red-600 font-bold">✕</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}
                    
                    {/* Add Chimney Button */}
                    <TouchableOpacity
                        onPress={() => handleAddChimney()}
                        className="border-2 border-gray-300 bg-white rounded-xl p-4"
                    >
                        <Text className="text-blue-600 font-semibold text-center">
                            + Pridať komín
                        </Text>
                    </TouchableOpacity>
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

        {/* Chimney Type Selection Modal */}
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
                            <Text className="text-xl font-bold">Vyberte typ komína</Text>
                            <TouchableOpacity
                                onPress={()=>setshowChimneyTypeModal(true)}
                                className="rounded-2xl bg-slate-500 p-4"
                            >
                                <Text className="text-white font-semibold">
                                    Vytvorit novy typ komina
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => setShowChimneyModal(false)}
                                className="w-8 h-8 bg-gray-100 rounded-full items-center justify-center"
                            >
                                <Text className="text-gray-600">✕</Text>
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
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    onPress={() => handleSelectChimneyType(item)}
                                    className="px-6 py-4 border-b border-gray-100"
                                >
                                    <Text className="text-base font-semibold text-gray-900">
                                        {item.type}
                                    </Text>
                                    {item.labelling && (
                                        <Text className="text-sm text-gray-500 mt-1">
                                            {item.labelling}
                                        </Text>
                                    )}
                                </TouchableOpacity>
                            )}
                        />
                    )}
                </View>
            </View>
        </Modal>
        
        {/* Chimney Type Creating Form Modal */}
        <Modal
            visible={showChimneyTypeModal}
            animationType="fade"
            transparent={true}
            onRequestClose={() => setshowChimneyTypeModal(false)}
        >
            <View className="flex-1 bg-black/50 justify-center items-center">
            <View className="w-3/4 bg-white rounded-2xl overflow-hidden">
                    <View className="p-6 border-b border-gray-200">
                        <View className="flex-row items-center justify-between">
                            <Text className="text-xl font-bold">Vytvorte typ komína</Text>
                           
                            <TouchableOpacity
                                onPress={() => {
                                    setshowChimneyTypeModal(false);
                                    setChimneyTypeFormData({ type: '', labelling: ''});
                                }}
                                className="w-8 h-8 bg-gray-100 rounded-full items-center justify-center"
                            >
                                <Text className="text-gray-600">✕</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                    
                    <View className="p-4">

                        {/* Type field*/}
                        <Text className="font-semibold mb-1">
                            Typ
                        </Text>
                        <TextInput
                            placeholder="Napiste typ komina"
                            value={chimneyFormData.type}
                            onChangeText={(text) => handleChimneyTypeChange("type", text)}
                            className="border-2 border-gray-300 rounded-xl p-4 mb-4"
                        />

                        {/* Labelling field*/}
                        <Text className="font-semibold mb-1">
                            Oznacenie
                        </Text>
                        <TextInput
                            placeholder="Napiste oznacenie komina"
                            value={chimneyFormData.labelling}
                            onChangeText={(text) => handleChimneyTypeChange("labelling", text)}
                            className="border-2 border-gray-300 rounded-xl p-4 mb-6"
                            />

                        <TouchableOpacity
                            onPress={handleSubmitNewChimneyType}
                            disabled={loading}
                            className="py-4 rounded-2xl items-center bg-blue-700 mx-8 mb-4">
                            <Text className="text-white font-bold">
                                {loading ? "Ukladam.." : "Vytvorit"}</Text>
                        </TouchableOpacity>
                    </View>
                    
                </View>
            </View>
        </Modal>


        {/* Chimney Details Modal */}
        <Modal
            visible={showChimneyDetailsModal}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setShowChimneyDetailsModal(false)}
        >
            <View className="flex-1 bg-black/50 justify-end">
                <View className="bg-white rounded-t-3xl">
                    <View className="p-6 border-b border-gray-200">
                        <View className="flex-row items-center justify-between">
                            <Text className="text-xl font-bold">Detail komína</Text>
                            <TouchableOpacity
                                onPress={() => setShowChimneyDetailsModal(false)}
                                className="w-8 h-8 bg-gray-100 rounded-full items-center justify-center"
                            >
                                <Text className="text-gray-600">✕</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <ScrollView className="p-6">
                        {/* Chimney Type (read-only) */}
                        <View className="mb-4">
                            <Text className="mb-2 ml-1 font-semibold text-gray-700">Typ komína</Text>
                            <View className="bg-gray-100 rounded-xl p-4">
                                <Text className="font-semibold">{editingChimney?.chimney_type?.type}</Text>
                                {editingChimney?.chimney_type?.labelling && (
                                    <Text className="text-sm text-gray-600">{editingChimney.chimney_type.labelling}</Text>
                                )}
                            </View>
                        </View>

                        {/* Placement */}
                        <View className="mb-4">
                            <Text className="mb-2 ml-1 font-semibold text-gray-700">Umiestnenie spotrebiča</Text>
                            <TextInput
                                placeholder="Napr. Kuchyňa, Obývačka..."
                                value={editingChimney?.placement || ''}
                                onChangeText={(text) => setEditingChimney(prev => prev ? {...prev, placement: text} : null)}
                                className="border-2 border-gray-300 rounded-xl p-4 bg-white"
                            />
                        </View>

                        {/* Appliance */}
                        <View className="mb-4">
                            <Text className="mb-2 ml-1 font-semibold text-gray-700">Druh spotrebiča</Text>
                            <TextInput
                                placeholder="Napr. Plynový kotol, Krb..."
                                value={editingChimney?.appliance || ''}
                                onChangeText={(text) => setEditingChimney(prev => prev ? {...prev, appliance: text} : null)}
                                className="border-2 border-gray-300 rounded-xl p-4 bg-white"
                            />
                        </View>

                        {/* Note */}
                        <View className="mb-4">
                            <Text className="mb-2 ml-1 font-semibold text-gray-700">Poznámka</Text>
                            <TextInput
                                placeholder="Dodatočné informácie..."
                                value={editingChimney?.note || ''}
                                onChangeText={(text) => setEditingChimney(prev => prev ? {...prev, note: text} : null)}
                                className="border-2 border-gray-300 rounded-xl p-4 bg-white"
                                multiline
                                numberOfLines={3}
                            />
                        </View>

                        {/* Save Button */}
                        <TouchableOpacity
                            onPress={handleSaveChimneyDetails}
                            className="bg-blue-600 rounded-xl p-4 items-center"
                        >
                            <Text className="text-white font-bold text-lg">Uložiť komín</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </View>
        </Modal>
        </KeyboardAvoidingView>
    )
}