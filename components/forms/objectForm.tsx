import { useGoogleSearchAddress } from "@/hooks/useGoogleAddressSearch";
import { supabase } from "@/lib/supabase";
import { useClientStore } from "@/store/clientStore";
import { useNotificationStore } from "@/store/notificationStore";
import { Client } from "@/types/generics";
import { ChimneyInput, ChimneyType, Object as ObjectType, ObjectWithRelations } from "@/types/objectSpecific";
import { EvilIcons, Feather, MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { FlatList, KeyboardAvoidingView, Modal, Platform, ScrollView, TouchableOpacity, View } from "react-native";
import { FormInput } from "../formInput";
import { Body, BodySmall, Caption, Heading1, Heading3 } from "../typography";

interface ObjectFormProps {
    mode: "create" | "edit";
    initialData?: ObjectWithRelations;
    onSuccess?: (object: any) => void;
    preselectedClientID?: string;
}

export default function ObjectForm({ mode, initialData, onSuccess, preselectedClientID} : ObjectFormProps) {

    const [formData, setFormData] = useState<Omit<ObjectType, "id"> & {id?: string}>({
        client_id: initialData?.client.id || '',
        address: initialData?.object.address || '',
        streetNumber: initialData?.object.streetNumber || '',
        city: initialData?.object.city || '',
        country: initialData?.object.country || ''
    });
    const router = useRouter();
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
    const [showChimneyTypeModal, setshowChimneyTypeModal] = useState(false);
    const [chimneyFormData, setChimneyTypeFormData] = useState<{
        type: string;
        labelling: string;
    }>({
        type: '',
        labelling: ''
    });
    
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
                setSearchQuery(initialData.client.name);
            }

            if (initialData.chimneys){
                setSelectedChimneys(initialData.chimneys);
            }
        }
    }, [initialData]);

    const client = useClientStore(
        s => s.clients.find(c => c.id === preselectedClientID)
    );

    useEffect(() => {
        if (!client || initialData) return;
        setSelectedClient(client);
        setFormData(prev => ({ ...prev, client_id: client.id }));
      }, [client, initialData]);

    const handleChange = (field: keyof Omit<ObjectType, "id">, value: string) => {
        setFormData(prev => ({...prev, [field]: value}));
        if(errors[field]){
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    const {
        addressSearch,
        addressSuggestions,
        showAddressSuggestions,
        searchingAddress,
        searchGoogleAddress,
        selectClientAddress,
        selectAddress
    } = useGoogleSearchAddress<Omit<ObjectType, "id">>(handleChange);

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
        console.log(newErrors);
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
            if (mode === "create"){
                useNotificationStore.getState().addNotification(
                    'Nepodarilo sa vytvoriť objekt',
                    'error',
                    4000
                );
            }
            else{
                useNotificationStore.getState().addNotification(
                    'Nepodarilo sa upraviť objekt',
                    'error',
                    4000
                );
            }
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
            useNotificationStore.getState().addNotification(
                "Nový typ komina bol vytvorený!",
                "success",
                3000
            );
            // append new chimney type to all types and clear form
            setAllChimneyTypes(prev => [...prev, chimneyTypeData]);
            setFilteredChimneyTypes(prev => [...prev, chimneyTypeData]);
            setChimneyTypeFormData({ type: '', labelling: ''});
            setshowChimneyTypeModal(false);
        }
        catch (error: any){
            console.error("Error saving object: ", error);
            useNotificationStore.getState().addNotification(
                "Nastala chyba pri vytváraní nového typu komina!",
                "error",
                4000
            );
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
                <View className="mb-12 relative">
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="absolute top-3 left-6 w-10 h-10 items-center justify-center z-10"
                    >
                      <MaterialIcons name="arrow-back" size={24} color="#d6d3d1" />
                    </TouchableOpacity>
                    
                    <Heading1 className="font-bold text-3xl text-dark-text_color top-3 text-center">
                        {mode === "create" ? "Vytvoriť objekt" : "Upraviť objekt"}
                    </Heading1>
                    
                </View>
                
                {/* Form */}
                <View className="flex-1 mb-24 justify-center px-10">
                <ScrollView 
                  className="flex-1"
                  contentContainerStyle={{paddingHorizontal: 16, paddingTop: 16}}
                >
                
                    {/* Client Field*/}
                    <View className="mb-3">
                        <View>

                            {client &&
                                <Body className="border-2 bg-gray-800 rounded-xl px-4 py-4 border-gray-700 text-white">
                                    {selectedClient?.name}
                                </Body>
                            }
                            {!client && (
                                <FormInput
                                    label="Klient"
                                    value={searchQuery}
                                    onChange={handleSearchClient}
                                    placeholder="Začnite písať meno klienta..."
                                    error={errors.client}
                                    fieldName="client"
                                    focusedField={focusedField}
                                    setFocusedField={setFocusedField}
                                    autoCapitalize="words"
                                    containerClassName=" "
                                />
                            )}
                            {loadingClients && !client && (
                                <View className="absolute right-4 top-4">
                                    <Body className="text-gray-400">🔍</Body>
                                </View>
                            )}

                            {clientSuggestions && !client && clientSuggestions.length > 0 && (
                                <View className="border-2 border-gray-300 rounded-xl mt-1 bg-gray-300 max-h-60">
                                    <ScrollView className="border-b rounded-xl border-gray-300">
                                        {clientSuggestions.map((item) => (
                                            <TouchableOpacity
                                                key={item.id}
                                                onPress={() => handleSelectedClient(item)}
                                                className="p-4 border-b border-gray-100"
                                            >
                                                <Body className="text-base">{item.name}</Body>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            )}
                        </View>
                    </View> 

                    {/* Address field*/}               
                    <View className="mb-3">
                        <View>
                            <FormInput
                                label="Adresa"
                                value={addressSearch || formData.address || ''}
                                onChange={searchGoogleAddress}
                                placeholder="Začnite písať adresu..."
                                error={errors.address}
                                fieldName="address"
                                focusedField={focusedField}
                                setFocusedField={setFocusedField}
                                autoCapitalize="words"
                                containerClassName=" "
                            />
                            {/* Text button, use clients address */}
                            {client && !searchingAddress && !formData.address && (
                                <TouchableOpacity className="ml-2 mt-2"
                                onPress={() => selectClientAddress(client)}
                                >
                                    <Caption className="text-dark-text_color text-xs">
                                        Použiť adresu klienta ako adresu objektu?
                                    </Caption>
                                </TouchableOpacity>
                            )}

                            {/* Search indicator */}
                            {searchingAddress && (
                                <View className="absolute right-4 top-9">
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
                    </View>
                        
                    {/* Chimneys Field */}
                    <View className="mt-2 mb-4">
                        <View className="flex-row justify-between mb-2">
                            <Body className="mt-2 ml-1 font-semibold text-dark-text_color">
                                Komíny
                            </Body>
                            {/* Add Chimney Button */}
                            <TouchableOpacity
                                onPress={() => handleAddChimney()}
                                className="flex-row bg-gray-500 rounded-xl py-2 px-4"
                            >
                                <Body className="text-white font-semibold text-center mr-1">
                                +
                                </Body>
                                <Body className="text-white font-semibold text-center">
                                    Priradiť
                                </Body>
                            </TouchableOpacity>
                        </View>
                        {/* Selected Chimneys Display */}
                        {selectedChimneys.length === 0 && (
                            <View className="mb-3">
                               <Body className="text-red-400 ml-1">
                                Nie sú priradené žiadne komíny
                               </Body>
                            </View>
                        )}
                        {/* Selected Chimneys Display */}
                        {selectedChimneys.length > 0 && (
                            <View className="mb-3">
                                {selectedChimneys.map((chimney, index) => (
                                    <View 
                                        key={index}
                                        className="bg-gray-700 rounded-xl p-3 mb-2"
                                    >
                                        <View className="flex-1">
                                            {/* HEADER */}
                                            <View className="flex-row justify-between">
                                                <View>
                                                    <Body className="font-semibold text-white">
                                                        {chimney.chimney_type?.type || 'Unknown Type'}
                                                    </Body>
                                                    {chimney.chimney_type?.labelling && (
                                                        <BodySmall className="text-sm text-gray-400">
                                                            {chimney.chimney_type.labelling}
                                                        </BodySmall>
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
                                                        <BodySmall className="text-sm text-gray-400 font-bold">
                                                            Umiestnenie:
                                                        </BodySmall> 
                                                    )}
                                                    {chimney.appliance && (
                                                        <BodySmall className="text-sm text-gray-400 font-bold">
                                                            Spotrebič: 
                                                        </BodySmall>
                                                    )}
                                                    {chimney.note && (
                                                        <BodySmall className="text-sm text-gray-400 font-bold"                                                        >
                                                            Poznámka: 
                                                        </BodySmall>
                                                    )}
                                                </View>
                                                <View className="flex-2" style={{ flexShrink: 1 }}>
                                                    {chimney.placement && (
                                                        <BodySmall className="text-sm text-gray-300 font-bold">
                                                            {chimney.placement}
                                                        </BodySmall>

                                                    )}
                                                    {chimney.appliance && (
                                                        <BodySmall className="text-sm text-gray-300 font-bold">
                                                            {chimney.appliance}
                                                        </BodySmall>

                                                    )}
                                                    {chimney.note && (
                                                        <BodySmall className="text-sm text-gray-300 font-bold"
                                                          numberOfLines={undefined} 
                                                          style={{ flexWrap: 'wrap' }}
                                                          >
                                                            {chimney.note}
                                                        </BodySmall>
                                                    )} 
                                                    </View>
                                            </View>
                                            
                                        </View>
                                    </View>
                                ))}
                            </View>
                        )}

                        {errors.chimneys && (
                            <Body className='text-red-500 font-semibold ml-2 mt-1'>
                                {errors.chimneys}
                            </Body>
                        )}
                    </View>
                
            </ScrollView>
            </View>
        
            {/* submit button */}
            <View className="absolute bottom-4 left-0 right-0 items-center">
                <TouchableOpacity
                  onPress={handleSubmit}
                  disabled={loading}
                  className="bg-blue-600 rounded-2xl items-center py-5 px-12"
                >
                    <Body className="color-primary font-bold">
                        {mode === "create" 
                            ? (loading ? "Vytváram..." : "Vytvoriť objekt") 
                            : (loading ? "Upravujem..." : "Upraviť objekt")
                        }
                    </Body>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>

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
                            <Heading3 className="text-xl text-dark-text_color font-bold">Vyberte typ komína</Heading3>
                            <TouchableOpacity
                                onPress={() => setShowChimneyModal(false)}
                                className="w-8 h-8 bg-gray-700 rounded-full items-center justify-center active:bg-gray-600"
                            >
                                <EvilIcons name="close" size={20} color="white" />
                            </TouchableOpacity>
                        </View>
                        <View className="flex-row items-center bg-gray-800 rounded-xl border-2 px-4 py-1 border-gray-700">
                            <EvilIcons name="search" size={20} color="gray" />
                            <FormInput
                              placeholder="Hľadať komín (typ, označenie)"
                              value={searchQueryChimney}
                              onChange={handleSearchChimney}
                              fieldName="chimneySearch"
                              focusedField={focusedField}
                              setFocusedField={setFocusedField}
                            />
                        </View>
                    </View>
                    <View className="flex-1">
                        {filteredChimneyTypes.length === 0 ? (
                            <View className="flex-1 items-center justify-center">
                                <Heading3 className="mb-4">🔍</Heading3>
                                <Body className="text-gray-400 text-base">Žiadne komíny nenájdené</Body>
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
                                        <Body className="text-base font-semibold text-dark-text_color">
                                            {item.type}
                                        </Body>
                                        {item.labelling && (
                                            <BodySmall className="text-sm text-gray-500 mt-1">
                                                {item.labelling}
                                            </BodySmall>
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
                        <Body className="text-white font-semibold">
                           + Vytvoriť nový typ komína
                        </Body>
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
                            <Heading3 className="text-xl text-dark-text_color font-bold">Vytvorte typ komína</Heading3>
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
                        <FormInput
                          label="Typ"
                          placeholder="Napíšte typ komína"
                          value={chimneyFormData.type}
                          onChange={(text) => handleChimneyTypeChange("type", text)}
                          fieldName="chimney_type"
                          focusedField={focusedField}
                          setFocusedField={setFocusedField}
                        />
                        
                        {/* Labelling field*/}
                        <FormInput
                          label="Označenie"
                          placeholder="Napíšte označenie komína"
                          value={chimneyFormData.labelling}
                          onChange={(text) => handleChimneyTypeChange("labelling", text)}
                          fieldName="chimney_labelling"
                          focusedField={focusedField}
                          setFocusedField={setFocusedField}
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
                            <Body className="text-white font-bold">
                                {mode === "create" ? (loading ? "Vytváram..." : "Vytvoriť") : (loading ? "Upraviť objekt" : "Upravujem...")}
                            </Body>
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
                            <Heading3 className="text-xl font-bold text-dark-text_color">Detail komína</Heading3>
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
                            <Body className="mb-2 ml-1 font-semibold text-dark-text_color">Typ</Body>
                            <View className="bg-gray-800 rounded-xl border-2 px-4 py-3 border-gray-700 text-white">
                                <Body className="font-semibold text-white">{editingChimney?.chimney_type?.type}</Body>
                                {editingChimney?.chimney_type?.labelling && (
                                    <BodySmall className="text-sm text-gray-300">{editingChimney.chimney_type.labelling}</BodySmall>
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
                            <Body className="text-white font-bold">Uložiť komín</Body>
                        </TouchableOpacity>
                    </View>

                </View>
            </View>
        </Modal>
    </View>
    )
}