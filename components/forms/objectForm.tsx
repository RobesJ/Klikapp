import { useObjectSubmit } from "@/hooks/submitHooks/useObjectSubmit";
import { useGoogleSearchAddress } from "@/hooks/useGoogleAddressSearch";
import { useSearchClient } from "@/hooks/useSearchClient";
import { supabase } from "@/lib/supabase";
import { useClientStore } from "@/store/clientStore";
import { ChimneyInput, ChimneyType, Object as ObjectType, ObjectWithRelations } from "@/types/objectSpecific";
import { EvilIcons, Feather, MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, View } from "react-native";
import { FormInput } from "../formInput";
import { ChimneyTypeCreationModal } from "../modals/chimneyTypeCreationModal";
import { ChimneyTypeSelectionModal } from "../modals/chimneyTypeSelectionModal";
import { NotificationToast } from "../notificationToast";
import { Body, BodySmall, Caption, Heading1 } from "../typography";
import ChimneyForm from "./chimneyForm";

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
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [focusedField, setFocusedField] = useState<string | null>(null);

    const [selectedChimneys, setSelectedChimneys] = useState<ChimneyInput[]>([]);
    const [allChimneyTypes, setAllChimneyTypes] = useState<ChimneyType[]>([]);
    
    const [editingChimney, setEditingChimney] = useState<ChimneyInput | null>(null);
    const [editingChimneyIndex, setEditingChimneyIndex] = useState<number | null>(null);

    const [showChimneyTypeSelectionModal, setShowChimneyTypeSelectionModal] = useState(false);
    const [showChimneyTypeCreationModal, setShowChimneyTypeCreationModal] = useState(false);
    const [showChimneyModal, setShowChimneyModal] = useState(false);

    const { loading, handleSubmit: submitObject } = useObjectSubmit({ mode, initialData, onSuccess});

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

    const {
        handleSearchClient,
        handleSelectedClient,
        clientSuggestions,
        loadingClients,
        searchQuery,
        selectedClient,
        setSearchQuery,
        setSelectedClient
    } = useSearchClient<Omit<ObjectType, "id">>(handleChange);

    async function fetchChimneyTypes() {
        try{
            const {data, error} = await supabase
                .from("chimney_types")
                .select('*')
                .order("type");

            if (error) throw error;
            if (data) {
                setAllChimneyTypes(data);
            }
        }
        catch (error: any){
            console.error("Error fetching chimneys: ", error);
        }
    }

    const handleSelectChimneyType = (chimneyType: ChimneyType) => {
        setEditingChimney({
            chimney_type_id: chimneyType.id,
            chimney_type: chimneyType,
            placement: '',
            appliance: '',
            note: ''
        });
        setEditingChimneyIndex(null);
        setShowChimneyTypeSelectionModal(false); 
        setShowChimneyModal(true);
    };

    const handleEditChimney = (chimney: ChimneyInput, index: number) => {
        setEditingChimney(chimney);
        setEditingChimneyIndex(index);
        setShowChimneyModal(true);
    };

    const handleSaveChimney = (chimney: ChimneyInput, isEdit: boolean, editIndex?: number) => {
        if (isEdit && editIndex !== null && editIndex !== undefined) {
            // Update existing chimney
            setSelectedChimneys(prev => 
                prev.map((c, i) => i === editIndex ? chimney : c)
            );
        } else {
            // Add new chimney
            setSelectedChimneys(prev => [...prev, chimney]);
        }
        
        // Reset editing state
        setEditingChimney(null);
        setEditingChimneyIndex(null);
    };

    const handleChimneyTypeCreated = (chimneyType: ChimneyType) => {
        setAllChimneyTypes(prev => [...prev, chimneyType]);
        handleSelectChimneyType(chimneyType);
    };

    const handleRemoveChimney = (index: number) => {
        setSelectedChimneys(prev => prev.filter((_, i) => i !== index));
    };

    const handleAddChimney = () => {        
        setShowChimneyTypeSelectionModal(true);
    };

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
    };

    const handleSubmit = async () => {
        if(!validate()){
            return;
        }
        try {
            await submitObject(formData, selectedChimneys);
        }
        catch (error){}
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
                            <NotificationToast screen="objectForm"/>
                            {client &&
                                <View>
                                    <Body className="mb-1 ml-1 font-medium text-dark-text_color">Klient</Body>
                                    <Body className="border-2 bg-gray-800 rounded-xl px-4 py-4 border-gray-500 text-white">
                                        {selectedClient?.name}
                                    </Body>
                                </View>
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
                                <View className="absolute right-4 top-9">
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
                                                        {chimney.chimney_type?.type}
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
        <ChimneyTypeSelectionModal
            visible={showChimneyTypeSelectionModal}
            onClose={ () => setShowChimneyTypeSelectionModal(false)}
            onSelectChimneyType={handleSelectChimneyType}
            onCreateNewType={() => setShowChimneyTypeCreationModal(true)} 
            chimney_types={allChimneyTypes}
        />
        
        {/* Chimney Type Creation Modal */}
        <ChimneyTypeCreationModal 
            visible={showChimneyTypeCreationModal}
            onClose={() => setShowChimneyTypeCreationModal(false)}
            onChimneyTypeCreated={handleChimneyTypeCreated} 
        />

        {/* Chimney Details Modal*/}
        <ChimneyForm
            visible={showChimneyModal}
            onClose={() => setShowChimneyModal(false)}
            mode={editingChimneyIndex !== null ? "edit" : "create"}
            onSaveChimney={handleSaveChimney}
            chimneyType={editingChimney?.chimney_type || allChimneyTypes[0] || { id: '', type: '', labelling: '' }}
            chimneyToEdit={editingChimney || undefined}
            editIndex={editingChimneyIndex ?? undefined}
        />          
    </View>
    )
}