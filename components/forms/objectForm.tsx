import { supabase } from "@/lib/supabase";
import { useCallback, useEffect, useState } from "react";
import {
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";

import { Client } from "@/types/generics";
import { ChimneyInput, ChimneyType, Object, ObjectWithRelations } from "@/types/objectSpecific";
import { EvilIcons, Feather, MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { FormInput } from "../formInput";


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
    const [focusedField, setFocusedField] = useState<string | null>(null);

    const [clientSuggestions, setClientSuggestions] = useState<Client[]>([]);
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
    const router = useRouter();
    
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

    const selectClientAddress = async (preselectedClient: Client) => {
        if(preselectedClient.address){
            const fullAddress = preselectedClient.address;
            handleChange("address", fullAddress);
            setAddressSearch(fullAddress);

            if (preselectedClient.streetNumber) {
                handleChange("streetNumber",preselectedClient.streetNumber);
            }
            if (preselectedClient.city) {
                handleChange("city",preselectedClient.city);
            } 
            if (preselectedClient.country) {
                handleChange("country",preselectedClient.country);
            }
        }
        
    }

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

    const handleSearchClient = useCallback((text: string) => {
        setSearchQuery(text);
        
        if(timerId) {
            clearTimeout(timerId);
        }
        const timer = window.setTimeout(() => {
            searchClient(text);
        }, 300);

        setTimerId(timer);
    }, [timerId]);

    async function searchClient(query: string) {
        if (query.trim().length < 2){
            setClientSuggestions([]);
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
            setClientSuggestions(data || []);
        } 
        catch(error: any){
            console.error("Chyba: ", error.message);
            setClientSuggestions([]);
        }
        finally{
            setLoadingClients(false);
        }
    }

    const handleSelectedClient = (client: Client) => {
        setSelectedClient(client);
        setSearchQuery(client.name);
        setClientSuggestions([]);
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

    const validate = () : boolean => {
        const newErrors : Record<string, string> = {};

        if(!formData.client_id?.trim()){
            newErrors.client = "Klient je povinná položka!";
        }

        if(!formData.address?.trim()){
            newErrors.address = "Adresa je povinná položka!";
        }

        if (selectedChimneys.length === 0) {
            newErrors.chimneys = "Pre uloženie objektu vytvorte aspoň jeden komín!";
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


    const validateNewChimneyType = () : boolean => {
        const newErrors : Record<string, string> = {};

        if (!chimneyFormData.type.trim()) {
            newErrors.chimneyType = "Typ komína je povinná položka!";
        }

        if (!chimneyFormData.labelling.trim()) {
            newErrors.chimneyLabelling = "Označenie komína je povinná položka!";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };
    
    const handleSubmitNewChimneyType = async () => {
        if(!validateNewChimneyType()){
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
        <View className="flex-1">
            <KeyboardAvoidingView
                behavior={Platform.OS === "android" ? "padding" : "height"}
                className='flex-1'
            >
                {/* header */}
                <View className="mb-32 relative">
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="absolute top-4 left-6 w-10 h-10 items-center justify-center"
                    >
                      <MaterialIcons name="arrow-back" size={24} color="#d6d3d1" />
                    </TouchableOpacity>
                    <View className="absolute top-4 left-0 right-0 items-center justify-center">
                        <Text className="font-bold text-4xl text-dark-text_color">
                            {mode === "create" ? "Vytvoriť objekt" : "Upraviť objekt"}
                        </Text>
                    </View>
                </View>
                {/* Form */}
                <ScrollView 
                  className="flex-1"
                  contentContainerStyle={{paddingBottom: 100}}
                >
                
                <View className="flex-1 justify-center px-10">

                    {/* Client Field*/}
                    <View className="mb-3">
                        <Text className="mb-1 ml-1 font-medium text-dark-text_color">Klient</Text>
                        <View>

                            {clientIsPreselected() &&
                                <Text className="border-2 bg-gray-800 rounded-xl  px-4 py-4 border-gray-700 text-white">
                                    {selectedClient?.name}
                                </Text>
                            }
                            {!clientIsPreselected() && (
                                <TextInput
                                    placeholder="Začnite písať meno klienta..."
                                    placeholderTextColor="#ABABAB"
                                    value={searchQuery}
                                    onChangeText={handleSearchClient}
                                    cursorColor="#FFFFFF"
                                    className={`flex-row items-center border-2 bg-gray-800 rounded-xl px-4 py-4 text-white 
                                        ${focusedField === 'client' ? 'border-blue-500' : 'border-gray-700'}
                                    `}
                                    onFocus={() => setFocusedField('client')}
                                    onBlur={() => setFocusedField(null)}
                                />
                            )}
                            {errors.client && (
                                <Text className='text-red-500 font-semibold ml-2 mt-1'>
                                    {errors.client}
                                </Text>
                            )}
                            {loadingClients && (!clientIsPreselected()) && (
                                <View className="absolute right-4 top-4">
                                    <Text className="text-gray-400">🔍</Text>
                                </View>
                            )}

                            {clientSuggestions && (!clientIsPreselected()) && clientSuggestions.length > 0 && (
                                <View className="border-2 border-gray-300 rounded-xl mt-1 bg-gray-300 max-h-60">
                                    <ScrollView className="border-b rounded-xl border-gray-300">
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

                    {/* Address field*/}               
                    <View className="mb-3">
                        <Text className="mb-1 ml-1 font-medium text-dark-text_color">Adresa</Text>
                        <View>
                            <TextInput
                                placeholder="Začnite písať adresu..."
                                placeholderTextColor="#ABABAB"
                                value={addressSearch || formData.address || ''}
                                onChangeText={searchGoogleAddress}
                                cursorColor="#FFFFFF"
                                className={`flex-row items-center border-2 bg-gray-800 rounded-xl px-4 py-4 text-white 
                                    ${focusedField === 'address' ? 'border-blue-500' : 'border-gray-700'}
                                `}
                                onFocus={() => setFocusedField('address')}
                                onBlur={() => setFocusedField(null)}
                            />

                            {/* Text button, use clients address */}
                            {preselectedClient && !searchingAddress && !formData.address && (
                                <TouchableOpacity className="ml-2 mt-2"
                                onPress={() => selectClientAddress(preselectedClient)}
                                >
                                    <Text className="text-dark-text_color text-xs">
                                        Použiť adresu klienta ako adresu objektu?
                                    </Text>
                                </TouchableOpacity>
                            )}

                            {/* Search indicator */}
                            {searchingAddress && (
                                <View className="absolute right-4 top-4">
                                    <Text className="text-gray-400">🔍</Text>
                                </View>
                            )}
                            {errors.address && (
                                <Text className='text-red-500 font-semibold ml-2 mt-1'>
                                    {errors.address}
                                </Text>
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
                        <Text className="mb-2 ml-1 font-semibold text-dark-text_color">
                            Komíny
                        </Text>
                        
                        {/* Selected Chimneys Display */}
                        {selectedChimneys.length > 0 && (
                            <View className="mb-3">
                                {selectedChimneys.map((chimney, index) => (
                                    <View 
                                        key={index}
                                        className="bg-gray-700 rounded-xl p-3 mb-2"
                                    >
                                        <View className="flex-1">
                                            <View className="flex-row justify-between">
                                                <View>
                                                    <Text className="font-semibold text-white">
                                                        {chimney.chimney_type?.type || 'Unknown Type'}
                                                    </Text>
                                                    {chimney.chimney_type?.labelling && (
                                                        <Text className="text-sm text-gray-400">
                                                            {chimney.chimney_type.labelling}
                                                        </Text>
                                                    )}
                                                </View>
                                                <View className="flex-row gap-2">
                                                    <TouchableOpacity
                                                        onPress={() => handleEditChimney(chimney, index)}
                                                        className="w-8 h-8 bg-gray-500 rounded-full items-center justify-center "
                                                    >
                                                      <Feather name="edit-2" size={16} color="white" />
                                                    
                                                    </TouchableOpacity>
                                                    <TouchableOpacity
                                                        onPress={() => handleRemoveChimney(index)}
                                                        className="w-8 h-8 bg-gray-500 rounded-full items-center justify-center"
                                                    >
                                                      <EvilIcons name="close" size={24} color="white" />
                                                    </TouchableOpacity>
                                                   
                                                </View>
                                            </View>
                                            <View className="flex-row mt-2">
                                                <View className="mr-6">
                                                    {chimney.placement && (
                                                        <Text className="text-sm text-gray-400 font-bold">
                                                            Umiestnenie:
                                                        </Text> 
                                                    )}
                                                    {chimney.appliance && (
                                                        <Text className="text-sm text-gray-400 font-bold">
                                                            Spotrebič: 
                                                        </Text>
                                                    )}
                                                    {chimney.note && (
                                                        <Text className="text-sm text-gray-400 font-bold">
                                                            Poznámka: 
                                                        </Text>
                                                    )}
                                                </View>
                                                <View>
                                                    {chimney.placement && (
                                                        <Text className="text-sm text-gray-300 font-bold">
                                                            {chimney.placement}
                                                        </Text>

                                                    )}
                                                    {chimney.appliance && (
                                                        <Text className="text-sm text-gray-300 font-bold">
                                                            {chimney.appliance}
                                                        </Text>

                                                    )}
                                                    {chimney.note && (
                                                        <Text className="text-sm text-gray-300 font-bold">
                                                            {chimney.note}
                                                        </Text>
                                                    )} 
                                                    </View>
                                            </View>
                                            
                                        </View>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* Add Chimney Button */}
                        <TouchableOpacity
                            onPress={() => handleAddChimney()}
                            className="border-2 border-gray-300 bg-neutral-700 rounded-xl p-4"
                        >
                            <Text className="text-white font-semibold text-center">
                                + Pridať komín
                            </Text>
                        </TouchableOpacity>

                        {errors.chimneys && (
                            <Text className='text-red-500 font-semibold ml-2 mt-1'>
                                {errors.chimneys}
                            </Text>
                        )}
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
        
        {/* submit button */}
        <View className="absolute bottom-0 left-0 right-0 px-6 pb-12 pt-4 items-center justify-center z-10">
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={loading}
              className="bg-blue-600 rounded-2xl items-center py-5 px-12"
            >
                <Text className="color-primary font-bold">
                    {mode === "create" 
                        ? (loading ? "Vytváram..." : "Vytvoriť objekt") 
                        : (loading ? "Upravujem..." : "Upraviť objekt")
                    }
                </Text>
            </TouchableOpacity>
        </View>

        {/* Chimney Type Selection Modal */}
        <Modal
            visible={showChimneyModal}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setShowChimneyModal(false)}
        >
            <View className="flex-1 bg-black/50 justify-end">
                <View className="bg-dark-bg rounded-t-3xl border-2 border-gray-500" style={{height: "75%" }}>
                    {/* header */}
                    <View className="p-6 border-b border-gray-700">
                        <View className="flex-row items-center justify-between mb-4">
                            <Text className="text-xl text-dark-text_color font-bold">Vyberte typ komína</Text>
                            <TouchableOpacity
                                onPress={() => setShowChimneyModal(false)}
                                className="w-8 h-8 bg-gray-700 rounded-full items-center justify-center active:bg-gray-600"
                            >
                                <EvilIcons name="close" size={20} color="white" />
                            </TouchableOpacity>
                        </View>
                        <View className="flex-row items-center bg-gray-800 rounded-xl border-2 px-4 py-1 border-gray-700">
                          <EvilIcons name="search" size={20} color="gray" />
                          <TextInput
                            className="flex-1 ml-2 text-dark-text_color"
                            placeholder="Hľadať komín (typ, označenie)"
                            placeholderTextColor="#9CA3AF"
                            value={searchQueryChimney}
                            onChangeText={handleSearchChimney}
                          />
                        </View>
                    </View>
                    <View className="flex-1">
                        {filteredChimneyTypes.length === 0 ? (
                            <View className="flex-1 items-center justify-center">
                                <Text className="text-6xl mb-4">🔍</Text>
                                <Text className="text-gray-400 text-base">Žiadne komíny nenájdené</Text>
                            </View>
                        ) : (
                            <FlatList
                                data={filteredChimneyTypes}
                                keyExtractor={(item) => item.id}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        onPress={() => handleSelectChimneyType(item)}
                                        className="px-6 py-4 border-b border-gray-600"
                                    >
                                        <Text className="text-base font-semibold text-dark-text_color">
                                            {item.type}
                                        </Text>
                                        {item.labelling && (
                                            <Text className="text-sm text-gray-500 mt-1">
                                                {item.labelling}
                                            </Text>
                                        )}
                                    </TouchableOpacity>
                                )}
                                contentContainerStyle={{ paddingBottom: 100}}
                            />
                        )}
                    </View>
                </View>
                
                {/* Create new chimney type button */}
                <View className="absolute bottom-10 left-0 right-0 bg-dark-bg items-center justify-center">
                    <TouchableOpacity
                      onPress={()=>setshowChimneyTypeModal(true)}
                      className="rounded-xl bg-slate-500 py-4 px-12 active:bg-slate-800"
                    >
                        <Text className="text-white font-semibold">
                           + Vytvoriť nový typ komína
                        </Text>
                    </TouchableOpacity>
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
                <View className="w-3/4 bg-dark-bg rounded-2xl overflow-hidden border-2 border-gray-500">
                    {/* Header*/}
                    <View className="p-6 border-b border-gray-600">
                        <View className="flex-row items-center justify-between">
                            <Text className="text-xl text-dark-text_color font-bold">Vytvorte typ komína</Text>
                            <TouchableOpacity
                                onPress={() => {
                                    setshowChimneyTypeModal(false);
                                    setChimneyTypeFormData({ type: '', labelling: ''});
                                }}
                                className="w-8 h-8 bg-gray-700 rounded-full items-center justify-center active:bg-gray-600"
                            >
                                <EvilIcons name="close" size={18} color="white"/>
                            </TouchableOpacity>
                        </View>
                    </View>
                    
                    {/* Form */}
                    <View className="p-4 mb-4">
                        {/* Type field*/}
                        <Text className="font-semibold mb-1">
                            Typ
                        </Text>
                        <TextInput
                            placeholder="Napíšte typ komína"
                            placeholderTextColor="#ABABAB"
                            value={chimneyFormData.type}
                            onChangeText={(text) => handleChimneyTypeChange("type", text)}
                            cursorColor="#FFFFFF"
                            className={`flex-row items-center border-2 bg-gray-800 rounded-xl px-4 py-4 text-white 
                                ${focusedField === 'type' ? 'border-blue-500' : 'border-gray-700'}
                            `}
                            onFocus={() => setFocusedField('type')}
                            onBlur={() => setFocusedField(null)}
                        />

                        {/* Labelling field*/}
                        <Text className="font-semibold mb-1">
                            Oznacenie
                        </Text>
                        <TextInput
                          placeholder="Napíšte označenie komína"
                          placeholderTextColor="#ABABAB"
                          value={chimneyFormData.labelling}
                          onChangeText={(text) => handleChimneyTypeChange("labelling", text)}
                          cursorColor="#FFFFFF"
                          className={`flex-row items-center border-2 bg-gray-800 rounded-xl px-4 py-4 text-white 
                              ${focusedField === 'labelling' ? 'border-blue-500' : 'border-gray-700'}
                          `}
                          onFocus={() => setFocusedField('labelling')}
                          onBlur={() => setFocusedField(null)}
                        />
                    </View>

                    {/* Create button */}
                    <View className="items-center justify-center mb-6">
                        <TouchableOpacity
                          activeOpacity={0.8}
                          onPress={handleSubmitNewChimneyType}
                          disabled={loading}
                          className="rounded-xl bg-slate-500 p-4 px-12 active:bg-slate-800"
                        >
                            <Text className="text-white font-bold">
                                {mode === "create" ? (loading ? "Vytvaram..." : "Vytvoriť") : (loading ? "Upraviť objekt" : "Upravujem...")}
                            </Text>
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
                <View className="bg-dark-bg rounded-t-3xl">
                    <View className="p-6 border-b border-gray-600">
                        <View className="flex-row items-center justify-between">
                            <Text className="text-xl font-bold text-dark-text_color">Detail komína</Text>
                            <TouchableOpacity
                                onPress={() => setShowChimneyDetailsModal(false)}
                                className="w-8 h-8 bg-gray-700 rounded-full items-center justify-center active:bg-gray-600"
                            >
                                <EvilIcons name="close" size={20} color="white" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View className="p-6">
                        {/* Chimney Type (read-only) */}
                        <View className="mb-4">
                            <Text className="mb-2 ml-1 font-semibold text-dark-text_color">Typ</Text>
                            <View className="bg-gray-800 rounded-xl border-2 px-4 py-3 border-gray-700 text-white">
                                <Text className="font-semibold text-white">{editingChimney?.chimney_type?.type}</Text>
                                {editingChimney?.chimney_type?.labelling && (
                                    <Text className="text-sm text-gray-300">{editingChimney.chimney_type.labelling}</Text>
                                )}
                            </View>
                        </View>

                        {/* Placement */}
                        <FormInput
                          label= "Umiestnenie spotrebiča"
                          value={editingChimney?.placement || ''}
                          placeholder= "Napr. Kuchyňa, Obývačka..."
                          onChange= {(text) => setEditingChimney(prev => prev ? {...prev, placement: text} : null)}
                          fieldName= "placement"
                          focusedField= {focusedField}
                          setFocusedField= {setFocusedField}
                        />
                        
                        {/* Appliance */}
                        <FormInput
                          label= "Druh spotrebiča"
                          value={editingChimney?.appliance || ''}
                          placeholder="Napr. Plynový kotol, Krb..."
                          onChange= {(text) => setEditingChimney(prev => prev ? {...prev, appliance: text} : null)}
                          fieldName= "appliance"
                          focusedField= {focusedField}
                          setFocusedField= {setFocusedField}
                        />

                        {/* Note */}
                        <FormInput
                          label= "Poznámka"
                          value={editingChimney?.note|| ''}
                          placeholder="Dodatočné informácie..."
                          onChange= {(text) => setEditingChimney(prev => prev ? {...prev, note: text} : null)}
                          fieldName= "note"
                          focusedField= {focusedField}
                          setFocusedField= {setFocusedField}
                          multiline
                        />
                        
                    </View>

                    {/* Save Chimney Button */}
                    <View className="items-center justify-center mb-10">
                        <TouchableOpacity
                            onPress={handleSaveChimneyDetails}
                            className="rounded-xl bg-slate-500 p-4 px-12 active:bg-slate-800"
                        >
                            <Text className="text-white font-bold text-lg">Uložiť komín</Text>
                        </TouchableOpacity>
                    </View>

                </View>
            </View>
        </Modal>
    </View>
    )
}