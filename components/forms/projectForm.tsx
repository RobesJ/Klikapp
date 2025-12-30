import { supabase } from "@/lib/supabase";
import { useClientStore } from "@/store/clientStore";
import { useNotificationStore } from "@/store/notificationStore";
import { useProjectStore } from "@/store/projectStore";
import { Client, Project, User } from "@/types/generics";
import { Chimney, ObjectWithRelations } from "@/types/objectSpecific";
import { ProjectWithRelations } from "@/types/projectSpecific";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    FlatList, KeyboardAvoidingView, Modal, Platform, ScrollView,
    TouchableOpacity, View, useWindowDimensions
} from "react-native";
import { BadgeSelector, ModalSelector, STATE_OPTIONS, TYPE_OPTIONS } from "../badge";
import { FormInput } from "../formInput";
import ModernDatePicker from "../modernDatePicker";
import { Body, BodySmall, Caption, Heading1, Heading3 } from "../typography";
import UserPickerModal from "../userPickerModal";

interface ProjectFormProps{
    mode: "create" | "edit";
    initialData?: ProjectWithRelations;
    onSuccess?: (project: ProjectWithRelations) => void;
    preselectedClient?: string;
}

export default function ProjectForm({ mode, initialData, onSuccess, preselectedClient} : ProjectFormProps) {

    const [formData, setFormData] =  useState<Omit<Project, 'id'> & { id?: string }>({
        client_id: initialData?.client.id ?? "",
        type: initialData?.project.type ?? "",
        state: initialData?.project.state ?? "",
        scheduled_date: initialData?.project.scheduled_date ?? null,
        start_date: initialData?.project.start_date ?? null,
        completion_date: initialData?.project.completion_date ?? null,
        note: initialData?.project.note ?? "",
      });

    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [focusedField, setFocusedField] = useState<string | null>(null);

    const [clientSuggestions, setClientSuggestions] = useState<Client[]>([]);
    const [loadingClients, setLoadingClients] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedClient, setSelectedClient] = useState<Client | null>(initialData?.client ?? null);
    const [timerId, setTimerId] = useState<number>();

    const [selectedType, setSelectedType] = useState(initialData?.project.type ?? "");
    const [selectedState, setSelectedState] = useState(initialData?.project.state ?? "");
    const [scheduledDate, setScheduledDate] = useState<Date | null>(null);
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [completionDate, setCompletionDate] = useState<Date | null>(null);

    // const [assignedUsers, setAssignedUsers] = useState<User[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<User[]>(initialData?.users ?? [] );
    const [showUserModal, setShowUserModal] = useState(false);

    const [assignedObjects, setAssignedObjects] = useState<ObjectWithRelations[]>([]);
    const [loadingObjects, setLoadingObjects] = useState(false);
    const [selectedObjects, setSelectedObjects] = useState<ObjectWithRelations[]>(initialData?.objects ?? [] );
    const [showObjectModal, setShowObjectModal] = useState(false);
    const router = useRouter();
    const { width } = useWindowDimensions();
    const { availableUsers, fetchAvailableUsers } = useProjectStore();
    let oldState: string | null = initialData ? initialData.project.state : null;

    useEffect(() => {
        if (initialData){
            setFormData({
                client_id: initialData?.client.id,
                type: initialData?.project.type,
                state: initialData?.project.state,
                scheduled_date: initialData?.project.scheduled_date ?? null,
                start_date: initialData?.project.start_date ?? null,
                completion_date: initialData?.project.completion_date ?? null,
                note: initialData?.project.note ?? "",
              });
          
            if (initialData.project.scheduled_date){
                const parsedDate = new Date(initialData.project.scheduled_date);
                setScheduledDate(parsedDate);
            }
            if (initialData.project.start_date){
                const parsedDate = new Date(initialData.project.start_date);
                setStartDate(parsedDate);
            }
            if (initialData.project.completion_date){
                const parsedDate = new Date(initialData.project.completion_date);
                setCompletionDate(parsedDate);
            }
            if (initialData.users && initialData.users.length > 0){
                setSelectedUsers(initialData.users);
            }
            if (initialData.objects && initialData.objects.length > 0){
                setAssignedObjects(initialData.objects);
            }
        }
    }, [initialData]);

    const client = useClientStore(
        s => s.clients.find(c => c.id === preselectedClient)
    );

    useEffect(() => {
        if (!client || initialData) return;
        setSelectedClient(client);
        setFormData(prev => ({ ...prev, client_id: client.id }));
      }, [client, initialData]);

    // Fetch available users when component mounts or modal opens
    useEffect(() => {
        if (showUserModal && availableUsers.length === 0) {
            fetchAvailableUsers();
        }
    }, [showUserModal]);
    
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
    
    const handleSearchClient = (text: string) => {
        setSearchQuery(text);
        
        if(timerId) {
            clearTimeout(timerId);
        }
        const timer = window.setTimeout(() => {
            searchClient(text);
        }, 300);

        setTimerId(timer);
    };

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
                .or(`name.ilike.%${query}%`)
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

        if (errors.objects){
            setErrors(prev => {
                const newErrors = {...prev};
                delete newErrors.objects;
                return newErrors;
            });
        }
    };

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

        setLoading(true);
        try {
            const cleanedFormData = {
                ...formData,
                scheduled_date: formData.scheduled_date || null,
                start_date: formData.start_date || null,
                completion_date: formData.completion_date || null
            }
            let projectID : string; 
            if (mode === "create"){
                console.log("creating project");
                const {data: projectData, error: projectError} = await supabase
                .from('projects')
                .insert([cleanedFormData])
                .select()
                .single();
                
                if (projectError) throw projectError;
                projectID = projectData.id;
                if(selectedUsers.length > 0){
                    const usersProjectRelations = selectedUsers.map(user => ({
                        project_id: projectID,
                        user_id: user.id,
                    }));

                    const {error: usersError } = await supabase
                    .from("project_assignments")
                    .insert(usersProjectRelations);

                    if (usersError) throw usersError;
                }
                
                if(selectedObjects.length > 0){
                    const objectProjectRelations = selectedObjects.map(object => ({
                        project_id: projectID,
                        object_id: object.object.id
                    }));

                    const {error: objectError } = await supabase
                        .from("project_objects")
                        .insert(objectProjectRelations);

                    if (objectError) throw objectError;
                }

                const { data: completeProject, error: fetchError } = await supabase
                    .from("projects")
                    .select(`
                        *,
                        clients(*),
                        project_assignments (
                            user_profiles (id, name, email)
                        ),
                        project_objects(
                            objects(
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
                            )
                        )
                    `)
                    .eq("id", projectID)
                    .single();
                
                if (fetchError) throw fetchError;
                onSuccess?.(completeProject);
            }
            else { 
                // check the oldState and check/change date values
                if(oldState && oldState !== cleanedFormData.state){
                    if (cleanedFormData.state === "Nový"){
                        cleanedFormData.start_date = null;
                        cleanedFormData.completion_date = null;
                    }
                    else if (["Prebieha", "Pozastavený", "Naplánovaný"].includes(cleanedFormData.state)){
                        if (oldState === "Nový"){
                            cleanedFormData.start_date ? cleanedFormData.start_date : new Date().toISOString().split('T')[0]; 
                        }
                        else if (["Ukončený","Zrušený"].includes(oldState)){
                          cleanedFormData.completion_date = null;
                        }
                    }
                    else if (["Ukončený","Zrušený"].includes(cleanedFormData.state)){
                      if (!["Ukončený","Zrušený"].includes(oldState)){
                          cleanedFormData.completion_date ? cleanedFormData.completion_date : new Date().toISOString().split('T')[0]; 
                      }
                    }
                }

                const {data: projectData, error: projectError} = await supabase
                .from('projects')
                .update(cleanedFormData)
                .eq('id', initialData?.project.id)
                .select()
                .single()

                if (projectError) throw projectError;
                projectID = projectData.id;

                const { error: deleteError } = await supabase
                    .from("project_assignments")
                    .delete()
                    .eq("project_id", projectID);
                if (deleteError) throw deleteError;

                const { error: deleteObjectError } = await supabase
                    .from("project_objects")
                    .delete()
                    .eq("project_id", projectID);
                if (deleteObjectError ) throw deleteObjectError ;

                if(selectedUsers.length > 0){
                    const usersProjectRelations = selectedUsers.map(user => ({
                        project_id: projectID,
                        user_id: user.id,
                    }));
    
                    const {error: usersError } = await supabase
                        .from("project_assignments")
                        .insert(usersProjectRelations);
    
                    if (usersError) throw usersError;
                }
               
                if(selectedObjects.length > 0){
                    const objectsProjectRelations = selectedObjects.map(object => ({
                        project_id: projectID,
                        object_id: object.object.id,
                    }));
    
                    const {error: objectsError } = await supabase
                        .from("project_objects")
                        .insert(objectsProjectRelations);
    
                    if (objectsError) throw objectsError;
                }

                const { data: completeProject, error: fetchError } = await supabase
                    .from("projects")
                    .select(`
                        *,
                        clients(*),
                        project_assignments (
                            user_profiles (id, name, email)
                        ),
                        project_objects(
                            objects(
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
                            )
                        )
                    `)
                    .eq("id", projectID)
                    .single();
                
                if (fetchError) throw fetchError;

                onSuccess?.(completeProject);
            }
        }
        catch (error: any){
            console.error("Chyba pri ukladaní projektu: ", error);
            if (mode === "create"){
                useNotificationStore.getState().addNotification(
                    'Nepodarilo sa vytvoriť projekt',
                    'error',
                    4000
                );
            }
            else{
                useNotificationStore.getState().addNotification(
                    'Nepodarilo sa upraviť projekt',
                    'error',
                    4000
                );
            }
        }
        finally{
            setLoading(false);
        }
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


    const handleToggleUser = async (user_id: string) => {
        const user = availableUsers.find(u => u.id === user_id);
        if (!user) {
            console.error("User not found in availableUsers");
            return;
        }

        setSelectedUsers(prev => {
            const isSelected = prev.some(u => u.id === user_id);
            
            if (isSelected) {
                return prev.filter(u => u.id !== user_id);
            } else {
                return [...prev, user];
            }
        });
    };

    //const isUserSelected = (userId: string): boolean => {
    //    return selectedUsers.some(c => c.id === userId);
    //};

    const handleRemoveUser = (userId: string) => {
        setSelectedUsers(prev => prev.filter(c => c.id !== userId));
    };


    async function getAssignedObjects(): Promise<boolean> {
        if(!formData.client_id) {
            setErrors(prev => ({
                ...prev,
                objects: "Najprv vyberte klienta pred priradením objektov"
            }))
            setAssignedObjects([]);
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
          setAssignedObjects(transformedData);
        }
        return true;
        
    } 
        catch(error: any){
            console.error("Chyba: ", error.message);
            setAssignedObjects([]);
            setErrors(prev => ({
                ...prev,
                objects: "Chyba pri načítaní objektov"
            }));
            return false;
        }
        finally{
            setLoadingObjects(false);
        }
    }

    const handleToggleObject = (object: ObjectWithRelations) => {
        setSelectedObjects(prev => {
            // Check if already selected
            const isSelected = prev.some(c => c.object.id === object.object.id);
            
            if (isSelected) {
                // Remove it
                return prev.filter(c => c.object.id !== object.object.id);
            } else {
                // Add it
                return [...prev, object];
            }
        });
    };

    const isObjectSelected = (objectId: string): boolean => {
        return selectedObjects.some(c => c.object.id === objectId);
    };

    const handleRemoveObject = (objectId: string) => {
        setSelectedObjects(prev => prev.filter(c => c.object.id !== objectId));
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
            
            {/* form */}
            <View className="flex-1 mb-24 justify-center px-10">
            <ScrollView 
              className="flex-1"
              contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16 }}
              keyboardShouldPersistTaps="handled"
            >

                {/* Client field*/}
                <View className="mb-3">
                    <Body className="mb-1 ml-1 font-medium text-dark-text_color">Klient</Body>
                    <View>
                        
                        {client &&
                            <Body
                                className="border-2 bg-gray-800 rounded-xl px-4 py-4 border-gray-600 text-white">
                                {selectedClient?.name}
                            </Body>
                        }
                        {!client && (
                            <FormInput
                              label={selectedClient?.name}
                              placeholder="Začnite písať meno klienta..."
                              fieldName="client"
                              value={searchQuery}
                              onChange={handleSearchClient}
                              focusedField={focusedField}
                              setFocusedField={setFocusedField}
                              error={errors.client}
                              autoCapitalize="words"
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
                    {errors.dates && (
                        <Body className='text-red-500 font-semibold ml-2 mt-1'>
                            {errors.dates}
                        </Body>
                    )}
                </View>

                {/* Project start field */}
                <View className="mb-3">
                    <Body className="mb-1 ml-1 font-medium text-dark-text_color">Deň začatia</Body>
                    <ModernDatePicker
                        value={startDate}
                        onChange={handleStartdDate}
                        error={errors.startDate}
                    />
                    {errors.dates && (
                        <Body className='text-red-500 font-semibold ml-2 mt-1'>
                            {errors.dates}
                        </Body>
                    )}
                </View>

                {/* Project completion field*/}
                <View className="mb-3">
                    <Body className="mb-1 ml-1 font-medium text-dark-text_color">Deň ukončenia</Body>
                    <ModernDatePicker
                        value={completionDate}
                        onChange={handleCompletionDate}
                        error={errors.completionDate}
                    />
                    {errors.completionDate && (
                        <Body className='text-red-500 font-semibold ml-2 mt-1'>
                            {errors.completionDate}
                        </Body>
                    )}
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
                          const success = await getAssignedObjects();
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
                    
                    {selectedObjects.length === 0 && (
                         <View className="mb-3">
                            <Body className="text-red-400 ml-1">
                                Nie je priradený žiadny objekt
                            </Body>
                        </View>
                    )}

                    {/* Selected Chimneys Display */}
                    {selectedObjects.length > 0 && (
                        <View className="mb-3">
                            {selectedObjects.map((object) => (
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

        {/* submit button */}
        <View className="absolute bottom-4 left-0 right-0 items-center">
            <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleSubmit}
                disabled={loading}
                className="bg-blue-600 rounded-xl py-4 items-center px-12">
                <Body className="color-primary font-bold">
                    {mode === "create" 
                    ? (loading 
                        ? "Vytvaram..." 
                        : "Vytvoriť projekt") 
                    : (loading 
                        ? "Upravujem..." : "Upraviť projekt")}
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
        <Modal
            visible={showObjectModal}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setShowObjectModal(false)}
        >
            <View className="flex-1 bg-black/50 justify-end">
                <View className="bg-dark-bg rounded-t-3xl h-3/4">
                    <View className="p-6 border-b border-gray-600">
                        <View className="flex-row items-center justify-between mb-4">
                            <View className="flex-1">
                                <Heading3 className="text-xl font-bold text-dark-text_color">Vyhľadajte objekty</Heading3>
                                <BodySmall className="text-sm text-gray-500">
                                    {selectedObjects.length} vybraných
                                </BodySmall>
                            </View>
                            <TouchableOpacity
                                onPress={() => setShowObjectModal(false)}
                                className="w-8 h-8 bg-gray-700 rounded-full items-center justify-center active:bg-gray-600"
                            >
                                <Body className="text-white">✓</Body>
                            </TouchableOpacity>
                        </View>
                    </View>
                    {loadingObjects ? 
                    (
                        <View className="flex-1 items-center justify-center">
                            <Body className="text-gray-500">Vyhľadávám...</Body>
                        </View>
                    ) : assignedObjects.length === 0 ? (
                        <View className="flex-1 items-center justify-center">
                            <Body className="text-gray-500">Žiadne objekty neboli nájdene</Body>
                        </View>
                    ) : (
                        <FlatList
                            data={assignedObjects}
                            keyExtractor={(item) => item.object.id}
                            renderItem={({ item }) => {
                                const selected = isObjectSelected(item.object.id);
                                return (
                                    <TouchableOpacity
                                        onPress={() => handleToggleObject(item)}
                                        className={`px-6 py-4 border-b border-gray-100 ${selected ? 'bg-blue-50' : ''}`}
                                    >
                                        <View className="flex-row items-center justify-between">
                                            <View className="flex-1">
                                                
                                                {item.object.address && (
                                                    <BodySmall className="text-sm text-gray-500 mt-1">
                                                        {item.object.address}
                                                    </BodySmall>
                                                )}
                                            </View>
                                            {selected && (
                                                <View className="w-6 h-6 bg-blue-600 rounded-full items-center justify-center">
                                                    <Caption className="text-white text-xs">✓</Caption>
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
    </View>
    )
}