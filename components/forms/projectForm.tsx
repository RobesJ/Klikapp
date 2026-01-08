import { useProjectSubmit } from "@/hooks/submitHooks/useProjectSubmit";
import { useSearchClient } from "@/hooks/useSearchClient";
import { supabase } from "@/lib/supabase";
import { useClientStore } from "@/store/clientStore";
import { useProjectStore } from "@/store/projectStore";
import { Project, User } from "@/types/generics";
import { Chimney, ObjectWithRelations } from "@/types/objectSpecific";
import { ProjectWithRelations } from "@/types/projectSpecific";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { BadgeSelector, ModalSelector, STATE_OPTIONS, TYPE_OPTIONS } from "../badge";
import { FormInput } from "../formInput";
import ObjectPickerModal from "../modals/objectPickerModal";
import UserPickerModal from "../modals/userPickerModal";
import ModernDatePicker from "../modernDatePicker";
import { NotificationToast } from "../notificationToast";
import { Body, Heading1 } from "../typography";

interface ProjectFormProps{
    mode: "create" | "edit";
    initialData?: ProjectWithRelations;
    onSuccess?: (project: ProjectWithRelations) => void;
    preselectedClientID?: string;
}

export default function ProjectForm({ mode, initialData, onSuccess, preselectedClientID} : ProjectFormProps) {

    const [formData, setFormData] =  useState<Omit<Project, 'id'> & { id?: string }>({
        client_id: initialData?.client.id ?? preselectedClientID ?? "",
        type: initialData?.project.type ?? "",
        state: initialData?.project.state ?? "",
        scheduled_date: initialData?.project.scheduled_date ?? null,
        start_date: initialData?.project.start_date ?? null,
        completion_date: initialData?.project.completion_date ?? null,
        note: initialData?.project.note ?? "",
      });

    const router = useRouter();
    const { width } = useWindowDimensions();
    const { availableUsers, fetchAvailableUsers } = useProjectStore();
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [focusedField, setFocusedField] = useState<string | null>(null);

    const [selectedType, setSelectedType] = useState(initialData?.project.type ?? "");
    const [selectedState, setSelectedState] = useState(initialData?.project.state ?? "");
    const [scheduledDate, setScheduledDate] = useState<Date | null>(null);
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [completionDate, setCompletionDate] = useState<Date | null>(null);

    const [selectedUsers, setSelectedUsers] = useState<User[]>(initialData?.users ?? [] );
    const [showUserModal, setShowUserModal] = useState(false);

    const [allClientsObjects, setAllClientsObjects] = useState<ObjectWithRelations[]>([]);
    const [loadingObjects, setLoadingObjects] = useState(false);
    const [assignedObjects, setAssignedObjects] = useState<ObjectWithRelations[]>(initialData?.objects ?? [] );
    const [showObjectModal, setShowObjectModal] = useState(false);
    let oldState: string = initialData ? initialData.project.state : '';

    const {loading, submitProject } = useProjectSubmit({mode, oldState, initialData, onSuccess}); 
   
    const handleChange = (field: keyof Omit<Project, 'id'>, value: string) => {
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
        handleSearchClient,
        handleSelectedClient,
        clientSuggestions,
        loadingClients,
        searchQuery,
        selectedClient,
        setSelectedClient
    } = useSearchClient<Omit<Project, "id">>(handleChange);

    useEffect(() => {
        if (!initialData) return;

        setFormData({
            client_id: initialData?.client.id,
            type: initialData?.project.type,
            state: initialData?.project.state,
            scheduled_date: initialData?.project.scheduled_date ?? null,
            start_date: initialData?.project.start_date ?? null,
            completion_date: initialData?.project.completion_date ?? null,
            note: initialData?.project.note ?? "",
        });
        
        const dates = {
            scheduled: initialData.project.scheduled_date,
            start: initialData.project.start_date,
            completion: initialData.project.completion_date
        };
        setSelectedClient(initialData?.client);
        if (dates.scheduled)  setScheduledDate(new Date(dates.scheduled));
        if (dates.start)      setStartDate(new Date(dates.start));
        if (dates.completion) setCompletionDate(new Date(dates.completion));
       
        if (initialData.users?.length > 0) setSelectedUsers(initialData.users);
        if (initialData.objects?.length > 0) setAssignedObjects(initialData.objects);
    }, [initialData, selectedClient]);

    
    const client = useClientStore(
        s => s.clients.find(c => c.id === preselectedClientID)
    );

    useEffect(() => {
        if( !client ) return;
        if(client || !initialData){
            setSelectedClient(client);
            setFormData(prev => ({...prev, client_id: client.id}));
        }
    }, [initialData, client, selectedClient]);

    // Fetch available users when component mounts or modal opens
    useEffect(() => {
        if (showUserModal && availableUsers.length === 0) {
            fetchAvailableUsers();
        }
    }, [showUserModal]);

    
    const validate = () : boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.client_id?.trim()){
            newErrors.client = "Klient je povinný údaj!";
        }
        if (!formData.scheduled_date && !formData.start_date ){
            newErrors.dates = "Pre uloženie je potrebné zadať plánovaný dátum alebo dátum začatia projektu!";
        }
        
        if (!formData.type){
            newErrors.type = "Vyberte typ projektu!";
        }

        if (!formData.state){
            newErrors.state = "Vyberte stav projektu!";
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if(!validate()){
            return;
        }
        try {
            await submitProject(formData, selectedUsers, assignedObjects);
        }
        catch (error){}
    };
    
    const handleSelectedType = (type: string) => {
        setSelectedType(type);
        setFormData(prev => ({...prev, type: type}));
    };

    const handleSelectedState = (state: string) => {
        setSelectedState(state);
        setFormData(prev => ({...prev, state: state}));
    };
    
    const handleScheduledDate = (date: Date | null) =>{
        setScheduledDate(date);
        const convertDate2String = date ? date.toISOString().split('T')[0] : null;
        setFormData(prev => ({...prev, scheduled_date: convertDate2String }));
    };

    const handleStartdDate = (date: Date | null) =>{
        setStartDate(date);
        const convertDate2String1 = date ? date.toISOString().split('T')[0] : null;
        setFormData(prev => ({...prev, start_date: convertDate2String1}));
    };

    const handleCompletionDate = (date: Date | null) =>{
        setCompletionDate(date);
        const convertDate2String2 = date ? date.toISOString().split('T')[0] : null;
        setFormData(prev => ({...prev, completion_date: convertDate2String2 }));
    };

    const handleToggleUser = async (userId: string) => {
        setSelectedUsers(prev => {
            const isSelected = prev.some(u => u.id === userId);
            
            if (isSelected) {
                return prev.filter(u => u.id !== userId);
            } else {
                const user = availableUsers.find(u => u.id === userId);
                if(!user){
                    console.error("User not found in availableUsers");
                    return prev;
                }
                return [...prev, user];
            }
        });
    };

    const handleRemoveUser = (userId: string) => {
        setSelectedUsers(prev => prev.filter(c => c.id !== userId));
    };

    async function getAllClientsObjects(): Promise<boolean> {
        if(!formData.client_id) {
            setErrors(prev => ({
                ...prev,
                objects: "Najprv vyberte klienta pred priradením objektov"
            }))
            setAllClientsObjects([]);
            return false;
        }

        if (errors.objects){
            setErrors(prev => {
                const newErrors = {...prev};
                delete newErrors.objects;
                return newErrors;
            });
        }

        setLoadingObjects(true);
        try{
            const { data, error } = await supabase
            .from("objects")
            .select(`
                id,
                client_id,
                address,
                city,
                streetNumber,
                country,
                chimneys(
                    id,
                    chimney_types (id, type, labelling),
                    placement,
                    appliance,
                    note
                )
            `)
            .eq("client_id", formData.client_id)
            .limit(30);

        if (error) throw error;
        
        if(selectedClient){
            const transformedData = (data || []).map(obj => {
                const chimneys: Chimney[] = obj.chimneys
                  ?.map((c: any) => ({
                  id: c.id,
                  chimney_type_id: c.chimney_types.id,
                  appliance: c.appliance,
                  placement: c.placement,
                  note: c.note
              }))
              .filter(Boolean) || [];
              
              return ({
                  object: obj,
                  chimneys: chimneys,
                  client: selectedClient
              })
          });
          setAllClientsObjects(transformedData);
        }
        return true;
        
        } 
        catch(error: any){
            console.error("Chyba: ", error.message);
            setAllClientsObjects([]);
            setErrors(prev => ({
                ...prev,
                objects: "Chyba pri načítaní objektov"
            }));
            return false;
        }
        finally{
            setLoadingObjects(false);
        }
    };

    const handleToggleObject = (objectId: string) => {
        setAssignedObjects(prev => {
            const isSelected = prev.some(o => o.object.id === objectId);
            
            if (isSelected) {
                return prev.filter(o => o.object.id !== objectId);
            } 
            else {
                const object = allClientsObjects.find(o => o.object.id === objectId);
                if (!object) {
                    console.error("Object not found in allClientsObjects");
                    return prev;
                }
                return [...prev, object];
            }
        });
    };

    const handleRemoveObject = (objectId: string) => {
        setAssignedObjects(prev => prev.filter(c => c.object.id !== objectId));
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
                    {mode === "create" ? "Vytvoriť projekt" : "Upraviť projekt"}
                </Heading1>
                
            </View>
            
            {/* Form */}
            <View className="flex-1 mb-24 justify-center px-10">
                <ScrollView 
                  className="flex-1"
                  contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16 }}
                  keyboardShouldPersistTaps="handled"
                >
                <NotificationToast screen="projectForm"/>
                {/* Client field*/}
                <View className="mb-3">
                    <View>
                        
                        {selectedClient &&
                            <View>
                                <Body className="mb-1 ml-1 font-medium text-dark-text_color">Klient</Body>
                                <Body className="border-2 bg-gray-800 rounded-xl px-4 py-4 border-gray-500 text-white">
                                    {selectedClient?.name}
                                </Body>
                            </View>
                        }
                        
                        {!selectedClient && (
                            <FormInput
                              label={"Klient"}
                              placeholder="Začnite písať meno klienta..."
                              fieldName="client"
                              value={searchQuery}
                              onChange={handleSearchClient}
                              focusedField={focusedField}
                              setFocusedField={setFocusedField}
                              error={errors.client}
                              autoCapitalize="words"
                              containerClassName=" "
                            />
                        )}
                        
                        {loadingClients && !selectedClient && (
                            <View className="absolute right-4 top-9">
                                <Body className="text-gray-400">🔍</Body>
                            </View>
                        )}

                        {clientSuggestions && !selectedClient && clientSuggestions.length > 0 && (
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
                
                {/* Type field*/}
                {width > 400 ? (
                    <BadgeSelector
                        options={TYPE_OPTIONS}
                        selectedValue={selectedType}
                        onSelect={handleSelectedType}
                        label="Typ"
                        error={errors.type}
                    />
                ): (
                    <ModalSelector
                        options={TYPE_OPTIONS}
                        selectedValue={selectedType}
                        onSelect={handleSelectedType}
                        inDetailsModal={false}
                        label="Typ"
                        error={errors.type}
                        placeholder="Vyberte typ"
                    />
                )}
                
                {/* State field*/}
                <ModalSelector
                  options={STATE_OPTIONS}
                  selectedValue={selectedState}
                  onSelect={handleSelectedState}
                  inDetailsModal={false}
                  label="Stav"
                  error={errors.state}
                  placeholder="Vyberte stav"
                />
             
                {/* Scheduled project start field */}
                <View className="mb-3 ">
                    <Body className="mb-1 ml-1 font-medium text-dark-text_color">Plánovaný deň začatia</Body>
                    <ModernDatePicker
                        value={scheduledDate}
                        onChange={handleScheduledDate}
                        error={errors.scheduledDate}
                    />
                    {/*errors.dates && (
                        <Body className='text-red-500 font-semibold ml-2 mt-1'>
                            {errors.dates}
                        </Body>
                    )*/}
                </View>

                {/* Project start field */}
                <View className="mb-3">
                    <Body className="mb-1 ml-1 font-medium text-dark-text_color">Deň začatia</Body>
                    <ModernDatePicker
                        value={startDate}
                        onChange={handleStartdDate}
                        error={errors.startDate}
                    />
                    {/*errors.dates && (
                        <Body className='text-red-500 font-semibold ml-2 mt-1'>
                            {errors.dates}
                        </Body>
                    )*/}
                </View>

                {/* Project completion field*/}
                <View className="mb-3">
                    <Body className="mb-1 ml-1 font-medium text-dark-text_color">Deň ukončenia</Body>
                    <ModernDatePicker
                        value={completionDate}
                        onChange={handleCompletionDate}
                        error={errors.completionDate}
                    />
                    {/*errors.completionDate && (
                        <Body className='text-red-500 font-semibold ml-2 mt-1'>
                            {errors.completionDate}
                        </Body>
                    )*/}
                </View>

                {/* note input*/}
                <FormInput
                  label="Poznámka"
                  placeholder="Ďalšie informácie..."
                  value={formData.note || ''}
                  onChange={(value) => handleChange("note", value)}
                  fieldName="note"
                  focusedField={focusedField}
                  setFocusedField={setFocusedField}
                  multiline
                  numberOfLines={3}
                />

                {/* Users Field */}
                <View className="mb-3">
                    <View className="flex-row justify-between mb-2">
                        <Body className="ml-1 mt-3 font-semibold text-dark-text_color">
                            Priradený používatelia
                        </Body>
                        {/* Assign User Button */}
                        <TouchableOpacity
                          onPress={() => setShowUserModal(true)}
                          className={'flex-row border-2 bg-gray-500 rounded-xl px-4 py-2'}
                        >
                            <Body className="text-white font-semibold text-center mr-1"> + </Body>
                            <Body className="text-white font-semibold text-center"> Priradiť </Body>
                        </TouchableOpacity>
                    </View>
                    
                    {selectedUsers.length === 0 && (
                         <View className="mb-3">
                            <Body className="text-red-400 ml-1">
                                Nie je priradený žiadny používateľ
                            </Body>
                        </View>
                    )}
                    {/* Selected Users Display */}
                    {selectedUsers.length > 0 && (
                        <View>
                            {selectedUsers.map((user) => (
                                <View 
                                    key={user.id}
                                    className="flex-row items-center justify-between bg-slate-500 rounded-xl p-3 mb-2"
                                >
                                    <View className="flex-1">
                                        <Body className="font-semibold text-white">
                                            {user.name}
                                        </Body>
                                    </View>
                                    <TouchableOpacity
                                        onPress={() => handleRemoveUser(user.id)}
                                        className="w-8 h-8 bg-red-100 rounded-full items-center justify-center ml-2"
                                    >
                                        <Body className="text-red-600 font-bold">✕</Body>
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>
                    )}
                    {errors.users && (
                        <Body className='text-red-500 font-semibold ml-2 mt-1'>
                            {errors.users}
                        </Body>
                    )}
                </View>

                {/* Objects Field */}
                <View className="mb-3">
                    <View className="flex-row justify-between mb-2">
                    <Body className="mt-3 ml-1 font-semibold text-dark-text_color">
                        Priradené objekty
                    </Body>
                    {/* Assign Object Button */}
                    <TouchableOpacity
                        onPress={async () => {
                          const success = await getAllClientsObjects();
                          if (success) {
                              setShowObjectModal(true);
                          }
                        }}
                          className="flex-row border-2 bg-gray-500 rounded-xl px-4 py-2"
                        >
                            <Body className="text-white font-semibold text-center mr-1"> + </Body>
                            <Body className="text-white font-semibold text-center"> Priradiť </Body>
                        </TouchableOpacity>
                    </View>
                    
                    {assignedObjects.length === 0 && (
                         <View className="mb-3">
                            <Body className="text-red-400 ml-1">
                                Nie je priradený žiadny objekt
                            </Body>
                        </View>
                    )}

                    {/* Selected Chimneys Display */}
                    {assignedObjects.length > 0 && (
                        <View className="mb-3">
                            {assignedObjects.map((object) => (
                                <View 
                                    key={object.object.id}
                                    className="flex-row items-center justify-between bg-slate-500 rounded-xl p-3 mb-2"
                                >
                                    <View className="flex-1">
                                        <Body className="font-semibold text-white">
                                            {object.object.address}
                                        </Body>
                                    </View>
                                    <TouchableOpacity
                                        onPress={() => handleRemoveObject(object.object.id)}
                                        className="w-8 h-8 bg-red-100 rounded-full items-center justify-center ml-2"
                                    >
                                        <Body className="text-red-600 font-bold">✕</Body>
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>
                    )}

                    {errors.objects && (
                        <Body className='text-red-500 font-semibold ml-2 mt-1'>
                            {errors.objects}
                        </Body>
                    )}
                </View>

            </ScrollView>
            </View>

            {/* Submit button */}
            <View className="absolute bottom-4 left-0 right-0 items-center">
                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={handleSubmit}
                    disabled={loading}
                    className="bg-blue-600 rounded-xl py-4 items-center px-12">
                    <Body className="color-primary font-bold">
                        {
                        mode === "create" 
                            ? (loading ? "Vytvaram..."  : "Vytvoriť projekt") 
                            : (loading ? "Upravujem..." : "Upraviť projekt")
                        }
                    </Body>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>

        {/* User Selection Modal */}     
        <UserPickerModal
          visible={showUserModal}
          onClose={() => setShowUserModal(false)}
          selectedUsers={selectedUsers.map(u => u.id)}
          onToggle={handleToggleUser}
        />

        {/* Object Selection Modal */}   
        <ObjectPickerModal
            visible={showObjectModal}
            onClose={() => setShowObjectModal(false)}
            onToggleObject={handleToggleObject}
            selectedObjectIds={assignedObjects.map(o => o.object.id)}
            objects={allClientsObjects}
        />
    </View>
    )
}